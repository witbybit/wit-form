'use client';

import { useState } from 'react';
import { useForm, withFormProvider } from 'wit-form';
import { TextField } from '../components/fields';
import { Button, Card, Example, FormInspector, sleep } from '../components/ui';

const takenUsernames = ['admin', 'jane', 'support'];

// Stands in for a request to your server
async function isUsernameAvailable(username: string) {
  await sleep(600);
  return !takenUsernames.includes(username.toLowerCase());
}

// Async validators return a promise of an error message (or null).
// Cheap checks run first, so the server is only asked about plausible names.
const validateUsername = async (value?: string) => {
  if (!value) return null; // `required` is checked separately
  if (value.length < 3) return 'Use at least 3 characters';
  return (await isUsernameAvailable(value))
    ? null
    : `"${value}" is already taken`;
};

const validateEmail = (value?: string) =>
  value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ? 'Enter a valid email address'
    : null;

function SignupForm() {
  const [submitted, setSubmitted] = useState<unknown>();

  const { handleSubmit, handleReset, formState, setError } = useForm({
    onSubmit: async (values) => {
      await sleep(500);
      // Errors that only the server can find: show them on the field
      if (values.email?.endsWith('@example.com')) {
        setError('email', 'This email is already registered');
        return false; // keep the user's edits
      }
      setSubmitted(values);
    },
  });

  // Reading these properties subscribes this component to them, and only to them
  const { isSubmitting, isValidating } = formState;

  return (
    <Example aside={<FormInspector submitted={submitted} showStatus />}>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <TextField
            name="username"
            label="Username"
            required
            validate={validateUsername}
            // Wait until typing pauses before asking the server
            debounceValidation={400}
            hint="Try admin, jane or support"
          />
          <TextField
            name="email"
            label="Email"
            type="email"
            required
            validate={validateEmail}
            hint="The server rejects any @example.com address"
          />
          <div className="flex gap-3">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || isValidating}
            >
              {isSubmitting
                ? 'Creating…'
                : isValidating
                  ? 'Checking…'
                  : 'Create account'}
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

export default withFormProvider(SignupForm);
