import Link from 'next/link';
import { appName, gitConfig } from '@/lib/shared';
import { Container, GitHubIcon } from './primitives';

const repoUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;

const links = [
  { label: 'Docs', href: '/docs' },
  { label: 'Examples', href: '/docs/examples' },
  { label: 'API', href: '/docs/api/use-form' },
  { label: 'llms.txt', href: '/llms.txt' },
  { label: 'npm', href: 'https://www.npmjs.com/package/wit-form' },
  { label: 'License', href: `${repoUrl}/blob/${gitConfig.branch}/LICENSE` },
];

export function Footer() {
  return (
    <footer className="border-t py-10">
      <Container className="flex flex-col items-center justify-between gap-6 text-sm text-fd-muted-foreground sm:flex-row">
        <p>
          <span className="font-medium text-fd-foreground">{appName}</span> ·
          MIT licensed ·{' '}
          <a
            href="https://witbybit.com/"
            className="font-medium text-fd-foreground hover:underline"
          >
            Built by Wit By Bit
          </a>
        </p>
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center gap-x-6 gap-y-2"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-fd-foreground"
            >
              {link.label}
            </Link>
          ))}
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
