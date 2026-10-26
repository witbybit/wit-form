import { Benchmark } from './benchmark';
import { Container, SectionHeading } from './primitives';

export function PerformanceCallout() {
  return (
    <section className="border-y bg-fd-card/30 py-20 sm:py-24">
      <Container className="flex flex-col gap-10">
        <SectionHeading
          index="01"
          eyebrow="Built for big forms"
          title="Controlled inputs, without the slow mount."
          description="Custom inputs and UI kits need controlled fields. We built the same budget table with live column totals in each library, the way its docs recommend, and timed it in Chrome."
        />
        <Benchmark />
      </Container>
    </section>
  );
}
