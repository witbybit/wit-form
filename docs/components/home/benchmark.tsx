'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import data from './benchmark-results.json';

// Controlled inputs only, like for like. React Hook Form's uncontrolled inputs are in the full comparison
const libraries: Record<string, { name: string; variant?: string }> = {
  wit: { name: 'Wit Form' },
  'rhf-controller': { name: 'React Hook Form', variant: 'useController' },
  tanstack: { name: 'TanStack Form' },
};

const metrics = {
  mountMs: {
    label: 'Mount',
    title: 'Mount time, controlled inputs',
    format: (value: number) =>
      value >= 60000
        ? `${(value / 60000).toFixed(1)} min`
        : value >= 1000
          ? `${(value / 1000).toFixed(1)} s`
          : `${Math.round(value)} ms`,
  },
  keystrokeMs: {
    label: 'Keystroke',
    title: 'Keystroke to screen, controlled inputs',
    format: (value: number) => `${Math.round(value)} ms`,
  },
};

type Metric = keyof typeof metrics;

const sizes = [...new Set(data.results.map((result) => result.inputs))];

function Segmented<T extends string | number>(props: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={props.label}
      className="inline-flex rounded-lg border bg-fd-muted/50 p-0.5"
    >
      {props.options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={props.value === option.value}
          onClick={() => props.onChange(option.value)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium tabular-nums transition outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:px-3',
            props.value === option.value
              ? 'bg-fd-background text-fd-foreground shadow-sm'
              : 'text-fd-muted-foreground hover:text-fd-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const name = (lib: string) => {
  const library = libraries[lib];
  return library.variant
    ? `${library.name} (${library.variant})`
    : library.name;
};

// Whole numbers from 10× up, where a decimal is false precision
const times = (a: number, b: number) =>
  `${a / b >= 10 ? Math.round(a / b) : (a / b).toFixed(1)}×`;

/** What the chart shows, in a sentence or two worked out from the numbers, so it never overclaims */
function summarize(metric: Metric, rows: { lib: string; value: number }[]) {
  const wit = rows.find((row) => row.lib === 'wit')?.value;
  if (wit === undefined) return null;
  const others = rows.filter((row) => row.lib !== 'wit');
  const best = others.reduce((a, b) => (b.value < a.value ? b : a));
  const worst = others.reduce((a, b) => (b.value > a.value ? b : a));

  if (metric === 'mountMs') {
    const slower = others
      .filter((row) => row.value > wit)
      .map((row) => `${times(row.value, wit)} faster than ${name(row.lib)}`);
    return slower.length > 0
      ? `Wit Form mounts ${slower.join(' and ')}.`
      : `${name(best.lib)} mounts fastest. Wit Form takes ${times(wit, best.value)} as long.`;
  }

  if (wit <= best.value) {
    return `Wit Form responds fastest, ${times(worst.value, wit)} faster than ${name(worst.lib)}.`;
  }
  return [
    wit - best.value < 5
      ? `Wit Form and ${name(best.lib)} respond in about the same time.`
      : wit / best.value < 1.15
        ? `Wit Form is within ${Math.round(wit - best.value)} ms of ${name(best.lib)}.`
        : `${name(best.lib)} responds fastest. Wit Form takes ${times(wit, best.value)} as long.`,
    worst.value / wit > 1.15 &&
      `${name(worst.lib)} takes ${times(worst.value, wit)} as long as Wit Form.`,
  ]
    .filter(Boolean)
    .join(' ');
}

export function Benchmark() {
  const [metric, setMetric] = useState<Metric>('mountMs');
  const [inputs, setInputs] = useState(sizes.includes(2000) ? 2000 : sizes[0]);
  const spec = metrics[metric];

  const rows = data.results
    .filter((result) => result.inputs === inputs && result.lib in libraries)
    .map((result) => ({ lib: result.lib, value: result[metric] }));
  const max = Math.max(...rows.map((row) => row.value));
  const summary = summarize(metric, rows);
  const { environment } = data;

  return (
    <div className="overflow-hidden rounded-2xl border bg-fd-background">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
        <Segmented
          label="Metric"
          value={metric}
          onChange={setMetric}
          options={(Object.keys(metrics) as Metric[]).map((key) => ({
            value: key,
            label: metrics[key].label,
          }))}
        />
        <Segmented
          label="Form size, in inputs"
          value={inputs}
          onChange={setInputs}
          options={sizes.map((size) => ({
            value: size,
            label: size.toLocaleString('en-US'),
          }))}
        />
      </div>

      <figure className="flex flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <figcaption className="flex items-baseline justify-between gap-4">
          <span className="font-medium">
            {spec.title}
            <span className="text-fd-muted-foreground">
              {' '}
              · {inputs.toLocaleString('en-US')} inputs
            </span>
          </span>
          <span className="shrink-0 text-xs text-fd-muted-foreground">
            Lower is better
          </span>
        </figcaption>

        <div aria-hidden className="flex flex-col gap-4">
          {rows.map((row) => {
            const library = libraries[row.lib];
            const ours = row.lib === 'wit';
            return (
              <div
                key={row.lib}
                className="grid items-center gap-x-4 gap-y-1.5 sm:grid-cols-[12rem_1fr]"
              >
                <span className="text-sm">
                  <span className={cn(ours && 'font-semibold')}>
                    {library.name}
                  </span>
                  {library.variant && (
                    <span className="block text-xs text-fd-muted-foreground">
                      {library.variant}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'h-5 rounded-r-[4px] transition-[width] duration-500 ease-out motion-reduce:transition-none',
                      ours ? 'bg-emerald-500' : 'bg-fd-muted-foreground/30'
                    )}
                    style={{ width: `max(4px, ${(row.value / max) * 85}%)` }}
                  />
                  <span
                    className={cn(
                      'shrink-0 font-mono text-sm tabular-nums',
                      ours ? 'font-semibold' : 'text-fd-muted-foreground'
                    )}
                  >
                    {spec.format(row.value)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* The same numbers for screen readers */}
        <table className="sr-only">
          <caption>
            {spec.title}, {inputs.toLocaleString('en-US')} inputs
          </caption>
          <tbody>
            {rows.map((row) => (
              <tr key={row.lib}>
                <th scope="row">
                  {libraries[row.lib].name} {libraries[row.lib].variant}
                </th>
                <td>{spec.format(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {summary && <p className="text-sm text-pretty">{summary}</p>}
      </figure>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-fd-muted/30 px-4 py-3 text-xs text-fd-muted-foreground sm:px-6">
        <span>
          {environment.browser.replace(/\..*$/, '')} · {environment.cpuSlowdown}
          × CPU slowdown · median of {environment.runs} runs · {data.date}
        </span>
        <Link
          href="/docs/comparison#benchmark"
          className="group inline-flex items-center gap-1 font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-300 dark:hover:text-emerald-200"
        >
          Full comparison and method
          <ArrowRight className="size-3 transition group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
