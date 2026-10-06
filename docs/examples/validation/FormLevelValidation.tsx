'use client';

import { useState } from 'react';
import { useForm, withFormProvider, type IFieldError } from 'wit-form';
import { NumberField, SelectField, TextField } from '../components/fields';
import { Alert, Button, Card, Example, FormInspector } from '../components/ui';

interface Booking {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: { adults?: number; children?: number };
}

const MAX_GUESTS = 6;
const MAX_NIGHTS = 14;

/**
 * Form-level validation receives every value and returns a list of messages.
 * It runs on submit, together with the field validators. Use it for rules that
 * don't belong to any single field.
 */
function validateBooking(values: Booking): string[] {
  const errors: string[] = [];
  if (values.checkIn && values.checkOut) {
    const nights =
      (Date.parse(values.checkOut) - Date.parse(values.checkIn)) / 86_400_000;
    if (nights <= 0) errors.push('Check-out must be after check-in.');
    else if (nights > MAX_NIGHTS)
      errors.push(`Stays are limited to ${MAX_NIGHTS} nights.`);
  }
  const adults = values.guests?.adults ?? 0;
  const children = values.guests?.children ?? 0;
  if (adults + children > MAX_GUESTS)
    errors.push(`A room fits at most ${MAX_GUESTS} guests.`);
  if (children > 0 && adults === 0)
    errors.push('Children must travel with at least one adult.');
  return errors;
}

const validateCount = (value?: number) =>
  value !== undefined && (value < 0 || !Number.isInteger(value))
    ? 'Enter a whole number'
    : null;

const destinations = [
  { label: 'Lisbon', value: 'lisbon' },
  { label: 'Kyoto', value: 'kyoto' },
  { label: 'Cape Town', value: 'cape-town' },
];

function BookingForm() {
  const [submitted, setSubmitted] = useState<unknown>();
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<IFieldError[]>([]);

  const { handleSubmit } = useForm({
    initialValues: {
      checkIn: '2026-11-20',
      checkOut: '2026-11-18',
      guests: { adults: 0, children: 2 },
    },
    validate: validateBooking,
    onSubmit: (values) => {
      setFormErrors([]);
      setFieldErrors([]);
      setSubmitted(values);
    },
    onError: (fieldErrors, formErrors) => {
      setFieldErrors(fieldErrors ?? []);
      setFormErrors(formErrors ?? []);
    },
  });

  const hasErrors = formErrors.length > 0 || fieldErrors.length > 0;

  return (
    <Example aside={<FormInspector submitted={submitted} />}>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {hasErrors && (
            <Alert tone="error" title="We couldn't book this stay">
              <ul className="list-disc pl-5">
                {formErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
                {fieldErrors.map((e) => (
                  <li key={e.name}>
                    <code>{e.name}</code>: {e.error}
                  </li>
                ))}
              </ul>
            </Alert>
          )}
          <SelectField
            name="destination"
            label="Destination"
            options={destinations}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="checkIn" label="Check-in" type="date" required />
            <TextField name="checkOut" label="Check-out" type="date" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              name="guests.adults"
              label="Adults"
              min={0}
              validate={validateCount}
            />
            <NumberField
              name="guests.children"
              label="Children"
              min={0}
              validate={validateCount}
            />
          </div>
          <Button type="submit" variant="primary">
            Book now
          </Button>
        </form>
      </Card>
    </Example>
  );
}

export default withFormProvider(BookingForm);
