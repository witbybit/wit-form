import { highlight } from 'fumadocs-core/highlight';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CodeTabs } from './code-tabs';
import { Container, SectionHeading } from './primitives';

const samples = [
  {
    id: 'fields',
    label: 'Fields',
    file: 'text-field.tsx',
    title: 'Bring your own inputs',
    body: 'useField hands you a value, a setter and an error. Wire them to any input, from a native element to your design system.',
    href: '/docs/getting-started',
    code: `import { FormProvider, useField, useForm } from 'wit-form';

function TextField({ name, label }: { name: string; label: string }) {
  const { fieldValue, setFieldValue, onBlur, error } = useField<string>({
    name,
    validate: (value) => (!value ? 'Required' : null),
  });

  return (
    <label>
      {label}
      <input
        value={fieldValue ?? ''}
        onChange={(e) => setFieldValue(e.target.value)}
        onBlur={onBlur}
      />
      {error && <span role="alert">{error}</span>}
    </label>
  );
}

function Profile() {
  const { handleSubmit } = useForm({ onSubmit: save });
  return (
    <form onSubmit={handleSubmit}>
      <TextField name="name" label="Name" />
      <TextField name="address.city" label="City" />
      <button>Save</button>
    </form>
  );
}

export const ProfileForm = () => <FormProvider><Profile /></FormProvider>;`,
  },
  {
    id: 'arrays',
    label: 'Field arrays',
    file: 'order-form.tsx',
    title: 'Lists, tables and lists inside lists',
    body: 'Every row gets a stable rowId. Append, insert and remove rows, and only the cells that change re-render.',
    href: '/docs/guides/field-arrays',
    code: `const { fieldArrayProps, append, insert, remove, error } = useFieldArray({
  name: 'items',
  fieldNames: ['product', 'qty'],
  validate: (rows) => (rows.length === 0 ? 'Add at least one item' : null),
});

return (
  <>
    {fieldArrayProps.rowIds.map((rowId, index) => (
      <div key={rowId}>
        <Cell name="product" rowId={rowId} />
        <Cell name="qty" rowId={rowId} />
        <button onClick={() => insert(index + 1, { qty: 1 })}>Insert</button>
        <button onClick={() => remove(index)}>Remove</button>
      </div>
    ))}
    {error}
    <button onClick={() => append({ qty: 1 })}>Add item</button>
  </>
);`,
  },
  {
    id: 'validation',
    label: 'Validation',
    file: 'password-form.tsx',
    title: 'Rules at every level',
    body: 'Validate a field, a whole list or the full form. depFields re-run a rule when the fields it depends on change.',
    href: '/docs/guides/validation',
    code: `// Re-validates whenever "password" changes
useField({
  name: 'confirmPassword',
  depFields: ['password'],
  validate: (value, other) =>
    value !== other?.values.password ? 'Passwords do not match' : null,
});

// Form-wide rules run on submit, together with field rules
useForm({
  onSubmit,
  validate: (values) =>
    values.startDate > values.endDate
      ? ['Start date must be before end date']
      : [],
});`,
  },
  {
    id: 'watch',
    label: 'Watching values',
    file: 'order-total.tsx',
    title: 'Live values, scoped re-renders',
    body: 'Subscribe to one field, one column of a table or the whole form. Only the component that watches re-renders.',
    href: '/docs/guides/watching-values',
    code: `// Re-renders only when qty or price change in any row
function OrderTotal() {
  const { values: rows } = useFieldArrayColumnWatch({
    fieldArrayName: 'items',
    fieldNames: ['qty', 'price'],
  });
  const total = rows.reduce((sum, row) => sum + row.qty * row.price, 0);
  return <output>{total}</output>;
}

// Enable Save only after something changed
function SaveButton() {
  const isDirty = useIsDirty();
  return <button disabled={!isDirty}>Save</button>;
}`,
  },
];

export async function CodeShowcase() {
  const highlighted = await Promise.all(
    samples.map((sample) =>
      highlight(sample.code, {
        lang: 'tsx',
        theme: 'github-dark-default',
        components: {
          pre: (props) => (
            <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-6">
              {props.children}
            </pre>
          ),
        },
      })
    )
  );

  return (
    <section className="border-y bg-fd-card/30 py-20 sm:py-28">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          eyebrow="The API"
          title="A handful of hooks. No schema DSL, no magic."
          description="Wit Form manages state and validation. You keep full control of markup, styling and accessibility."
        />
        <CodeTabs
          tabs={samples.map((tab, i) => ({
            id: tab.id,
            label: tab.label,
            file: tab.file,
            code: highlighted[i],
            aside: (
              <div className="flex flex-col gap-3">
                <h3 className="text-xl font-semibold tracking-tight">
                  {tab.title}
                </h3>
                <p className="text-fd-muted-foreground">{tab.body}</p>
                <Link
                  href={tab.href}
                  className="group mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-300 dark:hover:text-emerald-200"
                >
                  Read the guide
                  <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                </Link>
              </div>
            ),
          }))}
        />
      </Container>
    </section>
  );
}
