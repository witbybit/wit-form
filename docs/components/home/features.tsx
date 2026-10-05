import {
  Atom,
  Braces,
  Eye,
  Layers,
  Package,
  Puzzle,
  ShieldCheck,
  Tags,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { Container, SectionHeading } from './primitives';

const features: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Atom,
    title: 'Field-level state',
    body: 'Each field is its own Jotai atom. Typing re-renders that field and nothing else, even in forms with thousands of inputs.',
  },
  {
    icon: Layers,
    title: 'Field arrays',
    body: 'Add, insert and remove rows, including lists inside lists, with stable row ids.',
  },
  {
    icon: ShieldCheck,
    title: 'Validation at every level',
    body: 'Per field, per list and form-wide, with rules that depend on other fields or on props.',
  },
  {
    icon: Eye,
    title: 'Live values without re-renders',
    body: 'Watch one field, one table column or the whole form. Only the component that watches re-renders.',
  },
  {
    icon: Puzzle,
    title: 'Headless, bring your own inputs',
    body: 'No UI ships with the library. Wire useField to native inputs or to your design system.',
  },
  {
    icon: Braces,
    title: 'Nested values from dot paths',
    body: 'Name a field address.city and submit gets { address: { city } }. No reshaping needed.',
  },
  {
    icon: Tags,
    title: 'Extra info per field',
    body: "Store data next to a value, like a select option's label, and get it back in onSubmit.",
  },
  {
    icon: Workflow,
    title: 'Real-world workflows',
    body: 'Initial values, unsaved-change tracking, resets, async submit and multi-step wizards.',
  },
  {
    icon: Package,
    title: 'Small and typed',
    body: 'About 7 kB gzipped, ESM-only, with TypeScript types included. React and Jotai are the only peers.',
  },
];

export function Features() {
  return (
    <section className="py-20 sm:py-28">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          eyebrow="Features"
          title="Everything a production form needs. Nothing it doesn't."
          description="Headless by design: Wit Form owns state and validation, and your components own the UI."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border bg-fd-card/50 p-6 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-500/30 hover:bg-fd-card motion-reduce:hover:translate-y-0"
            >
              <div
                aria-hidden
                className="absolute -top-16 -right-16 size-40 rounded-full bg-emerald-500/0 blur-3xl transition duration-500 group-hover:bg-emerald-500/15"
              />
              <div className="mb-5 grid size-10 place-items-center rounded-lg border bg-fd-background text-emerald-700 dark:text-emerald-300">
                <feature.icon className="size-5" strokeWidth={1.75} />
              </div>
              <h3 className="mb-2 font-semibold">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-fd-muted-foreground">
                {feature.body}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
