'use client';

import {
  createContext,
  memo,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
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

/** Calls back once the browser has painted the next frame */
function afterNextPaint(callback: () => void) {
  requestAnimationFrame(() => {
    const channel = new MessageChannel();
    channel.port1.onmessage = callback;
    channel.port2.postMessage(null);
  });
}

/**
 * Measures the demo itself: how long a size takes to mount, and what each keystroke costs.
 * Nothing here is part of wit-form.
 */
function createProbe() {
  let stats = { mountMs: 0, rendered: 0, keystrokeMs: 0, keystrokes: 0 };
  let commits = 0;
  // Starts with the probe, so the first mount is timed too
  let mountStart = performance.now();
  const listeners = new Set<() => void>();
  const publish = (next: Partial<typeof stats>) => {
    stats = { ...stats, ...next };
    listeners.forEach((listener) => listener());
  };
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => stats,
    commit() {
      commits += 1;
    },
    /** The clock starts when a size is picked, and stops when that table is on screen */
    mounting() {
      mountStart = performance.now();
    },
    mounted() {
      afterNextPaint(() =>
        publish({ mountMs: performance.now() - mountStart })
      );
    },
    keystroke() {
      const start = performance.now();
      commits = 0;
      afterNextPaint(() =>
        publish({
          rendered: commits,
          keystrokeMs: performance.now() - start,
          keystrokes: stats.keystrokes + 1,
        })
      );
    },
  };
}

type Probe = ReturnType<typeof createProbe>;
const ProbeContext = createContext<Probe | null>(null);

/** Counts one commit of the calling component */
function useCommitCount() {
  const probe = useContext(ProbeContext);
  useLayoutEffect(() => probe?.commit());
}

/** One cell. It subscribes to its own field atom and nothing else. */
function BudgetCell(props: { rowId: number; quarter: Quarter }) {
  useCommitCount();
  const probe = useContext(ProbeContext);
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
          onChange={(e) => {
            probe?.keystroke();
            setFieldValue(
              e.target.value === '' ? undefined : e.target.valueAsNumber
            );
          }}
        />
        <RenderCount />
      </div>
    </td>
  );
}

/** Watches a single column, so editing Q1 doesn't re-render the Q2 total */
function ColumnTotal(props: { quarter: Quarter }) {
  useCommitCount();
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
  useCommitCount();
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
  useCommitCount();
  const probe = useContext(ProbeContext);
  // Runs once this table and every row in it have committed
  useLayoutEffect(() => probe?.mounted(), [probe]);
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
      <div className="max-h-[480px] overflow-auto rounded-lg border border-slate-200">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-white text-left text-xs uppercase tracking-wide text-slate-500 shadow-sm">
            <tr>
              <th className="px-2 py-2 font-medium">
                Row <RenderCount />
              </th>
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
      <Button
        size="sm"
        className="mt-3"
        onClick={() => append({ q1: 0, q2: 0, q3: 0, q4: 0 })}
      >
        + Add row
      </Button>
    </form>
  );
}

const formatMs = (ms: number) =>
  ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;

function Stat(props: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {props.label}
      </dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
        {props.value}
      </dd>
      {props.note && (
        <dd className="text-[11px] text-slate-500">{props.note}</dd>
      )}
    </div>
  );
}

function Stats(props: { probe: Probe; inputs: number }) {
  const stats = useSyncExternalStore(
    props.probe.subscribe,
    props.probe.getSnapshot,
    props.probe.getSnapshot
  );
  const typed = stats.keystrokes > 0;
  return (
    <dl className="grid grid-cols-2 gap-2 @xl:grid-cols-4">
      <Stat label="Inputs" value={props.inputs.toLocaleString('en-US')} />
      <Stat
        label="Mounted in"
        value={stats.mountMs ? formatMs(stats.mountMs) : '…'}
      />
      <Stat
        label="Per keystroke"
        value={typed ? String(stats.rendered) : '–'}
        note={typed ? 'components rendered' : 'Edit any cell'}
      />
      <Stat
        label="Keystroke to screen"
        value={typed ? formatMs(stats.keystrokeMs) : '–'}
      />
    </dl>
  );
}

const sizes = [100, 500, 1000];

export default function RenderPerformance() {
  const [rowCount, setRowCount] = useState(500);
  const [probe] = useState(createProbe);

  const resize = (size: number) => {
    probe.mounting();
    setRowCount(size);
  };

  return (
    <Example>
      <Card>
        <div className="@container flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-600">Rows:</span>
            {sizes.map((size) => (
              <Button
                key={size}
                size="sm"
                variant={size === rowCount ? 'primary' : 'secondary'}
                onClick={() => resize(size)}
              >
                {size.toLocaleString('en-US')}
              </Button>
            ))}
          </div>
          <Stats probe={probe} inputs={rowCount * quarters.length} />
          <ProbeContext.Provider value={probe}>
            {/*
              skipValuesObserver turns off live tracking of the whole form's values.
              This form doesn't use useFormValues or useIsDirty, so typing gets a bit cheaper.
              The key gives each size a fresh form.
            */}
            <FormProvider key={rowCount} options={{ skipValuesObserver: true }}>
              <BudgetTable rowCount={rowCount} />
            </FormProvider>
          </ProbeContext.Provider>
        </div>
      </Card>
    </Example>
  );
}
