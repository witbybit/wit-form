import { useState } from 'react';
import { useFieldWatch, useForm, withFormProvider } from 'wit-form';
import { TextField } from '../components/fields';
import {
  Alert,
  Button,
  Card,
  Example,
  FormInspector,
  sleep,
} from '../components/ui';

const passwordRules = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'An uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'A number', test: (v: string) => /\d/.test(v) },
];

const validateNewPassword = (
  value?: string,
  other?: { values: { currentPassword?: string } }
) => {
  if (!value) return null;
  const failed = passwordRules.find((rule) => !rule.test(value));
  if (failed) return `Needs ${failed.label.toLowerCase()}`;
  if (value === other?.values.currentPassword)
    return 'Must be different from your current password';
  return null;
};

// `other.values` holds the fields listed in `depFields`, and the field
// re-validates whenever one of them changes
const validateConfirmation = (
  value?: string,
  other?: { values: { newPassword?: string } }
) =>
  value && value !== other?.values.newPassword
    ? 'Passwords do not match'
    : null;

/** Live checklist. Only this component re-renders as the password changes. */
function PasswordChecklist() {
  const { values } = useFieldWatch({ fieldNames: ['newPassword'] });
  const password: string = values.newPassword ?? '';
  return (
    <ul className="space-y-1 text-xs">
      {passwordRules.map((rule) => {
        const ok = rule.test(password);
        return (
          <li
            key={rule.label}
            className={ok ? 'text-emerald-700' : 'text-slate-500'}
          >
            {ok ? '✓' : '○'} {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

function ChangePasswordForm() {
  const [submitted, setSubmitted] = useState<unknown>();
  const [saved, setSaved] = useState(false);

  const { handleSubmit, formState } = useForm({
    // Clear every field after a successful submit
    reinitializeOnSubmit: true,
    onSubmit: async (values) => {
      setSaved(false);
      await sleep(600);
      setSubmitted(values);
      setSaved(true);
    },
  });

  return (
    <Example
      title="Change password"
      description="The new password can't match the current one, and the confirmation must match the new password. Change the new password after confirming it and the confirmation re-validates."
      aside={<FormInspector submitted={submitted} />}
    >
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {saved && <Alert tone="success" title="Password updated" />}
          <TextField
            name="currentPassword"
            label="Current password"
            type="password"
            autoComplete="current-password"
            required
          />
          <div className="space-y-2">
            <TextField
              name="newPassword"
              label="New password"
              type="password"
              autoComplete="new-password"
              required
              depFields={['currentPassword']}
              validate={validateNewPassword}
            />
            <PasswordChecklist />
          </div>
          <TextField
            name="confirmPassword"
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            required
            depFields={['newPassword']}
            validate={validateConfirmation}
          />
          <Button
            type="submit"
            variant="primary"
            disabled={formState.isSubmitting}
          >
            {formState.isSubmitting ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </Card>
    </Example>
  );
}

export default withFormProvider(ChangePasswordForm);
