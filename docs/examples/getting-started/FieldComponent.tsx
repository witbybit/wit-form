'use client';

import { useState, type ChangeEvent } from 'react';
import { Field, useForm, withFormProvider } from 'wit-form';
import { Button, Card, Example, FormInspector } from '../components/ui';

/**
 * A plain input with no form logic. When it's the child of <Field>, it receives
 * value, onChange(event), onBlur, error, touched and extraInfo as props.
 */
function Input(props: {
  label: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  error?: string | null;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {props.label}
      </span>
      <input
        className="block w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        value={props.value}
        onChange={props.onChange}
        onBlur={props.onBlur}
      />
      {props.error && (
        <span className="mt-1 block text-xs text-red-600">{props.error}</span>
      )}
    </label>
  );
}

const frequencies = ['Daily', 'Weekly', 'Monthly'];

function NewsletterForm() {
  const [submitted, setSubmitted] = useState<unknown>();
  const { handleSubmit } = useForm({
    initialValues: { frequency: 'Weekly', topics: { releases: true } },
    onSubmit: (values) => setSubmitted(values),
  });

  return (
    <Example aside={<FormInspector submitted={submitted} />}>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* 1. Clone props into a child element. `required` adds a "Required" validator. */}
          <Field name="email" required>
            <Input label="Email" />
          </Field>

          {/* 2. A render function. Here onChange takes the value directly. */}
          <Field name="frequency">
            {({ value, onChange }) => (
              <fieldset>
                <legend className="mb-1 text-sm font-medium text-slate-700">
                  How often?
                </legend>
                <div className="flex gap-4">
                  {frequencies.map((frequency) => (
                    <label
                      key={frequency}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="radio"
                        className="accent-indigo-600"
                        checked={value === frequency}
                        onChange={() => onChange(frequency)}
                      />
                      {frequency}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </Field>

          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium text-slate-700">
              Topics
            </legend>
            {['releases', 'tutorials', 'events'].map((topic) => (
              <Field key={topic} name={`topics.${topic}`}>
                {({ value, onChange }) => (
                  <label className="flex items-center gap-2 text-sm capitalize">
                    <input
                      type="checkbox"
                      className="accent-indigo-600"
                      checked={!!value}
                      onChange={() => onChange(!value)}
                    />
                    {topic}
                  </label>
                )}
              </Field>
            ))}
          </fieldset>

          <Button type="submit" variant="primary">
            Save preferences
          </Button>
        </form>
      </Card>
    </Example>
  );
}

// withFormProvider wraps the component in a FormProvider
export default withFormProvider(NewsletterForm);
