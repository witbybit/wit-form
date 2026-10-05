import Link from 'next/link';

const features = [
  {
    title: 'Field-level state',
    body: 'Each field is its own Jotai atom. Typing re-renders that field and nothing else, even in forms with thousands of inputs.',
  },
  {
    title: 'Field arrays',
    body: 'Add, insert, duplicate and remove rows, including lists inside lists. Only the cells that change re-render.',
  },
  {
    title: 'Validation at every level',
    body: 'Per field, per list and form-wide, with rules that depend on other fields or on props.',
  },
  {
    title: 'Live values without re-renders',
    body: 'Watch one field, one column of a table, or the whole form from any component.',
  },
  {
    title: 'Real-world workflows',
    body: 'Initial values, unsaved-change tracking, resets, async submit and multi-step forms are built in.',
  },
  {
    title: 'Small and typed',
    body: 'TypeScript types included, ESM-only, about 7 kB gzipped. Bring your own inputs.',
  },
];

const snippet = `function NameField() {
  const { fieldValue, setFieldValue, error } = useField({
    name: 'name',
    validate: (value) => (!value ? 'Required' : null),
  });
  return <input value={fieldValue ?? ''} onChange={(e) => setFieldValue(e.target.value)} />;
}`;

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-16 md:py-24">
      <section className="flex flex-col items-start gap-6">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Fast React forms,
          <br />
          one atom per field.
        </h1>
        <p className="max-w-2xl text-lg text-fd-muted-foreground">
          Wit Form keeps every field in its own Jotai atom, so large forms, long
          tables and dynamic lists stay fast without any tuning on your side.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/docs/getting-started"
            className="rounded-full bg-fd-primary px-5 py-2.5 text-sm font-medium text-fd-primary-foreground"
          >
            Get started
          </Link>
          <Link
            href="/docs/examples"
            className="rounded-full border px-5 py-2.5 text-sm font-medium hover:bg-fd-accent"
          >
            See examples
          </Link>
        </div>
        <code className="rounded-lg border bg-fd-card px-4 py-2 text-sm">
          pnpm add wit-form jotai
        </code>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="rounded-xl border bg-fd-card p-5">
            <h2 className="mb-2 font-semibold">{feature.title}</h2>
            <p className="text-sm text-fd-muted-foreground">{feature.body}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold">A field in a few lines</h2>
        <pre className="overflow-x-auto rounded-xl border bg-fd-card p-5 text-sm">
          <code>{snippet}</code>
        </pre>
        <Link
          href="/docs/getting-started"
          className="text-sm font-medium underline underline-offset-4"
        >
          Build your first form →
        </Link>
      </section>
    </main>
  );
}
