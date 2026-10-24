import { ArrowRight } from 'lucide-react';
import { Benchmark } from './benchmark';
import { ButtonLink, Container, SectionHeading } from './primitives';

export function PerformanceCallout() {
  return (
    <section className="border-y bg-fd-card/30 py-20 sm:py-24">
      <Container className="flex flex-col gap-10">
        <div className="flex flex-col items-start gap-6">
          <SectionHeading
            index="01"
            eyebrow="Built for big forms"
            title="Controlled inputs, without the slow mount."
            description="Custom inputs and UI kits need controlled fields. We built the same budget table with live column totals in each library, the way its docs recommend, and timed it in Chrome."
          />
          <ButtonLink
            href="/docs/examples/advanced/render-performance"
            variant="secondary"
          >
            Try the 500-row table yourself
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
          </ButtonLink>
        </div>
        <Benchmark />
      </Container>
    </section>
  );
}
