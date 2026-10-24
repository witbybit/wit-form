import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Container, SectionHeading } from './primitives';

function Card(props: {
  title: string;
  body: ReactNode;
  visual?: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        'group relative flex flex-col justify-between gap-8 overflow-hidden rounded-2xl border bg-fd-card/50 p-6 transition duration-300 hover:border-emerald-500/30 hover:bg-fd-card sm:p-7',
        props.className
      )}
    >
      <div
        aria-hidden
        className="absolute -top-20 -right-20 size-48 rounded-full bg-emerald-500/0 blur-3xl transition duration-500 group-hover:bg-emerald-500/10"
      />
      {props.visual && <div aria-hidden>{props.visual}</div>}
      <div>
        <h3 className="mb-2 text-lg font-semibold tracking-tight">
          {props.title}
        </h3>
        <p className="text-sm leading-relaxed text-pretty text-fd-muted-foreground">
          {props.body}
        </p>
      </div>
    </article>
  );
}

function Code(props: { children: ReactNode }) {
  return (
    <code className="rounded bg-fd-muted px-1 py-0.5 font-mono text-[0.9em] text-fd-foreground">
      {props.children}
    </code>
  );
}

const rows = [
  ['Laptop', '2', '1,200'],
  ['Monitor', '1', '340'],
  ['Keyboard', '3', '90'],
];

/** A small order table where only the watched columns light up */
function ColumnWatchVisual() {
  return (
    <div className="overflow-hidden rounded-xl border bg-fd-background font-mono text-xs">
      <div className="grid grid-cols-[1.4fr_0.6fr_0.8fr] border-b bg-fd-muted/50 text-fd-muted-foreground">
        <span className="px-3 py-2">product</span>
        <span className="bg-emerald-500/10 px-3 py-2 text-emerald-700 dark:text-emerald-300">
          qty
        </span>
        <span className="bg-emerald-500/10 px-3 py-2 text-emerald-700 dark:text-emerald-300">
          price
        </span>
      </div>
      {rows.map((row) => (
        <div
          key={row[0]}
          className="grid grid-cols-[1.4fr_0.6fr_0.8fr] border-b last:border-b-0"
        >
          <span className="px-3 py-2">{row[0]}</span>
          <span className="bg-emerald-500/5 px-3 py-2 tabular-nums">
            {row[1]}
          </span>
          <span className="bg-emerald-500/5 px-3 py-2 tabular-nums">
            {row[2]}
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between border-t bg-fd-muted/30 px-3 py-2">
        <span className="text-fd-muted-foreground">
          total · watches qty, price
        </span>
        <span className="font-semibold tabular-nums">3,010</span>
      </div>
    </div>
  );
}

/** Rows keep their ids while their order changes */
function StableRowsVisual() {
  return (
    <div className="flex flex-col gap-1.5 font-mono text-xs">
      {[
        ['r_7f2', 'Laptop', 'swap ↓'],
        ['r_a91', 'Monitor', 'swap ↑'],
        ['r_c04', 'Keyboard', ''],
      ].map(([id, name, action]) => (
        <div
          key={id}
          className="flex items-center gap-3 rounded-lg border bg-fd-background px-3 py-2"
        >
          <span className="text-emerald-700 dark:text-emerald-300">{id}</span>
          <span className="flex-1">{name}</span>
          <span className="text-fd-muted-foreground">{action}</span>
        </div>
      ))}
    </div>
  );
}

const schemas = ['Zod', 'Valibot', 'ArkType', 'Effect Schema', 'Yup 1.7+'];

const details = [
  'Focus the first invalid field',
  'Async rules with debounce',
  'Server errors',
  'Dirty, touched and submit flags',
  'Hidden fields drop out of values',
  'Reset to initial values',
  'Multi-step wizards',
];

export function Features() {
  return (
    <section className="pb-20 sm:pb-24">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          index="03"
          eyebrow="Details"
          title="The parts big forms actually need."
          description="Tables with live totals, rows that move, one schema for the whole form. The features that usually need workarounds are built in."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <Card
            className="lg:col-span-2"
            visual={<ColumnWatchVisual />}
            title="Live totals over big tables"
            body={
              <>
                Watch only the columns you need. A running total re-renders when
                a quantity or price changes, never when someone edits a product
                name.
              </>
            }
          />
          <Card
            visual={<StableRowsVisual />}
            title="Rows keep their identity"
            body={
              <>
                Every row gets a stable <Code>rowId</Code>. Swap or move rows
                and the row components don&apos;t even re-render.
              </>
            }
          />
          <Card
            visual={
              <div className="flex flex-wrap gap-2">
                {schemas.map((schema) => (
                  <span
                    key={schema}
                    className="rounded-full border bg-fd-background px-3 py-1 font-mono text-xs"
                  >
                    {schema}
                  </span>
                ))}
              </div>
            }
            title="One schema, every error"
            body="Pass any Standard Schema to a field, a list or the whole form. Errors land on the matching fields, inside table rows too. No adapter to install."
          />
          <Card
            visual={
              <pre className="overflow-x-auto rounded-xl border bg-fd-background p-3 font-mono text-xs leading-5">
                {'setFieldValue(option.id, {\n  label: option.name,\n})'}
              </pre>
            }
            title="Extra info per field"
            body={
              <>
                Keep data next to a value, like a select option&apos;s label,
                with <Code>extraInfo</Code>, and get it back in onSubmit.
              </>
            }
          />
          <Card
            visual={
              <pre className="overflow-x-auto rounded-xl border bg-fd-background p-3 font-mono text-xs leading-5">
                <span className="text-fd-muted-foreground">
                  {'// checked against Order\n'}
                </span>
                {"useField({ name: '"}
                <span className="underline decoration-red-500 decoration-wavy underline-offset-4">
                  adress.city
                </span>
                {"' })"}
              </pre>
            }
            title="Type-safe when you want it"
            body={
              <>
                Describe your values once with <Code>createFormHooks</Code> and
                TypeScript checks every field name and value.
              </>
            }
          />
          <Card
            className="lg:col-span-3"
            visual={
              <ul className="flex flex-wrap gap-2">
                {details.map((detail) => (
                  <li
                    key={detail}
                    className="flex items-center gap-2 rounded-full border bg-fd-background px-3 py-1.5 text-sm"
                  >
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    {detail}
                  </li>
                ))}
              </ul>
            }
            title="Headless, with the tedious parts done"
            body="No components and no CSS. One useField hook works for native inputs, date pickers and custom selects alike, with no separate controlled-input API."
          />
        </div>
      </Container>
    </section>
  );
}
