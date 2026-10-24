// Drives the built bench app in real Chrome and writes the medians to
// docs/components/home/benchmark-results.json, which the landing page and docs read.
// It also rewrites the results table in docs/content/docs/comparison.mdx, between the benchmark markers.
// Usage: pnpm bench   (or: node run.mjs --runs 3 --rows 100,500, or --render-only to redo the table)
import { readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright-core';
import { preview } from 'vite';

const { values: args } = parseArgs({
  options: {
    runs: { type: 'string', default: '5' },
    rows: { type: 'string', default: '100,500,1000' },
    libs: { type: 'string', default: 'wit,rhf,rhf-controller,tanstack' },
    cpu: { type: 'string', default: '4' },
    out: {
      type: 'string',
      default: '../docs/components/home/benchmark-results.json',
    },
    doc: { type: 'string', default: '../docs/content/docs/comparison.mdx' },
    'render-only': { type: 'boolean', default: false },
  },
});

const RUNS = Number(args.runs);
const ROWS = args.rows.split(',').map(Number);
const LIBS = args.libs.split(',');
const CPU_SLOWDOWN = Number(args.cpu);
// Alternate typing and deleting, so the cell never turns into a huge number. Odd, so it ends on a digit.
const KEYS = Array.from({ length: 21 }, (_, i) =>
  i % 2 === 0 ? '9' : 'Backspace'
);

const NAMES = {
  wit: 'Wit Form',
  rhf: 'React Hook Form (native inputs)',
  'rhf-controller': 'React Hook Form (useController)',
  tanstack: 'TanStack Form',
};
const formatMs = (ms) =>
  ms >= 60000
    ? `${(ms / 60000).toFixed(1)} min`
    : ms >= 1000
      ? `${(ms / 1000).toFixed(1)} s`
      : `${Math.round(ms)} ms`;

/** Markdown tables of the results, one per metric, with sizes as rows and libraries as columns */
function renderTables(data) {
  const libs = [...new Set(data.results.map((r) => r.lib))];
  const sizes = [...new Set(data.results.map((r) => r.inputs))];
  const table = (title, key) => {
    const header = `| Inputs | ${libs.map((lib) => NAMES[lib] ?? lib).join(' | ')} |`;
    const rule = `| --- | ${libs.map(() => '---').join(' | ')} |`;
    const rows = sizes.map((inputs) => {
      const cells = libs.map((lib) => {
        const result = data.results.find(
          (r) => r.lib === lib && r.inputs === inputs
        );
        return result ? formatMs(result[key]) : '–';
      });
      return `| ${inputs.toLocaleString('en-US')} | ${cells.join(' | ')} |`;
    });
    return [`**${title}**`, '', header, rule, ...rows].join('\n');
  };
  const { environment: env } = data;
  return [
    table('Mount: first render until the table is on screen', 'mountMs'),
    table('Keystroke: key press until the change is on screen', 'keystrokeMs'),
    `Median of ${env.runs} runs, ${env.keystrokes} keystrokes each. ${env.browser}, ${env.cpuSlowdown}× CPU slowdown, ${env.cpu}. Measured ${data.date}.`,
  ].join('\n\n');
}

function writeDocTables(data) {
  const doc = new URL(args.doc, import.meta.url);
  const text = readFileSync(doc, 'utf8');
  const start = '{/* benchmark:start */}';
  const end = '{/* benchmark:end */}';
  const from = text.indexOf(start);
  const to = text.indexOf(end);
  if (from < 0 || to < 0)
    throw new Error(`No benchmark markers in ${args.doc}`);
  writeFileSync(
    doc,
    `${text.slice(0, from + start.length)}\n\n${renderTables(data)}\n\n${text.slice(to)}`
  );
  console.log(`Updated ${args.doc}`);
}

if (args['render-only']) {
  writeDocTables(
    JSON.parse(readFileSync(new URL(args.out, import.meta.url), 'utf8'))
  );
  process.exit(0);
}

const median = (xs) => {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const round = (x) => Math.round(x * 10) / 10;

async function runOnce(browser, url, lib, rows) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  try {
    await page.goto(`${url}?lib=${lib}&rows=${rows}`);
    await page.evaluate(() => window.bench.load());
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });

    const mount = await page.evaluate(() => window.bench.mount());

    // A cell in the middle of the table, in the second column
    const cell = page.locator(`[data-cell="${Math.floor(rows / 2)}-q2"]`);
    await cell.click();
    await page.keyboard.press('End');
    const before = {
      cell: Number(await cell.inputValue()),
      total: Number(await page.locator('[data-total="q2"]').textContent()),
    };
    await page.evaluate(() => window.bench.keystroke());
    await page.evaluate(() => window.bench.resetRenders());

    const latencies = [];
    for (const key of KEYS) {
      await page.keyboard.press(key);
      latencies.push(await page.evaluate(() => window.bench.keystroke()));
    }
    const renders =
      (await page.evaluate(() => window.bench.renders())) / KEYS.length;

    // Every library must show the right total, or its numbers don't count
    const after = Number(await cell.inputValue());
    const total = Number(await page.locator('[data-total="q2"]').textContent());
    const expected = before.total - before.cell + after;
    if (total !== expected)
      throw new Error(`${lib}: total ${total}, expected ${expected}`);

    return { mount, keystroke: median(latencies), renders };
  } finally {
    await context.close();
  }
}

const server = await preview({
  preview: { port: 4179, strictPort: true },
  logLevel: 'silent',
});
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ channel: 'chrome' });
const browserVersion = browser.version();

const results = [];
try {
  for (const rows of ROWS) {
    for (const lib of LIBS) {
      const runs = [];
      for (let i = 0; i < RUNS; i++)
        runs.push(await runOnce(browser, url, lib, rows));
      const result = {
        lib,
        rows,
        inputs: rows * 4,
        mountMs: round(median(runs.map((r) => r.mount))),
        keystrokeMs: round(median(runs.map((r) => r.keystroke))),
        rendersPerKeystroke: round(median(runs.map((r) => r.renders))),
      };
      results.push(result);
      console.log(
        `${String(rows * 4).padStart(5)} inputs  ${lib.padEnd(15)} mount ${String(result.mountMs).padStart(7)} ms  keystroke ${String(result.keystrokeMs).padStart(6)} ms  renders/key ${result.rendersPerKeystroke}`
      );
    }
  }
} finally {
  await browser.close();
  server.httpServer.close();
}

// Read straight from node_modules: some packages don't export their package.json
const pkg = (name) =>
  JSON.parse(
    readFileSync(new URL(`node_modules/${name}/package.json`, import.meta.url))
  ).version;

writeFileSync(
  new URL(args.out, import.meta.url),
  JSON.stringify(
    {
      date: new Date().toISOString().slice(0, 10),
      environment: {
        cpu: os.cpus()[0].model.trim(),
        cpuSlowdown: CPU_SLOWDOWN,
        browser: `Chrome ${browserVersion}`,
        runs: RUNS,
        keystrokes: KEYS.length,
      },
      versions: {
        'wit-form': JSON.parse(
          readFileSync(new URL('../package.json', import.meta.url))
        ).version,
        'react-hook-form': pkg('react-hook-form'),
        '@tanstack/react-form': pkg('@tanstack/react-form'),
        react: pkg('react'),
      },
      results,
    },
    null,
    2
  ) + '\n'
);
console.log(`\nWrote ${args.out}`);
writeDocTables(
  JSON.parse(readFileSync(new URL(args.out, import.meta.url), 'utf8'))
);
