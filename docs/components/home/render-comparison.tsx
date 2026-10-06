import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import { Container, SectionHeading } from './primitives';

const CELLS = 24;
const HOT_CELL = 9;

function CellGrid(props: { mode: 'all' | 'one' }) {
  return (
    <div
      className="grid grid-cols-6 gap-1.5"
      style={
        {
          '--wf-cell':
            'color-mix(in oklab, var(--color-fd-foreground) 7%, transparent)',
          '--wf-hot':
            props.mode === 'all'
              ? 'rgb(244 63 94 / 0.75)'
              : 'rgb(16 185 129 / 0.9)',
        } as CSSProperties
      }
    >
      {Array.from({ length: CELLS }, (_, i) => {
        const hot = props.mode === 'all' || i === HOT_CELL;
        return (
          <div
            key={i}
            className={cn(
              'h-7 rounded-[5px] bg-[var(--wf-cell)]',
              hot && 'motion-safe:animate-wf-pulse-all'
            )}
          />
        );
      })}
    </div>
  );
}

function Panel(props: {
  mode: 'all' | 'one';
  label: string;
  title: string;
  body: string;
  stat: string;
}) {
  const ours = props.mode === 'one';
  return (
    <div
      className={cn(
        'flex flex-col gap-6 rounded-2xl border p-6 sm:p-8',
        ours
          ? 'border-emerald-500/30 bg-gradient-to-b from-emerald-500/[0.07] to-transparent'
          : 'bg-fd-card/50'
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <span
          className={cn(
            'font-mono text-xs uppercase tracking-wider',
            ours
              ? 'text-emerald-600 dark:text-emerald-300'
              : 'text-fd-muted-foreground'
          )}
        >
          {props.label}
        </span>
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 font-mono text-xs',
            ours
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-300'
          )}
        >
          {props.stat}
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-lg border bg-fd-background/60 px-3 py-2 font-mono text-sm">
        <span className="text-fd-muted-foreground">name:</span>
        <span>Ada</span>
        <span
          className="-ml-1.5 h-4 w-px bg-fd-foreground motion-safe:animate-wf-caret"
          aria-hidden
        />
      </div>

      <CellGrid mode={props.mode} />

      <div>
        <h3 className="mb-1.5 font-semibold">{props.title}</h3>
        <p className="text-sm text-fd-muted-foreground">{props.body}</p>
      </div>
    </div>
  );
}

export function RenderComparison() {
  return (
    <section className="pt-16 pb-20 sm:pt-20 sm:pb-28">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          eyebrow="Why atoms"
          title="Your form shouldn't re-render because one input changed."
          description="Most form libraries keep values in one shared object. Wit Form gives each field its own atom, so an update only reaches the components that read that field."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Panel
            mode="all"
            label="Shared form state"
            stat="24 fields re-render"
            title="Every field wakes up"
            body="Each keystroke replaces the form object. Every field that reads from it renders again, unless you memoize and tune selectors."
          />
          <Panel
            mode="one"
            label="Wit Form"
            stat="1 field re-renders"
            title="Only the field you touched"
            body="The input writes to its own atom. The rest of the form doesn't notice, with no memo, selectors or manual tuning."
          />
        </div>
      </Container>
    </section>
  );
}
