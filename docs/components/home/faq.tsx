import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Container, SectionHeading } from './primitives';

function Code(props: { children: ReactNode }) {
  return (
    <code className="rounded bg-fd-muted px-1 py-0.5 font-mono text-[0.85em] text-fd-foreground">
      {props.children}
    </code>
  );
}

function DocLink(props: { href: string; children: ReactNode }) {
  return (
    <Link
      href={props.href}
      className="font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-300"
    >
      {props.children}
    </Link>
  );
}

const questions: { q: string; a: ReactNode }[] = [
  {
    q: 'Do I need to know Jotai?',
    a: (
      <>
        No. Jotai is the store under the hood, so you install it next to Wit
        Form, but you never create or read atoms yourself. You work with{' '}
        <Code>useForm</Code>, <Code>useField</Code> and the other hooks.
      </>
    ),
  },
  {
    q: 'Will it clash with the Jotai store my app already uses?',
    a: (
      <>
        No. Each <Code>FormProvider</Code> creates its own store, so forms stay
        isolated from your app state and from each other. If you want a form in
        a shared store, for example to read it from outside its provider, pass{' '}
        <Code>skipJotaiProvider: true</Code>. See{' '}
        <DocLink href="/docs/api/form-provider">FormProvider</DocLink>.
      </>
    ),
  },
  {
    q: 'Can I use Zod, Yup or another validation library?',
    a: (
      <>
        Yes, inside a validator. A validator is a function that returns an error
        message, or <Code>null</Code> when the value is fine, so you can call
        any library from it. See the{' '}
        <DocLink href="/docs/guides/validation">validation guide</DocLink>.
      </>
    ),
  },
  {
    q: 'Does it ship input components?',
    a: (
      <>
        No, it's headless. You write small field components with{' '}
        <Code>useField</Code> once, styled like the rest of your app, and reuse
        them in every form. They can wrap native inputs or your design system.
      </>
    ),
  },
  {
    q: 'Which versions of React does it support?',
    a: (
      <>
        React 18 or newer, with Jotai 3 or newer. The package is ESM-only and
        ships its own TypeScript types. In the Next.js App Router, use the hooks
        in client components (files with <Code>'use client'</Code>).
      </>
    ),
  },
  {
    q: 'I use react-recoil-form. How do I switch?',
    a: (
      <>
        Wit Form is its successor, with the same API on Jotai in place of
        Recoil. Swap the packages, change the imports, and remove any{' '}
        <Code>RecoilRoot</Code> you added only for forms. See the{' '}
        <DocLink href="/docs/guides/migrating">migration guide</DocLink>.
      </>
    ),
  },
];

export function Faq() {
  return (
    <section className="py-20 sm:py-28">
      <Container className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions, answered."
          description={
            <>
              Something missing? Search the docs or{' '}
              <DocLink href="/docs/getting-started">
                start with the guide
              </DocLink>
              .
            </>
          }
        />
        <div className="divide-y border-y">
          {questions.map((item) => (
            <details key={item.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 rounded-md py-5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 [&::-webkit-details-marker]:hidden">
                {item.q}
                <Plus
                  aria-hidden
                  className="size-4 shrink-0 text-fd-muted-foreground transition group-open:rotate-45 motion-reduce:transition-none"
                />
              </summary>
              <p className="max-w-2xl pb-5 leading-relaxed text-fd-muted-foreground">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
