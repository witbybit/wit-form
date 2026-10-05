import { CodeShowcase } from '@/components/home/code-showcase';
import { Features } from '@/components/home/features';
import { FinalCta } from '@/components/home/final-cta';
import { Footer } from '@/components/home/footer';
import { Hero } from '@/components/home/hero';
import { PerformanceCallout } from '@/components/home/performance-callout';
import { RenderComparison } from '@/components/home/render-comparison';

export default function HomePage() {
  return (
    <>
      <main className="flex flex-1 flex-col">
        <Hero />
        <RenderComparison />
        <CodeShowcase />
        <Features />
        <PerformanceCallout />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
