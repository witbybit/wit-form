'use client';

import { useEffect, useRef, useState } from 'react';
import { useField, useForm, withFormProvider } from 'wit-form';
import { TextField } from '../components/fields';
import { Button, Card, Example, FormInspector } from '../components/ui';

interface Member {
  id: string;
  name: string;
  color: string;
}

const members: Member[] = [
  { id: 'm_101', name: 'Priya Patel', color: 'bg-rose-500' },
  { id: 'm_102', name: 'Diego Ramos', color: 'bg-sky-500' },
  { id: 'm_103', name: 'Mei Chen', color: 'bg-emerald-500' },
];

const validateAssignee = (value?: string) => (!value ? 'Pick someone' : null);

/**
 * The value is just the member id, which is what the API needs. The name and colour
 * go in `extraInfo`, so the UI can show them without looking the member up again.
 */
function AssigneePicker() {
  const { fieldValue, setFieldValue, extraInfo, error } = useField<
    string,
    { name: string; color: string }
  >({
    name: 'assigneeId',
    validate: validateAssignee,
  });
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium text-slate-700">
        Assignee <span className="text-red-500">*</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {members.map((member) => (
          <button
            key={member.id}
            type="button"
            aria-pressed={fieldValue === member.id}
            onClick={() =>
              setFieldValue(member.id, {
                name: member.name,
                color: member.color,
              })
            }
            className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm ring-1 ${
              fieldValue === member.id
                ? 'bg-indigo-50 ring-indigo-500'
                : 'ring-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className={`h-6 w-6 rounded-full ${member.color}`} />
            {member.name}
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {extraInfo ? `Assigned to ${extraInfo.name}` : 'Nobody assigned yet'}
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </fieldset>
  );
}

interface FileMeta {
  name: string;
  type: string;
  size: number;
}

/**
 * The value is serialisable file metadata. The File object itself and an
 * object URL for the preview are kept in `extraInfo`.
 */
function ImageUpload() {
  const { fieldValue, setFieldValue, extraInfo } = useField<
    FileMeta | null,
    { file: File; previewUrl: string } | undefined
  >({ name: 'cover', defaultValue: null });

  // Object URLs hold the file in memory until they're revoked
  const previewUrl = useRef<string | null>(null);
  const setPreview = (file: File | null) => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = file ? URL.createObjectURL(file) : null;
    return previewUrl.current;
  };
  useEffect(() => () => void setPreview(null), []);

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-slate-700">
        Cover image
      </span>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-xs text-slate-400">
          {extraInfo?.previewUrl ? (
            <img
              src={extraInfo.previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            'No image'
          )}
        </div>
        <div className="space-y-2 text-sm">
          <label className="inline-flex cursor-pointer rounded-md bg-white px-3 py-1.5 font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
            Choose image
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                setFieldValue(
                  { name: file.name, type: file.type, size: file.size },
                  { file, previewUrl: setPreview(file)! }
                );
              }}
            />
          </label>
          {fieldValue && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {fieldValue.name} · {(fieldValue.size / 1024).toFixed(1)} KB
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setPreview(null);
                  setFieldValue(null);
                }}
              >
                Remove
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskForm() {
  const [submitted, setSubmitted] = useState<unknown>();
  const { handleSubmit } = useForm({
    initialValues: { title: 'Redesign the onboarding flow' },
    // extraInfos has the same shape as values
    onSubmit: (values, extraInfos) => {
      // In a real app you'd upload extraInfos.cover.file here
      setSubmitted({ values, extraInfos });
    },
  });

  return (
    <Example aside={<FormInspector submitted={submitted} showExtraInfos />}>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <TextField name="title" label="Title" required />
          <AssigneePicker />
          <ImageUpload />
          <Button type="submit" variant="primary">
            Create task
          </Button>
        </form>
      </Card>
    </Example>
  );
}

export default withFormProvider(TaskForm);
