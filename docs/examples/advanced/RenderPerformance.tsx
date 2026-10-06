'use client';

import { memo, useMemo, useState } from 'react';
import {
  FormProvider,
  useField,
  useFieldArray,
  useFieldArrayColumnWatch,
  useForm,
} from 'wit-form';
import { Button, Card, Example, RenderCount } from '../components/ui';

const quarters = ['q1', 'q2', 'q3', 'q4'] as const;
type Quarter = (typeof quarters)[number];

const departments = [
  'Engineering',
  'Design',
  'Marketing',
  'Sales',
  'Support',
  'Finance',
  'Legal',
  'People',
];

function makeRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    name: `${departments[i % departments.length]} · cost center ${i + 1}`,
    q1: 1000 + ((i * 37) % 900),
    q2: 1200 + ((i * 53) % 700),
    q3: 900 + ((i * 71) % 1100),
    q4: 1500 + ((i * 29) % 500),
  }));
}

const money = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** One cell. It subscribes to its own field atom and nothing else. */
function BudgetCell(props: { rowId: number; quarter: Quarter }) {
  const ancestors = useMemo(
    () => [{ name: 'lines', rowId: props.rowId }],
    [props.rowId]
  );
  const { fieldValue, setFieldValue } = useField<number | undefined>({
    name: props.quarter,
    ancestors,
  });
  return (
    <td className="px-1 py-0.5">
      <div className="flex items-center gap-1">
        <input
          type="number"
          aria-label={`${props.quarter} budget`}
          className="w-24 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-right text-xs tabular-nums focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          value={fieldValue ?? ''}
          onChange={(e) =>
            setFieldValue(
              e.target.value === '' ? undefined : e.target.valueAsNumber
            )
          }
        />
        <RenderCount />
      </div>
    </td>
  );
}

/** Watches a single column, so editing Q1 doesn't re-render the Q2 total */
function ColumnTotal(props: { quarter: Quarter }) {
  const { values } = useFieldArrayColumnWatch({
    fieldArrayName: 'lines',
    fieldNames: [props.quarter],
  });
  const total = values.reduce(
    (sum: number, row: Record<Quarter, number | undefined>) =>
      sum + (row[props.quarter] ?? 0),
    0
  );
  return (
    <td className="px-1 py-2">
      <div className="flex items-center gap-1">
        <span className="w-24 text-right text-xs font-semibold tabular-nums">
          {money.format(total)}
        </span>
        <RenderCount />
      </div>
    </td>
  );
}

// memo keeps rows from re-rendering when the table re-renders after adding a row
const BudgetRow = memo(function BudgetRow(props: {
  rowId: number;
  index: number;
}) {
  return (
    <tr className="even:bg-slate-50">
      <td className="whitespace-nowrap px-2 py-0.5 text-xs text-slate-600">
        {props.index + 1}. <RenderCount />
      </td>
      {quarters.map((quarter) => (
        <BudgetCell key={quarter} rowId={props.rowId} quarter={quarter} />
      ))}
    </tr>
  );
});

function BudgetTable(props: { rowCount: number }) {
  const initialValues = useMemo(
    () => ({ lines: makeRows(props.rowCount) }),
    [props.rowCount]
  );
  const { handleSubmit } = useForm({
    initialValues,
    onSubmit: () => {},
  });
  // No `validate` on this array: a field array validator reads every row,
  // so the array would re-render on every keystroke
  const { fieldArrayProps, append } = useFieldArray({
    name: 'lines',
    fieldNames: ['name', ...quarters],
  });

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3 flex items-center gap-3 text-xs text-slate-500">
        <span>
          Table renders: <RenderCount />
        </span>
        <span>· {fieldArrayProps.rowIds.length * quarters.length} inputs</span>
        <Button
          size="sm"
          className="ml-auto"
          onClick={() => append({ q1: 0, q2: 0, q3: 0, q4: 0 })}
        >
          + Add row
        </Button>
      </div>
      <div className="max-h-[480px] overflow-auto rounded-lg border border-slate-200">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-white text-left text-xs uppercase tracking-wide text-slate-500 shadow-sm">
            <tr>
              <th className="px-2 py-2 font-medium">Row</th>
              {quarters.map((quarter) => (
                <th key={quarter} className="px-1 py-2 font-medium">
                  {quarter}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fieldArrayProps.rowIds.map((rowId, index) => (
              <BudgetRow key={rowId} rowId={rowId} index={index} />
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 border-t border-slate-200 bg-white">
            <tr>
              <td className="px-2 text-xs font-semibold">Total</td>
              {quarters.map((quarter) => (
                <ColumnTotal key={quarter} quarter={quarter} />
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </form>
  );
}

const sizes = [100, 250, 500];

export default function RenderPerformance() {
  const [rowCount, setRowCount] = useState(100);
  return (
    <Example>
      <Card>
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-slate-600">Rows:</span>
          {sizes.map((size) => (
            <Button
              key={size}
              size="sm"
              variant={size === rowCount ? 'primary' : 'secondary'}
              onClick={() => setRowCount(size)}
            >
              {size}
            </Button>
          ))}
        </div>
        {/*
          skipValuesObserver turns off live tracking of the whole form's values.
          This form doesn't use useFormValues or useIsDirty, so typing gets a bit cheaper.
          The key gives each size a fresh form.
        */}
        <FormProvider key={rowCount} options={{ skipValuesObserver: true }}>
          <BudgetTable rowCount={rowCount} />
        </FormProvider>
      </Card>
    </Example>
  );
}
