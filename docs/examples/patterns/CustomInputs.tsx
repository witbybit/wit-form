'use client';

import { useId, useState, type Ref } from 'react';
import { useField, useForm, withFormProvider } from 'wit-form';
import { TextField } from '../components/fields';
import { Button, Card, Example, FormInspector } from '../components/ui';

/*
 * Stand-ins for components from a UI kit (shadcn/ui, Radix, MUI, your design system).
 * They know nothing about forms: they take a value and report changes, like most kits do.
 */

function Switch(props: {
  id?: string;
  ref?: Ref<HTMLButtonElement>;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onBlur?: () => void;
}) {
  return (
    <button
      id={props.id}
      ref={props.ref}
      type="button"
      role="switch"
      aria-checked={props.checked}
      onClick={() => props.onCheckedChange(!props.checked)}
      onBlur={props.onBlur}
      className={`relative h-6 w-11 rounded-full transition ${
        props.checked ? 'bg-emerald-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
          props.checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );
}

function SegmentedControl(props: {
  ref?: Ref<HTMLButtonElement>;
  options: { value: string; label: string }[];
  value: string | undefined;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  'aria-labelledby'?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={props['aria-labelledby']}
      className="inline-flex rounded-lg bg-slate-100 p-1"
    >
      {props.options.map((option, i) => (
        <button
          key={option.value}
          // The first option takes the ref, so the group can be focused
          ref={i === 0 ? props.ref : undefined}
          type="button"
          role="radio"
          aria-checked={props.value === option.value}
          onClick={() => props.onValueChange(option.value)}
          onBlur={props.onBlur}
          className={`rounded-md px-3 py-1 text-sm ${
            props.value === option.value
              ? 'bg-white font-medium shadow-sm'
              : 'text-slate-600'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function TagInput(props: {
  id?: string;
  ref?: Ref<HTMLInputElement>;
  value: string[];
  onValueChange: (tags: string[]) => void;
  onBlur?: () => void;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const tag = draft.trim();
    if (tag && !props.value.includes(tag))
      props.onValueChange([...props.value, tag]);
    setDraft('');
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-white px-2 py-1.5 ring-1 ring-slate-300 focus-within:ring-2 focus-within:ring-emerald-600">
      {props.value.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs"
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            onClick={() =>
              props.onValueChange(props.value.filter((t) => t !== tag))
            }
          >
            ×
          </button>
        </span>
      ))}
      <input
        id={props.id}
        ref={props.ref}
        value={draft}
        placeholder="Type and press Enter"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add();
          }
        }}
        onBlur={() => {
          add();
          props.onBlur?.();
        }}
        className="min-w-32 flex-1 py-0.5 text-sm outline-none"
      />
    </div>
  );
}

/*
 * The adapters. Each one connects a kit component to one field: value in, setFieldValue out.
 * `ref` lets a failed submit focus the field, and `onBlur` decides when its error shows.
 */

function FormSwitch(props: { name: string; label: string }) {
  const id = useId();
  const { fieldValue, setFieldValue, onBlur, ref } = useField<boolean>({
    name: props.name,
    defaultValue: false,
  });
  return (
    <div className="flex items-center justify-between">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {props.label}
      </label>
      <Switch
        id={id}
        ref={ref}
        checked={fieldValue ?? false}
        onCheckedChange={setFieldValue}
        onBlur={onBlur}
      />
    </div>
  );
}

const requireChoice = (value?: string) => (!value ? 'Pick one' : null);

function FormSegmented(props: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  const { fieldValue, setFieldValue, onBlur, error, ref } = useField<string>({
    name: props.name,
    validate: requireChoice,
  });
  return (
    <div>
      <span id={id} className="mb-1 block text-sm font-medium text-slate-700">
        {props.label}
      </span>
      <SegmentedControl
        ref={ref}
        aria-labelledby={id}
        options={props.options}
        value={fieldValue}
        onValueChange={setFieldValue}
        onBlur={onBlur}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const requireTag = (tags?: string[]) =>
  !tags?.length ? 'Add at least one tag' : null;

function FormTags(props: { name: string; label: string }) {
  const id = useId();
  const { fieldValue, setFieldValue, onBlur, error, ref } = useField<string[]>({
    name: props.name,
    defaultValue: [],
    validate: requireTag,
  });
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-medium text-slate-700"
      >
        {props.label}
      </label>
      <TagInput
        id={id}
        ref={ref}
        value={fieldValue ?? []}
        onValueChange={setFieldValue}
        onBlur={onBlur}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function ProjectForm() {
  const [submitted, setSubmitted] = useState<unknown>();
  const { handleSubmit } = useForm({
    initialValues: { name: 'Website relaunch' },
    onSubmit: (values) => setSubmitted(values),
  });

  return (
    <Example aside={<FormInspector submitted={submitted} />}>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <TextField name="name" label="Project name" required />
          <FormSegmented
            name="visibility"
            label="Visibility"
            options={[
              { value: 'private', label: 'Private' },
              { value: 'team', label: 'Team' },
              { value: 'public', label: 'Public' },
            ]}
          />
          <FormTags name="tags" label="Tags" />
          <FormSwitch name="notifications" label="Email me about changes" />
          <Button type="submit" variant="primary">
            Save project
          </Button>
        </form>
      </Card>
    </Example>
  );
}

export default withFormProvider(ProjectForm);
