'use client';

import { useState } from 'react';
import { useForm, withFormProvider, type IFieldError } from 'wit-form';
import {
  CheckboxField,
  NumberField,
  SelectField,
  TextField,
} from '../components/fields';
import { Alert, Button, Card, Example, FormInspector } from '../components/ui';

// Validators return an error message, or null when the value is valid.
// Keep them outside components (or memoize them): `validate` is read once, when the field mounts.
const validateUsername = (value?: string) => {
  if (!value) return null; // `required` is checked separately
  if (value.length < 3) return 'Use at least 3 characters';
  if (value.length > 20) return 'Use 20 characters or fewer';
  if (!/^[a-z0-9_]+$/i.test(value))
    return 'Only letters, numbers and underscores';
  return null;
};

const validateEmail = (value?: string) =>
  value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ? 'Enter a valid email address'
    : null;

const validateAge = (value?: number) => {
  if (value === undefined) return null;
  if (!Number.isInteger(value)) return 'Enter a whole number';
  return value < 18 ? 'You must be 18 or older' : null;
};

const validateWebsite = (value?: string) => {
  if (!value) return null;
  try {
    new URL(value);
    return null;
  } catch {
    return 'Enter a full URL, like https://example.com';
  }
};

const roles = [
  { label: 'Developer', value: 'developer' },
  { label: 'Designer', value: 'designer' },
  { label: 'Product manager', value: 'pm' },
];

function AccountForm() {
  const [submitted, setSubmitted] = useState<unknown>();
  const [errors, setErrors] = useState<IFieldError[]>([]);

  const { handleSubmit, handleReset } = useForm({
    onSubmit: (values) => {
      setErrors([]);
      setSubmitted(values);
    },
    // Called instead of onSubmit when any field is invalid
    onError: (fieldErrors) => setErrors(fieldErrors ?? []),
  });

  return (
    <Example aside={<FormInspector submitted={submitted} />}>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {errors.length > 0 && (
            <Alert
              tone="error"
              title={`Please fix ${errors.length} field${errors.length > 1 ? 's' : ''}`}
            >
              {errors.map((e) => e.name).join(', ')}
            </Alert>
          )}
          <TextField
            name="username"
            label="Username"
            required
            validate={validateUsername}
            hint="3–20 letters, numbers or underscores"
          />
          <TextField
            name="email"
            label="Email"
            type="email"
            required
            validate={validateEmail}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              name="age"
              label="Age"
              required
              validate={validateAge}
            />
            <SelectField name="role" label="Role" options={roles} required />
          </div>
          <TextField
            name="website"
            label="Website"
            type="url"
            placeholder="https://"
            validate={validateWebsite}
            hint="Optional"
          />
          <CheckboxField
            name="acceptTerms"
            label="I accept the terms of service"
            required
          />
          <div className="flex gap-3">
            <Button type="submit" variant="primary">
              Create account
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                handleReset();
                setErrors([]);
              }}
            >
              Reset
            </Button>
          </div>
        </form>
      </Card>
    </Example>
  );
}

export default withFormProvider(AccountForm);
