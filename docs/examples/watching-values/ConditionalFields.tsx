'use client';

import { useState } from 'react';
import { useFieldWatch, useForm, withFormProvider } from 'wit-form';
import {
  CheckboxField,
  SelectField,
  TextAreaField,
  TextField,
} from '../components/fields';
import { Button, Card, Example, FormInspector } from '../components/ui';

const contactMethods = [
  { label: 'Email', value: 'email' },
  { label: 'Phone call', value: 'phone' },
  { label: "Don't contact me", value: 'none' },
];

const topics = [
  { label: 'Billing question', value: 'billing' },
  { label: 'Bug report', value: 'bug' },
  { label: 'Something else', value: 'other' },
];

const validateEmail = (value?: string) =>
  value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ? 'Enter a valid email address'
    : null;

/**
 * Watches one field and renders the follow-up questions for it. Only this component
 * re-renders when `contactMethod` changes, not the whole form.
 */
function ContactDetails() {
  const { values } = useFieldWatch({ fieldNames: ['contactMethod'] });
  switch (values.contactMethod) {
    case 'email':
      return (
        <TextField
          name="email"
          label="Email"
          type="email"
          required
          validate={validateEmail}
        />
      );
    case 'phone':
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="phone" label="Phone number" type="tel" required />
          <SelectField
            name="bestTime"
            label="Best time to call"
            options={[
              { label: 'Morning', value: 'morning' },
              { label: 'Afternoon', value: 'afternoon' },
            ]}
          />
        </div>
      );
    default:
      return null;
  }
}

function BugDetails() {
  const { values } = useFieldWatch({
    fieldNames: ['topic', 'bug.canReproduce'],
  });
  if (values.topic !== 'bug') return null;
  return (
    <div className="space-y-4 rounded-lg bg-slate-50 p-4">
      <TextField
        name="bug.version"
        label="App version"
        placeholder="e.g. 4.2.1"
      />
      <CheckboxField name="bug.canReproduce" label="I can reproduce it" />
      {values.bug?.canReproduce && (
        <TextAreaField
          name="bug.steps"
          label="Steps to reproduce"
          required
          rows={4}
        />
      )}
    </div>
  );
}

function SupportForm() {
  const [submitted, setSubmitted] = useState<unknown>();
  const { handleSubmit } = useForm({
    initialValues: { contactMethod: 'email' },
    onSubmit: (values) => setSubmitted(values),
  });

  return (
    <Example aside={<FormInspector submitted={submitted} />}>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <SelectField name="topic" label="Topic" options={topics} required />
          <BugDetails />
          <TextAreaField name="message" label="How can we help?" required />
          <SelectField
            name="contactMethod"
            label="How should we reply?"
            options={contactMethods}
            required
          />
          <ContactDetails />
          <Button type="submit" variant="primary">
            Send request
          </Button>
        </form>
      </Card>
    </Example>
  );
}

export default withFormProvider(SupportForm);
