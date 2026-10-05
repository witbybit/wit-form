'use client';

import { useState } from 'react';
import { useFieldWatch, useForm, withFormProvider } from 'wit-form';
import { SelectField, TextAreaField, TextField } from '../components/fields';
import { Button, Card, Example, RenderCount } from '../components/ui';

const BIO_LIMIT = 160;

const themes = [
  { label: 'Indigo', value: 'indigo' },
  { label: 'Emerald', value: 'emerald' },
  { label: 'Rose', value: 'rose' },
];

const themeClasses: Record<string, string> = {
  indigo: 'from-indigo-500 to-violet-500',
  emerald: 'from-emerald-500 to-teal-500',
  rose: 'from-rose-500 to-orange-400',
};

const validateBio = (value?: string) =>
  value && value.length > BIO_LIMIT
    ? `Keep it under ${BIO_LIMIT} characters`
    : null;

/** Re-renders only when `bio` changes */
function BioCounter() {
  const { values } = useFieldWatch({ fieldNames: ['bio'] });
  const length = values.bio?.length ?? 0;
  return (
    <p
      className={`text-right text-xs tabular-nums ${
        length > BIO_LIMIT ? 'text-red-600' : 'text-slate-500'
      }`}
    >
      {length}/{BIO_LIMIT} <RenderCount />
    </p>
  );
}

/** Re-renders only when one of the watched fields changes */
function ProfilePreview() {
  const { values, extraInfos } = useFieldWatch({
    fieldNames: ['name', 'headline', 'bio', 'theme', 'links.website'],
  });
  const initials =
    (values.name ?? '')
      .split(' ')
      .map((part: string) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div
        className={`h-20 bg-gradient-to-r ${
          themeClasses[values.theme] ?? themeClasses.indigo
        }`}
      />
      <div className="-mt-8 space-y-2 p-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-slate-800 text-lg font-semibold text-white">
          {initials}
        </div>
        <p className="text-lg font-semibold">{values.name || 'Your name'}</p>
        <p className="text-sm text-slate-600">
          {values.headline || 'Your headline'}
        </p>
        {values.bio && <p className="text-sm text-slate-700">{values.bio}</p>}
        {values.links?.website && (
          <p className="truncate text-sm text-indigo-600">
            {values.links.website}
          </p>
        )}
        <p className="pt-2 text-xs text-slate-400">
          Theme: {extraInfos.theme?.label ?? 'Indigo'} · renders <RenderCount />
        </p>
      </div>
    </div>
  );
}

function ProfileEditor() {
  const [saved, setSaved] = useState(false);
  const { handleSubmit } = useForm({
    initialValues: {
      name: 'Ada Lovelace',
      headline: 'Analyst of engines',
      theme: 'indigo',
    },
    onSubmit: () => setSaved(true),
  });

  return (
    <Example aside={<ProfilePreview />}>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <p className="text-xs text-slate-500">
            Form renders: <RenderCount />
          </p>
          <TextField name="name" label="Name" required />
          <TextField name="headline" label="Headline" />
          <div>
            <TextAreaField
              name="bio"
              label="Bio"
              rows={3}
              validate={validateBio}
            />
            <BioCounter />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              name="links.website"
              label="Website"
              type="url"
              placeholder="https://"
            />
            <SelectField name="theme" label="Theme" options={themes} />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" variant="primary">
              Save profile
            </Button>
            {saved && <span className="text-sm text-emerald-700">Saved</span>}
          </div>
        </form>
      </Card>
    </Example>
  );
}

export default withFormProvider(ProfileEditor);
