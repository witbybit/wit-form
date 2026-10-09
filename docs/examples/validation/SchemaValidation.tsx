'use client';

import { useMemo, useState } from 'react';
import {
  useFieldArray,
  useForm,
  withFormProvider,
  type IAncestorInput,
} from 'wit-form';
import { z } from 'zod';
import { NumberField, TextField } from '../components/fields';
import { Alert, Button, Card, Example, FormInspector } from '../components/ui';

// One schema for the whole form. Any Standard Schema library works the same way:
// Zod, Valibot, ArkType, Effect Schema or Yup 1.7+.
const tripSchema = z
  .object({
    name: z.string('Give the trip a name').min(1, 'Give the trip a name'),
    contact: z.object({
      email: z.email('Enter a valid email address'),
    }),
    travelers: z
      .array(
        z.object({
          name: z.string('Required').min(1, 'Required'),
          age: z.number('Enter an age').int('Enter a whole number').min(0),
        })
      )
      .min(1, 'Add at least one traveler'),
    budget: z.number('Enter a budget').positive('Enter a budget'),
  })
  // A rule across fields. Its error has no field, so it becomes a form error.
  .refine((trip) => trip.travelers.length <= trip.budget / 100, {
    message: 'Plan at least $100 per traveler',
  });

function Traveler(props: { rowId: number; onRemove: () => void }) {
  const ancestors = useMemo<IAncestorInput[]>(
    () => [{ name: 'travelers', rowId: props.rowId }],
    [props.rowId]
  );
  return (
    <div className="flex items-start gap-2">
      <TextField
        name="name"
        label="Name"
        hideLabel
        placeholder="Name"
        ancestors={ancestors}
        className="flex-1"
      />
      <NumberField
        name="age"
        label="Age"
        hideLabel
        placeholder="Age"
        ancestors={ancestors}
        className="w-24"
      />
      <Button variant="ghost" onClick={props.onRemove}>
        Remove
      </Button>
    </div>
  );
}

function TripForm() {
  const [submitted, setSubmitted] = useState<unknown>();
  const { handleSubmit, handleReset, formState } = useForm({
    initialValues: { travelers: [{ name: '' }] },
    // Errors appear on the matching fields, including rows of the travelers list
    schema: tripSchema,
    onSubmit: (values) => setSubmitted(values),
  });
  const { fieldArrayProps, append, remove, error } = useFieldArray({
    name: 'travelers',
    fieldNames: ['name', 'age'],
  });

  return (
    <Example aside={<FormInspector submitted={submitted} showStatus />}>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formState.formErrors.length > 0 && (
            <Alert tone="error" title="Check your trip">
              {formState.formErrors.join(' ')}
            </Alert>
          )}
          <TextField name="name" label="Trip name" />
          <TextField name="contact.email" label="Contact email" type="email" />
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium text-slate-700">
              Travelers
            </legend>
            {fieldArrayProps.rowIds.map((rowId, index) => (
              <Traveler
                key={rowId}
                rowId={rowId}
                onRemove={() => remove(index)}
              />
            ))}
            {error && <p className="text-xs text-red-600">{error}</p>}
            <Button size="sm" onClick={() => append()}>
              Add traveler
            </Button>
          </fieldset>
          <NumberField name="budget" label="Budget" prefix="$" />
          <div className="flex gap-3">
            <Button type="submit" variant="primary">
              Plan trip
            </Button>
            <Button variant="ghost" onClick={() => handleReset()}>
              Reset
            </Button>
          </div>
        </form>
      </Card>
    </Example>
  );
}

export default withFormProvider(TripForm);
