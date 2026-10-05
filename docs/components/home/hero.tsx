import { ArrowRight } from 'lucide-react';
import { gitConfig } from '@/lib/shared';
import { CopyPromptButton } from './copy-prompt-button';
import { InstallCommand } from './install-command';
import { LiveDemo } from './live-demo';
import { ButtonLink, Container } from './primitives';

const facts = ['~7 kB gzipped', 'No dependencies', 'TypeScript', 'React 18+'];

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <BackgroundGrid />
      <Container className="grid items-center gap-14 pt-16 pb-20 md:pt-24 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:pb-28">
        <div className="flex flex-col items-start gap-7">
          <a
            href={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
            className="group inline-flex items-center gap-2 rounded-full border bg-fd-card/60 py-1 pr-3 pl-1 text-xs text-fd-muted-foreground backdrop-blur transition hover:border-emerald-500/40 hover:text-fd-foreground"
          >
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-300">
              v0.1
            </span>
            Open source, MIT licensed
            <ArrowRight className="size-3 transition group-hover:translate-x-0.5" />
          </a>

          <h1 className="text-[2.75rem] leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
            Fast React forms,{' '}
            <span className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 bg-clip-text text-transparent dark:from-emerald-300 dark:via-green-300 dark:to-lime-200">
              one atom per field.
            </span>
          </h1>

          <p className="max-w-xl text-lg text-pretty text-fd-muted-foreground">
            Wit Form is a headless form library that keeps every field in its
            own Jotai atom. Typing re-renders that one field, so forms with
            thousands of inputs stay fast without memoizing anything.
          </p>

          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/docs/getting-started">
              Get started
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </ButtonLink>
            <CopyPromptButton />
          </div>

          <InstallCommand />

          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-fd-muted-foreground">
            {facts.map((fact) => (
              <li key={fact} className="flex items-center gap-1.5">
                <span
                  className="size-1 rounded-full bg-emerald-500"
                  aria-hidden
                />
                {fact}
              </li>
            ))}
          </ul>
        </div>

        <LiveDemo />
      </Container>
    </section>
  );
}

function BackgroundGrid() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-fd-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-fd-border)_1px,transparent_1px)] bg-[size:48px_48px] opacity-50 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
      <div className="absolute top-[-20%] left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[120px] dark:bg-emerald-500/20" />
    </div>
  );
}
