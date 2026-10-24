/** The code behind each hero demo, trimmed to the part that matters. Shown by "View code". */
export const heroDemoCode = {
  payroll: {
    file: 'payroll.tsx',
    code: `import { useField, useFieldArrayColumnWatch, useFieldWatch } from 'wit-form';

// Each input subscribes to its own field
function BonusInput({ rowId }: { rowId: number }) {
  const ancestors = useMemo(() => [{ name: 'lines', rowId }], [rowId]);
  const { fieldValue, setFieldValue } = useField<number>({ name: 'bonus', ancestors });
  return <input value={fieldValue ?? ''} onChange={(e) => setFieldValue(+e.target.value)} />;
}

// Re-renders only when this row's salary or bonus changes
function RowTotal({ rowId }: { rowId: number }) {
  const ancestors = [{ name: 'lines', rowId }];
  const { values } = useFieldWatch({
    fieldNames: [{ name: 'salary', ancestors }, { name: 'bonus', ancestors }],
  });
  return <span>{values.salary + values.bonus}</span>;
}

// Re-renders when a salary or bonus changes, in any row
function PayrollTotal() {
  const { values } = useFieldArrayColumnWatch({
    fieldArrayName: 'lines',
    fieldNames: ['salary', 'bonus'],
  });
  return <strong>{values.reduce((sum, l) => sum + l.salary + l.bonus, 0)}</strong>;
}`,
  },
  comparison: {
    file: 'why-its-fast.tsx',
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
    file: 'booking.tsx',
    code: `const bookingSchema = z.object({
  destination: z.string(),
  travelers: z
    .array(
      z.object({
        name: z.string().min(1, 'Required'),
        age: z.number().min(18, 'Must be 18+'),
      })
    )
    .min(1, 'Add a traveler'),
});

// Each schema error lands on its field, in the right row
const { handleSubmit } = useForm({ schema: bookingSchema, onSubmit });
const { fieldArrayProps, append, swap, remove } = useFieldArray({
  name: 'travelers',
  fieldNames: ['name', 'age', 'passport'],
});

// Rendered only for trips abroad. Hidden, it drops out of the values.
useField({
  name: 'passport',
  ancestors,
  depFields: ['destination'],
  validate: (value, other) =>
    isAbroad(other?.values.destination) && !value ? 'Needed abroad' : null,
});`,
  },
} as const;

export type HeroDemoKey = keyof typeof heroDemoCode;
