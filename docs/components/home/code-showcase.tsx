import { highlight } from 'fumadocs-core/highlight';
import { CodeTabs } from './code-tabs';
import { Container, SectionHeading } from './primitives';

const samples = [
  {
    id: 'fields',
    file: 'profile-form.tsx',
    title: 'A form in a few lines',
    body: 'A provider, useForm to submit, and your own inputs. Write each input once with useField, styled your way, then reuse it in every form.',
    href: '/docs/getting-started',
    code: `import { FormProvider, useField, useForm } from 'wit-form';

// A whole form: a provider, a submit handler and the fields
export const ProfileForm = () => (
  <FormProvider>
    <Profile />
  </FormProvider>
);

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

// Write each input once, styled your way, and reuse it everywhere
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
}`,
  },
  {
    id: 'arrays',
    file: 'order-form.tsx',
    title: 'Tables and lists inside lists',
    body: 'Every row gets a stable id. Append, insert, move and remove rows, and only the cells that change re-render.',
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
    file: 'password-form.tsx',
    title: 'Validation at every level',
    body: 'Rules for a field, a list or the whole form, as plain functions or any Standard Schema. depFields re-runs a rule when a field it depends on changes.',
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
    file: 'order-total.tsx',
    title: 'Watch values without the cost',
    body: 'Subscribe to one field, one table column or the whole form. Only the component that watches re-renders, so a live total never slows the inputs.',
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
    <section className="py-20 sm:py-24">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          index="02"
          eyebrow="The API"
          title="A few hooks. Your inputs, your markup."
          description="Wit Form owns state and validation. You own the markup, styling and accessibility, so it fits any design system."
        />
        <CodeTabs
          tabs={samples.map((sample, i) => ({
            id: sample.id,
            title: sample.title,
            body: sample.body,
            href: sample.href,
            file: sample.file,
            code: highlighted[i],
          }))}
        />
      </Container>
    </section>
  );
}
