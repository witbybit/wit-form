'use client';

import { useEffect, useState } from 'react';
import {
  useForm,
  useFormContext,
  useIsDirty,
  withFormProvider,
} from 'wit-form';
import { CheckboxField, SelectField, TextField } from '../components/fields';
import {
  Alert,
  Button,
  Card,
  Example,
  FormInspector,
  sleep,
} from '../components/ui';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  notifications: { email: boolean; sms: boolean };
}

// A tiny fake API
const db: Record<string, User> = {
  u1: {
    id: 'u1',
    name: 'Grace Hopper',
    email: 'grace@example.com',
    role: 'admin',
    notifications: { email: true, sms: false },
  },
  u2: {
    id: 'u2',
    name: 'Alan Turing',
    email: 'alan@example.com',
    role: 'editor',
    notifications: { email: false, sms: true },
  },
};

const api = {
  async getUser(id: string) {
    await sleep(500);
    return structuredClone(db[id]);
  },
  async saveUser(user: User, fail: boolean) {
    await sleep(700);
    if (fail) throw new Error('The server is unavailable. Try again.');
    db[user.id] = structuredClone(user);
  },
};

const roles = [
  { label: 'Admin', value: 'admin' },
  { label: 'Editor', value: 'editor' },
  { label: 'Viewer', value: 'viewer' },
];

/** Re-renders only when the dirty state changes */
function SaveBar(props: { isSubmitting: boolean; onDiscard: () => void }) {
  const isDirty = useIsDirty();
  return (
    <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
      <Button
        type="submit"
        variant="primary"
        disabled={!isDirty || props.isSubmitting}
      >
        {props.isSubmitting ? 'Saving…' : 'Save changes'}
      </Button>
      <Button
        variant="ghost"
        disabled={!isDirty || props.isSubmitting}
        onClick={props.onDiscard}
      >
        Discard
      </Button>
      <span className="text-xs text-slate-500">
        {isDirty ? 'You have unsaved changes' : 'All changes saved'}
      </span>
    </div>
  );
}

function UserEditor() {
  const [userId, setUserId] = useState('u1');
  const [loading, setLoading] = useState(true);
  const [failNextSave, setFailNextSave] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<unknown>();
  const { checkIsDirty } = useFormContext();

  const { handleSubmit, handleReset, resetInitialValues, formState } = useForm({
    onSubmit: async (values: User) => {
      setSaveError(null);
      try {
        await api.saveUser(values, failNextSave);
        setSubmitted(values);
        return true;
      } catch (err) {
        setSaveError((err as Error).message);
        // Resolving to false keeps the old initial values, so the form stays dirty
        return false;
      }
    },
  });

  // Load the record, then make it the form's initial values
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getUser(userId).then((user) => {
      if (cancelled) return;
      resetInitialValues(user);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const switchUser = (id: string) => {
    if (checkIsDirty() && !window.confirm('Discard your unsaved changes?'))
      return;
    setSaveError(null);
    setUserId(id);
  };

  return (
    <Example aside={<FormInspector submitted={submitted} />}>
      <Card>
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {Object.values(db).map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => switchUser(user.id)}
                className={`rounded-md px-3 py-1 text-sm ${
                  userId === user.id
                    ? 'bg-white font-medium shadow-sm'
                    : 'text-slate-600'
                }`}
              >
                {user.name}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              className="accent-emerald-600"
              checked={failNextSave}
              onChange={(e) => setFailNextSave(e.target.checked)}
            />
            Fail the next save
          </label>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <fieldset
            disabled={loading}
            className={`space-y-4 ${loading ? 'animate-pulse opacity-50' : ''}`}
          >
            {saveError && (
              <Alert tone="error" title="Couldn't save">
                {saveError}
              </Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="name" label="Name" required />
              <TextField name="email" label="Email" type="email" required />
            </div>
            <SelectField name="role" label="Role" options={roles} required />
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium text-slate-700">
                Notifications
              </legend>
              <CheckboxField name="notifications.email" label="Email" />
              <CheckboxField name="notifications.sms" label="SMS" />
            </fieldset>
          </fieldset>
          <SaveBar
            isSubmitting={formState.isSubmitting}
            onDiscard={() => {
              handleReset();
              setSaveError(null);
            }}
          />
        </form>
      </Card>
    </Example>
  );
}

export default withFormProvider(UserEditor);
