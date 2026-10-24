import { highlight } from 'fumadocs-core/highlight';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { libVersion } from '@/lib/shared';
import { CopyPromptButton } from './copy-prompt-button';
import { InstallCommand } from './install-command';
import { ButtonLink, Container } from './primitives';
import { heroDemoCode, type HeroDemoKey } from './hero-demo-code';
import { HeroDemos } from './hero-demos';

/** Highlights each demo's code on the server, so "View code" costs the browser nothing */
async function highlightDemoCode() {
  const entries = await Promise.all(
    (Object.keys(heroDemoCode) as HeroDemoKey[]).map(async (key) => {
      const { file, code } = heroDemoCode[key];
      const html = await highlight(code, {
        lang: 'tsx',
        theme: 'github-dark-default',
        components: {
          pre: (props) => (
            <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-6">
              {props.children}
            </pre>
          ),
        },
      });
      return [key, { file, code: html }] as const;
    })
  );
  return Object.fromEntries(entries) as Record<
    HeroDemoKey,
    { file: string; code: ReactNode }
  >;
}

export async function Hero() {
  const code = await highlightDemoCode();
  return (
    <section className="relative isolate overflow-x-clip">
      <BackgroundGrid />
      <Container className="flex flex-col gap-14 pt-16 pb-20 md:pt-24 sm:pb-24">
        {/* One centred column, so the eye runs headline, pitch, actions, then the demo */}
        <div className="flex flex-col items-center gap-7 text-center">
          <Link
            href="/docs/guides/validation#schema-validation"
            className="group inline-flex items-center gap-2 rounded-full border bg-fd-card/60 py-1 pr-3 pl-1 text-xs text-fd-muted-foreground backdrop-blur transition hover:border-emerald-500/40 hover:text-fd-foreground"
          >
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-300">
              v{libVersion}
            </span>
            New: schema and async validation
            <ArrowRight className="size-3 transition group-hover:translate-x-0.5" />
          </Link>

          <h1 className="text-5xl leading-[1.02] font-semibold tracking-tighter sm:text-7xl">
            Big forms.
            <br />
            <span className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 bg-clip-text text-transparent dark:from-emerald-300 dark:via-green-300 dark:to-lime-200">
              Fast to load, fast to type.
            </span>
          </h1>

          <p className="max-w-2xl text-lg text-pretty text-fd-muted-foreground sm:text-xl">
            Wit Form gives every field its own state. Big forms mount several
            times faster than other controlled-input libraries, and typing
            re-renders only the field you&apos;re in. No memo, no selectors,
            nothing to tune.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/docs/getting-started">
              Get started
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </ButtonLink>
            <CopyPromptButton />
          </div>

          <InstallCommand compact />
        </div>

        <HeroDemos code={code} />
      </Container>
    </section>
  );
}

function BackgroundGrid() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-fd-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-fd-border)_1px,transparent_1px)] bg-[size:48px_48px] opacity-50 [mask-image:radial-gradient(ellipse_70%_45%_at_50%_0%,black,transparent)]" />
      <div className="absolute top-[-15%] left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[120px] dark:bg-emerald-500/20" />
    </div>
  );
}
