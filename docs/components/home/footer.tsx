import Link from 'next/link';
import { appName, gitConfig, libVersion } from '@/lib/shared';
import { Logo } from '../logo';
import { Container, GitHubIcon } from './primitives';

const repoUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;

// next.config.mjs reads the same variable; plain <a> links don't get it added for them
const basePath = process.env.DOCS_BASE_PATH ?? '';

/** Only pages go through <Link>; anything else is a plain <a> so the browser loads it directly */
const columns: {
  title: string;
  links: { label: string; href: string; page?: boolean }[];
}[] = [
  {
    title: 'Docs',
    links: [
      { label: 'Getting started', href: '/docs/getting-started', page: true },
      { label: 'Core concepts', href: '/docs/core-concepts', page: true },
      { label: 'Examples', href: '/docs/examples', page: true },
      { label: 'API reference', href: '/docs/api/use-form', page: true },
      { label: 'Comparison', href: '/docs/comparison', page: true },
    ],
  },
  {
    title: 'Guides',
    links: [
      { label: 'Validation', href: '/docs/guides/validation', page: true },
      { label: 'Field arrays', href: '/docs/guides/field-arrays', page: true },
      { label: 'Performance', href: '/docs/guides/performance', page: true },
      { label: 'Type safety', href: '/docs/guides/type-safety', page: true },
      { label: 'Migrating', href: '/docs/guides/migrating', page: true },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'GitHub', href: repoUrl },
      { label: 'npm', href: 'https://www.npmjs.com/package/wit-form' },
      { label: 'Report an issue', href: `${repoUrl}/issues` },
      // A route handler, not a page: client-side navigation to it 404s in the static export
      { label: 'llms.txt', href: `${basePath}/llms.txt` },
      {
        label: 'MIT License',
        href: `${repoUrl}/blob/${gitConfig.branch}/LICENSE`,
      },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t">
      <Container className="grid gap-12 py-14 sm:py-16 lg:grid-cols-[1.4fr_2fr]">
        <div className="flex flex-col items-start gap-4">
          <Link href="/" className="inline-flex items-center gap-2">
            <Logo />
          </Link>
          <p className="max-w-xs text-sm text-pretty text-fd-muted-foreground">
            Headless React forms that stay fast at thousands of fields.
          </p>
          <a
            href={repoUrl}
            className="group inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm text-fd-muted-foreground transition hover:border-emerald-500/40 hover:text-fd-foreground"
          >
            <GitHubIcon className="size-4" />
            Star on GitHub
          </a>
        </div>

        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3"
        >
          {columns.map((column) => (
            <div key={column.title} className="flex flex-col gap-3">
              <h2 className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-fd-muted-foreground">
                {column.title}
              </h2>
              <ul className="flex flex-col gap-2.5 text-sm">
                {column.links.map((link) => {
                  const LinkTag = link.page ? Link : 'a';
                  return (
                    <li key={link.href}>
                      <LinkTag
                        href={link.href}
                        className="text-fd-muted-foreground transition hover:text-fd-foreground"
                      >
                        {link.label}
                      </LinkTag>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </Container>

      <div className="border-t">
        <Container className="flex flex-col gap-2 py-6 text-xs text-fd-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {appName} · v{libVersion} · MIT
            licensed
          </p>
          <p>
            Built by{' '}
            <a
              href="https://witbybit.com/"
              className="font-medium text-fd-foreground/80 transition hover:text-fd-foreground hover:underline"
            >
              Wit By Bit
            </a>
          </p>
        </Container>
      </div>
    </footer>
  );
}
