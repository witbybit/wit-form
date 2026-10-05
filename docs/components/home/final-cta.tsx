import { ArrowRight } from 'lucide-react';
import { InstallCommand } from './install-command';
import { ButtonLink, Container } from './primitives';

export function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden border-t py-24 sm:py-32">
      <div
        aria-hidden
        className="absolute bottom-[-40%] left-1/2 -z-10 h-[420px] w-[800px] -translate-x-1/2 rounded-full bg-indigo-500/15 blur-[120px]"
      />
      <Container className="flex flex-col items-center gap-8 text-center">
        <h2 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Build your first form in five minutes.
        </h2>
        <p className="max-w-xl text-lg text-fd-muted-foreground">
          Install the package, wrap your form in a provider and call useField.
          That's the whole setup.
        </p>
        <InstallCommand className="text-left" />
        <div className="flex flex-wrap justify-center gap-3">
          <ButtonLink href="/docs/getting-started">
            Read the docs
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
          </ButtonLink>
          <ButtonLink href="/docs/examples" variant="secondary">
            Browse examples
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
