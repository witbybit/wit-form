import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { llms, loader } from 'fumadocs-core/source';
import { docsContentRoute, docsImageRoute, docsRoute } from './shared';
import { defineDocs } from 'fumadocs-mdx/macro';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  plugins: [],
});

const includeTag = /<include\b([^>]*)>\s*([^<\s]+)\s*<\/include>/g;

/**
 * The processed markdown keeps <include> tags as they are, so example pages would reach AI tools
 * without their code. Swap each tag for the file's source, and drop the live preview around it.
 */
async function inlineIncludes(markdown: string) {
  const text = markdown.replace(
    /<Tabs\b[^>]*>[\s\S]*?<\/Tabs>/g,
    (block) => block.match(includeTag)?.join('\n\n') ?? block
  );
  const files = await Promise.all(
    [...text.matchAll(includeTag)].map(async ([, attrs, file]) => {
      const lang = /lang="([^"]*)"/.exec(attrs)?.[1] ?? '';
      const title = /title="([^"]*)"/.exec(attrs)?.[1] ?? file;
      // `cwd` includes are relative to the docs app, which is where Next runs
      const code = await readFile(path.join(process.cwd(), file), 'utf8');
      return `\`\`\`${lang} title="${title}"\n${code.trimEnd()}\n\`\`\``;
    })
  );
  let index = 0;
  return text.replace(includeTag, () => files[index++]);
}

/** MDX comments hide content from the page, so keep it out of the AI text too */
function stripComments(markdown: string) {
  return markdown.replace(/\{\/\*[\s\S]*?\*\/\}\n*/g, '');
}

export const docsLlms = llms(source, {
  renderPage: async (page) => `# ${page.data.title} (${page.url})

${await inlineIncludes(stripComments(await page.data.getText('processed')))}`,
});
