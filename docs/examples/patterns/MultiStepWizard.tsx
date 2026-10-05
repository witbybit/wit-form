'use client';

import { useState } from 'react';
import {
  useForm,
  useFormValuesAndExtraInfos,
  withFormProvider,
} from 'wit-form';
import {
  CheckboxField,
  NumberField,
  SelectField,
  TextField,
} from '../components/fields';
import {
  Alert,
  Button,
  Card,
  Example,
  FormInspector,
  sleep,
} from '../components/ui';

const plans = [
  { label: 'Starter: $9/month', value: 'starter' },
  { label: 'Team: $29/month', value: 'team' },
  { label: 'Business: $99/month', value: 'business' },
];

const validateEmail = (value?: string) =>
  value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ? 'Enter a valid email address'
    : null;

const validateSlug = (value?: string) =>
  value && !/^[a-z0-9-]+$/.test(value)
    ? 'Use lowercase letters, numbers and dashes'
    : null;

const validateSeats = (value?: number) =>
  value !== undefined && (value < 1 || value > 500)
    ? 'Between 1 and 500 seats'
    : null;

const steps = [
  { title: 'Account', fields: ['name', 'email'] },
  { title: 'Workspace', fields: ['workspace.name', 'workspace.slug'] },
  { title: 'Plan', fields: ['plan', 'seats'] },
  { title: 'Review', fields: ['acceptTerms'] },
];

function AccountStep() {
  return (
    <>
      <TextField name="name" label="Your name" required autoComplete="name" />
      <TextField
        name="email"
        label="Work email"
        type="email"
        required
        validate={validateEmail}
      />
    </>
  );
}

function WorkspaceStep() {
  return (
    <>
      <TextField name="workspace.name" label="Workspace name" required />
      <TextField
        name="workspace.slug"
        label="Workspace URL"
        required
        hint="Lowercase letters, numbers and dashes"
        validate={validateSlug}
      />
    </>
  );
}

function PlanStep() {
  return (
    <>
      <SelectField name="plan" label="Plan" options={plans} required />
      <NumberField
        name="seats"
        label="Seats"
        min={1}
        defaultValue={5}
        required
        validate={validateSeats}
      />
    </>
  );
}

/** Reads values from every step, including the ones that are no longer rendered */
function ReviewStep() {
  const { values, extraInfos } = useFormValuesAndExtraInfos();
  const rows = [
    ['Name', values.name],
    ['Email', values.email],
    ['Workspace', `${values.workspace?.name} (${values.workspace?.slug})`],
    ['Plan', extraInfos.plan?.label ?? values.plan],
    ['Seats', values.seats],
  ];
  return (
    <>
      <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between px-4 py-2">
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <CheckboxField
        name="acceptTerms"
        label="I agree to the terms of service"
        required
      />
    </>
  );
}

const stepComponents = [AccountStep, WorkspaceStep, PlanStep, ReviewStep];

function SignupWizard() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState<unknown>();

  const { handleSubmit, validateFields, formState } = useForm({
    // Keep the values of steps that are no longer rendered
    skipUnregister: true,
    onSubmit: async (values) => {
      await sleep(800);
      setSubmitted(values);
    },
  });

  const isLastStep = step === steps.length - 1;
  const StepComponent = stepComponents[step];

  const next = () => {
    // Validate only the current step's fields. Failing fields are marked as touched.
    const errors = validateFields(steps[step].fields);
    if (errors.length === 0) setStep(step + 1);
  };

  return (
    <Example aside={<FormInspector submitted={submitted} showExtraInfos />}>
      <Card>
        <ol className="mb-6 flex gap-2 text-xs font-medium">
          {steps.map((s, index) => (
            <li
              key={s.title}
              aria-current={index === step ? 'step' : undefined}
              className={`flex-1 border-t-4 pt-2 ${
                index <= step
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-slate-200 text-slate-400'
              }`}
            >
              {index + 1}. {s.title}
            </li>
          ))}
        </ol>

        {submitted ? (
          <Alert tone="success" title="Workspace created">
            Welcome aboard! Check the submitted values on the right.
          </Alert>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isLastStep) handleSubmit();
              else next();
            }}
            className="space-y-4"
            noValidate
          >
            <StepComponent />
            <div className="flex justify-between border-t border-slate-200 pt-4">
              <Button
                variant="ghost"
                disabled={step === 0}
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={formState.isSubmitting}
              >
                {isLastStep
                  ? formState.isSubmitting
                    ? 'Creating…'
                    : 'Create workspace'
                  : 'Continue'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </Example>
  );
}

export default withFormProvider(SignupWizard);
