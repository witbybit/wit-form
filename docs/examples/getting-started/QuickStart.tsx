'use client';

import { useState } from 'react';
import { FormProvider, useField, useForm } from 'wit-form';
import { Button, Card, Example, FormInspector, sleep } from '../components/ui';

/**
 * A field component. `useField` subscribes it to a single field, so typing here
 * re-renders this input and nothing else.
 */
function TextField(props: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  const { fieldValue, setFieldValue, onBlur, error } = useField<string>({
    name: props.name,
    validate: (value) => (props.required && !value ? 'Required' : null),
  });

  return (
    <div>
      <label
        htmlFor={props.name}
        className="mb-1 block text-sm font-medium text-slate-700"
      >
        {props.label}
      </label>
      <input
        id={props.name}
        type={props.type ?? 'text'}
        className="block w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        value={fieldValue ?? ''}
        onChange={(e) => setFieldValue(e.target.value)}
        onBlur={onBlur}
      />
      {/* `error` is only set once the field is touched (blurred or submitted) */}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function SignupForm() {
  const [submitted, setSubmitted] = useState<unknown>();

  const { handleSubmit, formState } = useForm({
    initialValues: { name: 'Jane Doe', address: { country: 'Canada' } },
    // Returning a promise keeps `formState.isSubmitting` true until it settles
    onSubmit: async (values) => {
      await sleep(800);
      setSubmitted(values);
    },
  });

  return (
    <Example aside={<FormInspector submitted={submitted} />}>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <TextField name="name" label="Full name" required />
          <TextField name="email" label="Email" type="email" required />
          {/* Dot paths build nested values: { address: { city, country } } */}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="address.city" label="City" />
            <TextField name="address.country" label="Country" />
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={formState.isSubmitting}
          >
            {formState.isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      </Card>
    </Example>
  );
}

// Every form lives inside a FormProvider, including the component that calls useForm
export default function QuickStart() {
  return (
    <FormProvider>
      <SignupForm />
    </FormProvider>
  );
}
