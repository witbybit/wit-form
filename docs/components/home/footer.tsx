import Link from 'next/link';
import { appName, gitConfig } from '@/lib/shared';
import { Container, GitHubIcon } from './primitives';

const repoUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;

// next.config.mjs reads the same variable; plain <a> links don't get it added for them
const basePath = process.env.DOCS_BASE_PATH ?? '';

/** Only pages go through <Link>; anything else is a plain <a> so the browser loads it directly */
const links: { label: string; href: string; page?: boolean }[] = [
  { label: 'Docs', href: '/docs', page: true },
  { label: 'Examples', href: '/docs/examples', page: true },
  { label: 'API', href: '/docs/api/use-form', page: true },
  // A route handler, not a page: client-side navigation to it 404s in the static export
  { label: 'llms.txt', href: `${basePath}/llms.txt` },
  { label: 'npm', href: 'https://www.npmjs.com/package/wit-form' },
  { label: 'License', href: `${repoUrl}/blob/${gitConfig.branch}/LICENSE` },
];

export function Footer() {
  return (
    <footer className="border-t py-10">
      <Container className="flex flex-col items-center justify-between gap-6 text-sm text-fd-muted-foreground sm:flex-row">
        <p>
          <span className="font-medium text-fd-foreground">{appName}</span> ·{' '}
          <a
            href="https://witbybit.com/"
            className="font-medium hover:text-fd-foreground hover:underline"
          >
            Built by Wit By Bit
          </a>
        </p>
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center gap-x-6 gap-y-2"
        >
          {links.map((link) => {
            const LinkTag = link.page ? Link : 'a';
            return (
              <LinkTag
                key={link.href}
                href={link.href}
                className="transition hover:text-fd-foreground"
              >
                {link.label}
              </LinkTag>
            );
          })}
          <a
            href={repoUrl}
            aria-label="GitHub"
            className="transition hover:text-fd-foreground"
          >
            <GitHubIcon className="size-4" />
          </a>
        </nav>
      </Container>
    </footer>
  );
}
