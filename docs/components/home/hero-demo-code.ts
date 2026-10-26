/** The code behind each hero demo, trimmed to the part that matters. Shown by "View code". */
export const heroDemoCode = {
  sheet: {
    file: 'budget-sheet.tsx',
    code: `import { useField, useFieldArrayColumnWatch, useFieldWatch } from 'wit-form';

// Every cell is a field in its row: text, select, number or checkbox
function RemoteCell({ rowId }: { rowId: number }) {
  const ancestors = useMemo(() => [{ name: 'people', rowId }], [rowId]);
  const { fieldValue, setFieldValue } = useField<boolean>({ name: 'remote', ancestors });
  return (
    <input
      type="checkbox"
      checked={!!fieldValue}
      onChange={(e) => setFieldValue(e.target.checked)}
    />
  );
}

// Re-renders only when this row's salary or bonus changes
function RowTotal({ rowId }: { rowId: number }) {
  const ancestors = [{ name: 'people', rowId }];
  const { values } = useFieldWatch({
    fieldNames: [{ name: 'salary', ancestors }, { name: 'bonus', ancestors }],
  });
  return <span>{values.salary + values.bonus}</span>;
}

// Re-renders only when a box in the remote column changes
function RemoteCount() {
  const { values } = useFieldArrayColumnWatch({
    fieldArrayName: 'people',
    fieldNames: ['remote'],
  });
  return <span>{values.filter((row) => row.remote).length}</span>;
}`,
  },
  comparison: {
    file: 'fewer-re-renders.tsx',
    code: `// One state object: every field reads the whole form,
// so a keystroke in one field re-renders all of them
function SharedField({ name }: { name: string }) {
  const values = useContext(FormValues);
  return <input value={values[name]} onChange={(e) => update(name, e.target.value)} />;
}

// Wit Form: each field reads its own atom,
// so a keystroke re-renders that field and nothing else
function Field({ name }: { name: string }) {
  const { fieldValue, setFieldValue } = useField<string>({ name });
  return <input value={fieldValue ?? ''} onChange={(e) => setFieldValue(e.target.value)} />;
}`,
  },
  complex: {
    file: 'job-application.tsx',
    code: `// One form across three steps. Steps that aren't shown keep their values.
const { handleSubmit, validateFields } = useForm({
  schema: applicationSchema,
  skipUnregister: true,
  onSubmit,
});

// "Next" checks only the current step's fields
const next = () => {
  if (validateFields(steps[step].fields).length === 0) setStep(step + 1);
};

// Any kind of value, in any shape
useField<string>({ name: 'contact.email' }); // { contact: { email } }
useField<string>({ name: 'country' }); // a select
useField<number>({ name: 'years' }); // a slider
useField<string[]>({ name: 'skills' }); // toggle chips
useField<boolean>({ name: 'terms' }); // a checkbox

// A file: keep its name and size as the value, the File itself as extra info
const resume = useField<{ name: string; size: number }, { file: File }>({ name: 'resume' });
resume.setFieldValue({ name: file.name, size: file.size }, { file });

// A list of rows, each with its own fields
const { fieldArrayProps, append, remove } = useFieldArray({
  name: 'history',
  fieldNames: ['company', 'title'],
});`,
  },
} as const;

export type HeroDemoKey = keyof typeof heroDemoCode;
