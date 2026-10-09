# Wit Form

Fast React forms where every field is a [Jotai](https://jotai.org) atom.

Each field keeps its state in its own atom, so typing in one field re-renders only that field, not the whole form. That keeps large forms, long tables and dynamic field arrays fast without any memoization on your side.

- **Field-level state:** `useField` subscribes a component to a single field.
- **Field arrays:** add, insert, move, swap and remove rows, including nested arrays. Only the cells that change re-render.
- **Validation:** per field, per field array and form-wide, with plain functions or any [Standard Schema](https://standardschema.dev) (Zod, Valibot, ArkType, Yup 1.7+). Sync or async, with debouncing.
- **Live values without re-renders:** watch specific fields, a column of a field array, or the whole form from any component.
- **Form state:** `isValid`, `isDirty`, `isSubmitting`, `submitCount` and more. Components re-render only for the flags they read.
- **Type-safe field names:** `createFormHooks<Values>()` checks every name and types every value, including fields in field array rows.
- **Initial values, resets, server errors and focus on the first invalid field** built in.
- **TypeScript** types included, ESM-only, about 10 kB gzipped.

## Contents

- [Install](#install)
- [Quick start](#quick-start)
- [Core concepts](#core-concepts)
- [Validation](#validation)
- [Type-safe forms](#type-safe-forms)
- [Field arrays](#field-arrays)
- [Watching values](#watching-values)
- [Working with the form from anywhere](#working-with-the-form-from-anywhere)
- [API reference](#api-reference)
- [Recipes](#recipes)
- [Development](#development)

## Install

```sh
pnpm add wit-form jotai
# or
npm install wit-form jotai
```

Requires React 18+ and Jotai 3+.

## Quick start

```tsx
import { FormProvider, useField, useForm } from 'wit-form';

function TextField(props: { name: string; label: string; required?: boolean }) {
  const { fieldValue, setFieldValue, onBlur, error } = useField<string>({
    name: props.name,
    validate: (value) => (props.required && !value ? 'Required' : null),
  });

  return (
    <label>
      {props.label}
      <input
        value={fieldValue ?? ''}
        onChange={(e) => setFieldValue(e.target.value)}
        onBlur={onBlur}
      />
      {error && <span className="error">{error}</span>}
    </label>
  );
}

function SignupForm() {
  const { handleSubmit, formState } = useForm({
    initialValues: { name: 'Jane', address: { city: '' } },
    onSubmit: async (values) => {
      await fetch('/api/signup', {
        method: 'POST',
        body: JSON.stringify(values),
      });
    },
    onError: (fieldErrors) => console.warn(fieldErrors),
  });

  return (
    <form onSubmit={handleSubmit}>
      <TextField name="name" label="Name" required />
      <TextField name="email" label="Email" required />
      {/* Dot paths create nested values: { address: { city } } */}
      <TextField name="address.city" label="City" />
      <button type="submit" disabled={formState.isSubmitting}>
        Sign up
      </button>
    </form>
  );
}

export default function App() {
  return (
    <FormProvider>
      <SignupForm />
    </FormProvider>
  );
}
```

## Core concepts

### `FormProvider`

Every form lives inside a `<FormProvider>`. All hooks below must be called from components inside it, including the component that calls `useForm`. By default each `FormProvider` creates its own isolated Jotai store, so you can render many forms on one page.

`withFormProvider(Component, options?)` wraps a component in a `FormProvider`. It's handy when the component that calls `useForm` is the top of the form:

```tsx
export default withFormProvider(SignupForm);
```

### Field names

Field names are paths into the form values: `'name'`, `'address.city'` or `'items[0].qty'`. The submitted values are built from these paths.

### Values and `extraInfo`

Each field stores a value and an optional `extraInfo`. Use `extraInfo` for data that belongs with the value but isn't part of it, for example the label of a selected option or a file preview URL:

```tsx
setFieldValue(option.value, { label: option.label });
```

`onSubmit(values, extraInfos)` receives both, with `extraInfos` shaped like `values`.

### Touched state

A field's `error` is only returned once the field is touched, meaning its `onBlur` has run or the form has been validated on submit. Validation itself runs on every change. To show errors as the user types, or only after the first submit, set `useForm({ mode: 'onChange' })` or `mode: 'onSubmit'`.

### Unmounted fields

By default a field's value is removed from the form when its component unmounts, so conditionally rendered fields don't leak stale values into `onSubmit`. Pass `skipUnregister: true` to `useForm` (whole form), `useField` or `useFieldArray` to keep the values of unmounted fields. This is useful for multi-step forms and tabs.

## Validation

### Field validation

`validate` returns an error message, or `null`/`undefined` when the value is valid:

```tsx
useField({
  name: 'age',
  validate: (value) => (value < 18 ? 'You must be 18 or older' : null),
});
```

`validate` is only read once, when the field mounts. If it depends on props or state that change, pass a memoized `validateCallback` instead, and keep its dependencies stable to avoid render loops:

```tsx
const validateCallback = useCallback(
  (value?: number) => (value! > max ? `Max allowed: ${max}` : null),
  [max]
);
useField({ name: 'quantity', validateCallback });
```

### Validating against other fields

List the fields a validator depends on in `depFields`. Their values are passed in the second argument, and the field re-validates when they change:

```tsx
useField({
  name: 'confirmPassword',
  depFields: ['password'],
  validate: (value, other) =>
    value !== other?.values.password ? 'Passwords do not match' : null,
});
```

On submit, the second argument contains all form values: `{ values, extraInfos }`.

### Form-level validation

`useForm`'s `validate` receives all values and returns a list of error messages. It runs on submit, together with field validation:

```tsx
useForm({
  onSubmit,
  validate: (values) =>
    values.startDate > values.endDate
      ? ['Start date must be before end date']
      : [],
  onError: (fieldErrors, formErrors, values) => {
    // fieldErrors: [{ name, ancestors, type, error }]
    // formErrors: the strings returned by validate
  },
});
```

The form-level errors are also kept in `formState.formErrors` until the next submit. `useSetFormProps()` returns a setter that replaces the form-level `validate` from any component inside the form: `setFormProps({ validate })`.

### Async validation

Any validator can be `async`. `isValidating` is `true` while it runs, `debounceValidation` waits for typing to pause, and results of outdated checks are ignored. A validator that throws or rejects becomes an error, so a failed request can't let invalid data through:

```tsx
const { isValidating, error } = useField({
  name: 'username',
  validate: async (value) =>
    value && (await api.isTaken(value)) ? 'This username is taken' : null,
  debounceValidation: 400,
});
```

`handleSubmit` waits for pending async validators (with `formState.isValidating` set) before calling `onSubmit` or `onError`. Without async validators, submitting stays synchronous.

### Schema validation

Pass any [Standard Schema](https://standardschema.dev) (Zod, Valibot, ArkType, Effect Schema, Yup 1.7+) as `schema`. No adapter needed:

```tsx
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  items: z.array(z.object({ qty: z.number().min(1) })).min(1, 'Add an item'),
});

useForm({ schema, onSubmit });
```

Each issue goes to the field at its path: `items[1].qty` lands on the `qty` field of the second row, and `items` on the field array. Issues without a field become form errors (`formState.formErrors`). The schema re-runs as values change. `useField` and `useFieldArray` also accept a `schema` for a single field or list.

### Errors from the server

```tsx
const { setError, setFormErrors } = useForm({
  onSubmit: async (values) => {
    const result = await api.save(values);
    if (result.emailTaken) {
      setError('email', 'This email is already registered');
      return false; // keep the edits
    }
  },
});
```

`clearErrors()` clears them. Attach `useField`'s `ref` to an input and the first invalid field is focused when a submit fails.

### Validating on demand

```tsx
const { validateFields, validateFieldsAsync, validateAllFields } = useForm({
  onSubmit,
});

// Validate only some fields, e.g. the current step of a wizard
const errors = validateFields(['email', 'password']);
if (!errors.length) goToNextStep();

// The same, waiting for async validators
const asyncErrors = await validateFieldsAsync(['username']);

// Validate everything without submitting
const allErrors = validateAllFields();
```

Fields that fail validation are marked as touched so their errors show.

### Form state

```tsx
const { formState } = useForm({ onSubmit });
// or, in any component inside the form:
const { isValid, isSubmitting } = useFormState();
```

`formState` has `isSubmitting`, `isSubmitted`, `isSubmitSuccessful`, `submitCount`, `isValidating`, `isValid`, `isDirty`, `errors` and `formErrors`. A component re-renders only when a property it reads changes.

## Type-safe forms

`createFormHooks<Values>()` returns the same hooks, typed for your values. Names are checked and values are typed by path:

```tsx
import { createFormHooks } from 'wit-form';

interface Order {
  customer: { name: string };
  items: { product: string; qty: number }[];
}

const { useForm, useField, useFieldArray } = createFormHooks<Order>();

const name = useField({ name: 'customer.name' }); // fieldValue: string | undefined
useField({ name: 'customer.nmae' }); // ❌ compile error

// Fields in rows are checked against the row type
const qty = useField({ name: 'qty', ancestors: [{ name: 'items', rowId }] }); // number | undefined
```

At runtime these are the regular hooks. `FieldPath`, `ArrayPath` and `PathValue` are exported for your own components.

## Field arrays

Field arrays manage lists of rows, such as order lines or a table. Each row gets a stable `rowId`, and fields inside a row pass the row as an ancestor.

```tsx
import { useField, useFieldArray, useForm, withFormProvider } from 'wit-form';

function Cell(props: { name: string; rowId: number }) {
  const { fieldValue, setFieldValue } = useField({
    name: props.name,
    ancestors: [{ name: 'items', rowId: props.rowId }],
  });
  return (
    <input
      value={fieldValue ?? ''}
      onChange={(e) => setFieldValue(e.target.value)}
    />
  );
}

const validateItems = (rows: any[]) =>
  rows.length === 0 ? 'Add at least one item' : null;

function OrderForm() {
  const { handleSubmit } = useForm({
    initialValues: { items: [{ product: 'Pen', qty: 2 }] },
    onSubmit: (values) => console.log(values.items),
  });
  const { fieldArrayProps, append, insert, remove, error } = useFieldArray({
    name: 'items',
    fieldNames: ['product', 'qty'],
    validate: validateItems,
  });

  return (
    <form onSubmit={handleSubmit}>
      {fieldArrayProps.rowIds.map((rowId, index) => (
        <div key={rowId}>
          <Cell name="product" rowId={rowId} />
          <Cell name="qty" rowId={rowId} />
          <button type="button" onClick={() => insert(index + 1, { qty: 1 })}>
            Insert below
          </button>
          <button type="button" onClick={() => remove(index)}>
            Remove
          </button>
        </div>
      ))}
      {error}
      <button type="button" onClick={() => append({ qty: 1 })}>
        Add item
      </button>
      <button type="submit">Save</button>
    </form>
  );
}

export default withFormProvider(OrderForm);
```

Always use `rowId`, not the index, as the React `key` and in `ancestors`.

### Nested field arrays

Declare a nested array in the parent's `fieldNames`, then render a child `useFieldArray` with the parent row as its ancestor:

```tsx
useFieldArray({
  name: 'sections',
  fieldNames: [
    'title',
    { name: 'tasks', type: 'field-array', fieldNames: ['label'] },
  ],
});

// Rendered inside each section row
function Tasks({ sectionRowId }: { sectionRowId: number }) {
  const ancestors = useMemo(
    () => [{ name: 'sections', rowId: sectionRowId }],
    [sectionRowId]
  );
  const { fieldArrayProps } = useFieldArray({
    name: 'tasks',
    fieldNames: ['label'],
    ancestors,
  });
  return fieldArrayProps.rowIds.map((rowId) => (
    <LabelField
      key={rowId}
      ancestors={[...ancestors, { name: 'tasks', rowId }]}
    />
  ));
}
```

Memoize the `ancestors` arrays you pass to hooks so they keep the same identity between renders.

## Watching values

These hooks re-render only the component that uses them.

```tsx
// Specific fields. Returns { values, extraInfos } shaped like the form values,
// e.g. { values: { country, address: { city } } }
const { values } = useFieldWatch({ fieldNames: ['country', 'address.city'] });

// Fields inside a field array row
useFieldWatch({
  fieldNames: [{ name: 'qty', ancestors: [{ name: 'items', rowId }] }],
});

// One or more columns of a field array, e.g. for a running total
const { values: rows } = useFieldArrayColumnWatch({
  fieldArrayName: 'items',
  fieldNames: ['qty', 'price'],
});
const total = rows.reduce((sum, row) => sum + row.qty * row.price, 0);

// The whole form
const values = useFormValues();
const { values: allValues, extraInfos } = useFormValuesAndExtraInfos();

// Has anything changed since the initial values?
const isDirty = useIsDirty();
```

## Working with the form from anywhere

`useFormContext()` gives any component inside the form imperative access to it:

```tsx
const { setValue, getValue, getValues, resetInitialValues } = useFormContext();

// Set a field (it re-validates automatically)
setValue('email', { value: 'jane@example.com' });

// Set a field inside a field array row
setValue(
  { name: 'qty', type: 'field', ancestors: [{ name: 'items', rowId }] },
  { value: 3 }
);

// Replace a whole field array
setValue(
  { name: 'items', type: 'field-array' },
  { value: [{ product: 'Ink' }] }
);

// Read
getValue({ name: 'email', type: 'field' }); // { value, extraInfo }
getValues(); // { values, extraInfos }

// Load new initial values, e.g. after fetching a record
resetInitialValues(record);
```

## API reference

### `useForm(options)`

| Option                    | Type                                        | Description                                                                                                                  |
| ------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `onSubmit`                | `(values, extraInfos) => any`               | Called with the values when validation passes. If it returns a promise, `formState.isSubmitting` is `true` until it settles. |
| `onError`                 | `(fieldErrors, formErrors, values) => any`  | Called instead of `onSubmit` when validation fails.                                                                          |
| `initialValues`           | `object`                                    | Initial form values.                                                                                                         |
| `validate`                | `(values) => string[] \| null \| undefined` | Form-level validation, run on submit. Can be async.                                                                          |
| `schema`                  | `StandardSchemaV1`                          | A schema for all values. Issues are shown on the matching fields.                                                            |
| `mode`                    | `'onTouched' \| 'onChange' \| 'onSubmit'`   | When field errors become visible. Default `'onTouched'`.                                                                     |
| `shouldFocusError`        | `boolean`                                   | Focus the first invalid field (with its `ref` attached) when a submit fails. Default `true`.                                 |
| `skipUnregister`          | `boolean`                                   | Keep the values of fields that unmount. Default `false`.                                                                     |
| `reinitializeOnSubmit`    | `boolean`                                   | After a successful submit, reset the form to `initialValues` (e.g. to clear a change-password form).                         |
| `skipUnusedInitialValues` | `boolean`                                   | Leave initial values that don't belong to a rendered field out of the submitted values.                                      |

After a successful submit, the submitted values become the new initial values, so the form is no longer dirty. If `onSubmit` returns a promise that resolves to `false`, the initial values are left unchanged.

Returns:

| Property                                                                      | Description                                                                                                                      |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `handleSubmit(event?)`                                                        | Validates and submits. Pass it to `<form onSubmit>` or call it directly.                                                         |
| `formState`                                                                   | `isSubmitting`, `isSubmitted`, `isSubmitSuccessful`, `submitCount`, `isValidating`, `isValid`, `isDirty`, `errors`, `formErrors` |
| `handleReset()`                                                               | Resets all fields back to the initial values.                                                                                    |
| `resetInitialValues(values?, extraInfos?)`                                    | Replaces the initial values and resets all fields to them.                                                                       |
| `validateFields(names)`                                                       | Validates the given fields or field arrays and returns the errors.                                                               |
| `validateAllFields()`                                                         | Validates every field and returns the errors.                                                                                    |
| `validateFieldsAsync` / `validateAllFieldsAsync`                              | The same, waiting for async validators.                                                                                          |
| `setError(name, message)` / `clearErrors(names?)` / `setFormErrors(messages)` | Show or clear errors, e.g. from your server.                                                                                     |
| `setFocus(name)`                                                              | Focuses a field whose `ref` is attached.                                                                                         |
| `getValues()`                                                                 | Returns `{ values, extraInfos }`.                                                                                                |

### `useField<Value, ExtraInfo>(options)`

| Option               | Type                                            | Description                                                        |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| `name`               | `string`                                        | Field path.                                                        |
| `ancestors`          | `{ name: string; rowId: number }[]`             | Required for fields inside field arrays, outermost array first.    |
| `defaultValue`       | `Value`                                         | Used when there is no initial value.                               |
| `validate`           | `(value, other) => string \| null \| undefined` | Validator, read once when the field mounts. Can be async.          |
| `schema`             | `StandardSchemaV1`                              | A schema for this value. Runs before `validate`.                   |
| `debounceValidation` | `number`                                        | Milliseconds to wait after the last change before validating.      |
| `validateCallback`   | same as `validate`                              | Memoized validator that may change over time.                      |
| `depFields`          | `(string \| { name, ancestors })[]`             | Fields whose values are passed to the validator as `other.values`. |
| `skipUnregister`     | `boolean`                                       | Keep the value when this field unmounts.                           |

Returns `{ fieldValue, setFieldValue(value, extraInfo?), extraInfo, error, touched, onBlur, isValidating, isDirty, ref }`. `error` is only set once the field is touched (or as `mode` says). Attach `ref` to the input so a failed submit can focus it.

### `useFieldArray(options)`

| Option           | Type                                        | Description                                                                                    |
| ---------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `name`           | `string`                                    | Field array path.                                                                              |
| `fieldNames`     | `(string \| { name, type, fieldNames? })[]` | The fields in each row. Strings are plain fields; use `type: 'field-array'` for nested arrays. |
| `ancestors`      | `{ name: string; rowId: number }[]`         | Required for nested field arrays.                                                              |
| `validate`       | `(rows) => string \| null \| undefined`     | Validator for the whole array. Can be async. Define it outside the component or memoize it.    |
| `schema`         | `StandardSchemaV1`                          | A schema for the rows, e.g. `z.array(...).min(1)`.                                             |
| `defaultValue`   | `object[]`                                  | Rows used when there is no initial value.                                                      |
| `skipUnregister` | `boolean`                                   | Keep the rows when this field array unmounts.                                                  |

Returns:

| Property                                     | Description                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `fieldArrayProps.rowIds`                     | Row ids in display order. Render one row per id.                                                        |
| `append(...rows)`                            | Adds rows at the end.                                                                                   |
| `prepend(...rows)`                           | Adds rows at the start.                                                                                 |
| `insert(index, ...rows)`                     | Inserts rows at `index`.                                                                                |
| `update(index, row)`                         | Replaces a row's values, keeping its id.                                                                |
| `swap(a, b)` / `move(from, to)`              | Reorders rows. Rows keep their ids and state.                                                           |
| `remove(index)`                              | Removes the row at `index`, or `remove([i, j])` several rows.                                           |
| `clear(index)`                               | Clears the values of the row at `index`.                                                                |
| `removeAll()`                                | Removes every row.                                                                                      |
| `getFieldArrayValue()`                       | Returns the current rows.                                                                               |
| `setFieldArrayValue(rows)` / `replace(rows)` | Replaces all rows.                                                                                      |
| `validateData()`                             | Validates the rows and returns `{ errors, isValid }`. `validateDataAsync()` waits for async validators. |
| `error`                                      | Error from the array's `validate` or `schema`, or the form schema.                                      |
| `isValidating`                               | The array's async validator is running.                                                                 |

### `useFormContext()`

Returns `{ setValue, getValue, setFieldValues, getValues, getValuesAndExtraInfo, checkIsDirty, removeFields, resetInitialValues, validateAllFields, validateAllFieldsAsync, setError, clearErrors, setFormErrors, setFocus }`.

- `setValue(name | { name, type, ancestors }, { value?, extraInfo? })` sets a field or a whole field array.
- `getValue({ name, type, ancestors? })` returns `{ value, extraInfo }`.
- `setFieldValues([{ name, value, extraInfo?, ancestors? }])` sets several fields (not field arrays) at once.
- `getValues()` and `getValuesAndExtraInfo()` return `{ values, extraInfos }`.
- `checkIsDirty(options?)` returns whether the values differ from the initial values.
- `removeFields({ fieldNames })` clears the given fields.
- `resetInitialValues(values?, extraInfos?)` and `validateAllFields()` work like the `useForm` versions.

### Watch hooks

| Hook                                                                    | Returns                                                                |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `useFieldWatch({ fieldNames })`                                         | `{ values, extraInfos }` for those fields, nested like the form values |
| `useFieldArrayColumnWatch({ fieldArrayName, fieldNames?, ancestors? })` | `{ values, extraInfos }` as arrays of rows                             |
| `useFormValues()`                                                       | All form values                                                        |
| `useFormValuesAndExtraInfos()`                                          | `{ values, extraInfos }`                                               |
| `useInitialValues()`                                                    | The current initial values                                             |
| `useIsDirty({ preCompareUpdateFormValues? })`                           | `boolean`                                                              |
| `useSetFormProps()`                                                     | Setter for the form-level `{ validate }`                               |

`preCompareUpdateFormValues(values)` lets you adjust the values before they are compared with the initial values, e.g. to ignore a field.

`useFormContext`, `useFieldWatch`, `useFieldArrayColumnWatch`, `useFormValues`, `useFormValuesAndExtraInfos`, `useInitialValues` and `useSetFormProps` also accept a `formId`, to use them outside the form's `FormProvider` (see [Using a form from outside its provider](#using-a-form-from-outside-its-provider)).

### `<Field>`

A component wrapper around `useField` for simple inputs. It takes the same options as `useField`, plus `required` (adds a "Required" validator when there is no `validate`) and `handleChange(value)`.

```tsx
import { Field } from 'wit-form';

// A child element receives value, onChange(event), onBlur, error, touched and extraInfo
<Field name="email" required>
  <MyInput />
</Field>

// A render function's onChange receives the value directly
<Field name="agree">
  {({ value, onChange, error }) => (
    <input type="checkbox" checked={!!value} onChange={() => onChange(!value)} />
  )}
</Field>
```

### `<FormProvider options>` / `withFormProvider(Component, options)`

| Option               | Description                                                                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `formId`             | A fixed id for the form. Only needed to use the form from outside its provider.                                                                          |
| `skipJotaiProvider`  | Keep the form's atoms in the surrounding Jotai `<Provider>` (or the default store) instead of a new store.                                               |
| `skipValuesObserver` | Turn off live tracking of the whole form's values. `useFormValues` and `useIsDirty` stop updating, but typing gets slightly cheaper on very large forms. |

## Recipes

### Editing an existing record

```tsx
function EditUser({ user }: { user: User }) {
  const { handleSubmit } = useForm({ initialValues: user, onSubmit: save });
  // ...
}
```

`initialValues` is applied when the form mounts. To load values later, e.g. after a fetch finishes, call `resetInitialValues(data)` from `useForm` or `useFormContext`.

### Multi-step form

Set `skipUnregister: true` so values from hidden steps are kept, and validate each step before moving on:

```tsx
const { handleSubmit, validateFields } = useForm({
  onSubmit,
  skipUnregister: true,
});

const next = () => {
  if (!validateFields(stepFields[step]).length) setStep(step + 1);
};
```

### Save button that is only enabled when something changed

```tsx
function SaveButton() {
  const isDirty = useIsDirty();
  return (
    <button type="submit" disabled={!isDirty}>
      Save
    </button>
  );
}
```

### Using a form from outside its provider

Give the form a `formId` and share the Jotai store with `skipJotaiProvider`:

```tsx
<FormProvider options={{ formId: 'checkout', skipJotaiProvider: true }}>
  <CheckoutForm />
</FormProvider>;

// Rendered elsewhere in the app, outside the FormProvider
function OrderSummary() {
  const values = useFormValues({ formId: 'checkout' });
  return <div>{values.items?.length ?? 0} items</div>;
}
```

### Migrating from react-recoil-form

Wit Form is a drop-in replacement for [react-recoil-form](https://github.com/witbybit/react-recoil-form) on React 18+: replace the `recoil` dependency with `jotai` and change imports from `react-recoil-form` to `wit-form`. `skipRecoilRoot` still works as an alias of `skipJotaiProvider`.

## Development

This repo uses [pnpm](https://pnpm.io); the version is pinned in `package.json`.

```sh
pnpm install
pnpm test          # run tests
pnpm run typecheck # type check
pnpm run build     # build to dist/
pnpm docs:dev      # run the docs site, with live examples, from docs/
```

`pnpm-workspace.yaml` turns on pnpm's supply-chain protections: new package versions are only installed once they are 3 days old, installs fail if a package's publish trust gets weaker, and dependency install scripts are blocked unless allowed.

## License

MIT
