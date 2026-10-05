import { ArrowRight, Gauge } from 'lucide-react';
import { ButtonLink, Container } from './primitives';

const stats = [
  { value: '2,000', label: 'inputs in one form: 500 rows × 4 quarters' },
  {
    value: '2',
    label: 'components re-render per edit: the cell and its total',
  },
  { value: '0', label: 'selectors to write' },
];

export function PerformanceCallout() {
  return (
    <section className="pb-20 sm:pb-28">
      <Container>
        <div className="relative isolate overflow-hidden rounded-3xl border bg-zinc-950 px-6 py-12 text-zinc-100 [color-scheme:dark] sm:px-12 sm:py-16">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_100%_0%,rgb(16_185_129/0.28),transparent),radial-gradient(40%_60%_at_0%_100%,rgb(132_204_22/0.12),transparent)]"
          />
          <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div className="flex flex-col items-start gap-5">
              <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-emerald-300">
                <Gauge className="size-4" /> Built for big forms
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                A 500-row budget table that still types instantly.
              </h2>
              <p className="max-w-lg text-zinc-400">
                Open the render-performance example and watch the counters:
                editing a cell re-renders that cell and its column total, while
                the other rows stay put.
              </p>
              <ButtonLink
                href="/docs/examples/advanced/render-performance"
                className="bg-white text-zinc-950 hover:bg-zinc-200 hover:opacity-100"
              >
                Try the live benchmark
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </ButtonLink>
            </div>
            <dl className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3 lg:grid-cols-1">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col gap-1 bg-zinc-950/80 px-6 py-5"
                >
                  <dt className="order-2 text-sm text-zinc-400">
                    {stat.label}
                  </dt>
                  <dd className="order-1 font-mono text-3xl font-semibold tabular-nums">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Container>
    </section>
  );
}
