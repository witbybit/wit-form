# Wit Form

Wit Form is a React form library built on [Jotai](https://jotai.org) where the state of every field is an atom. The goal is to handle large forms easily: typing in one field doesn't re-render the whole form. Features so far:

- useForm: sets up the form with onSubmit and onError handlers
- useField: used in field components to capture changes, read the value and validate
- useFieldArray: manages field arrays efficiently, e.g. when data is entered in a table. You can append, insert and remove rows. Only the fields/cells being changed re-render.
- useFieldWatch / useFieldArrayColumnWatch: watch other fields in the form, so a component re-renders only when the fields it depends on change.
- useFormValues: read the form values in real time. Only the component using this hook re-renders, so you get all the values without re-rendering the whole form.
- useIsDirty: tracks whether the form has been modified.
- useFormContext: read and set values, validate, and reset initial values from anywhere inside the form.

# Install

```sh
pnpm add wit-form jotai
# or
npm install wit-form jotai
```

Requires React 18+ and Jotai 3+. The package is ESM-only and ships its own TypeScript types.

# Usage

```tsx
import { FormProvider, useField, useForm } from 'wit-form';

function NameField() {
  const { fieldValue, setFieldValue, onBlur, error } = useField<string>({
    name: 'name',
    validate: (value) => (!value ? 'Required' : null),
  });
  return (
    <>
      <input
        value={fieldValue ?? ''}
        onChange={(e) => setFieldValue(e.target.value)}
        onBlur={onBlur}
      />
      {error}
    </>
  );
}

function Form() {
  const { handleSubmit } = useForm({
    initialValues: { name: '' },
    onSubmit: (values) => console.log(values),
  });
  return (
    <form onSubmit={handleSubmit}>
      <NameField />
      <button type="submit">Submit</button>
    </form>
  );
}

export default function App() {
  return (
    <FormProvider>
      <Form />
    </FormProvider>
  );
}
```

By default every `<FormProvider>` creates its own Jotai store. To keep the form atoms in an existing Jotai `<Provider>` store (or the default store), pass `options={{ skipJotaiProvider: true }}`. Combine it with `options={{ formId }}` to watch a form's fields from outside its `<FormProvider>`, e.g. `useFormValues({ formId })`.

To get started, look at the examples in `src/stories` (`pnpm storybook`).

> **Coming from react-recoil-form?** Wit Form is a drop-in replacement (on React 18+): swap the `recoil` dependency for `jotai` and change imports from `react-recoil-form` to `wit-form`. (`skipRecoilRoot` still works as an alias of `skipJotaiProvider`.)

# Development

This repo uses [pnpm](https://pnpm.io) (the version is pinned in `package.json`).

```sh
pnpm install
pnpm test          # run tests
pnpm run typecheck # type check
pnpm run build     # build to dist/
pnpm storybook     # run the examples
```

`pnpm-workspace.yaml` turns on pnpm's supply-chain protections: new package versions are only installed once they are 3 days old, installs fail if a package's publish trust gets weaker, and dependency install scripts are blocked unless allowed.
