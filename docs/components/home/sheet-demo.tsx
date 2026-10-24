'use client';

import { Atom, ChevronDown, Trash2 } from 'lucide-react';
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import {
  FormProvider,
  useField,
  useFieldArray,
  useFieldArrayColumnWatch,
  useFieldWatch,
  useForm,
  useFormContext,
} from 'wit-form';
import { cn } from '@/lib/cn';

const ROWS = 500;
// Five fields and a total per row, plus the sheet, the remote count and the payroll total
const componentsFor = (rows: number) => rows * 6 + 3;
const COLUMNS =
  'grid-cols-[2.5rem_minmax(9rem,1fr)_8.5rem_7rem_7rem_4.5rem_7rem_2rem]';

const teams = ['Engineering', 'Design', 'Sales', 'Support', 'Finance'];
const firstNames = [
  'Ada',
  'Grace',
  'Alan',
  'Katherine',
  'Linus',
  'Margaret',
  'Dennis',
  'Radia',
  'Ken',
  'Barbara',
  'Guido',
  'Frances',
];
const lastNames = [
  'Lovelace',
  'Hopper',
  'Turing',
  'Johnson',
  'Torvalds',
  'Hamilton',
  'Ritchie',
  'Perlman',
  'Thompson',
  'Liskov',
  'van Rossum',
  'Allen',
];

const initialRows = Array.from({ length: ROWS }, (_, i) => ({
  name: `${firstNames[i % 12]} ${String.fromCharCode(65 + ((i * 7) % 26))}. ${lastNames[(i * 5 + Math.floor(i / 12)) % 12]}`,
  team: teams[(i * 7) % teams.length],
  salary: 4200 + ((i * 373) % 46) * 100,
  bonus: (i * 7) % 5 === 0 ? 500 : 0,
  remote: i % 3 === 0,
}));

type Column = 'name' | 'team' | 'salary' | 'bonus' | 'remote';
type Value = string | number | boolean;

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Calls back once the browser has painted the next frame */
function afterNextPaint(callback: () => void) {
  requestAnimationFrame(() => {
    const channel = new MessageChannel();
    channel.port1.onmessage = callback;
    channel.port2.postMessage(null);
  });
}

/** What the autoplay does: type a bonus, tick a box, change a team, type a salary */
const script: { row: number; column: Column; values: Value[] }[] = [
  { row: 1, column: 'bonus', values: [7, 75, 750] },
  { row: 3, column: 'remote', values: [true] },
  { row: 2, column: 'team', values: ['Design'] },
  { row: 4, column: 'salary', values: [5, 58, 580, 5800] },
  { row: 3, column: 'remote', values: [false] },
  { row: 0, column: 'team', values: ['Sales'] },
];

/**
 * Counts and times each edit, the way React DevTools' "Highlight updates" shows it,
 * and runs the autoplay cursor. Nothing here is part of wit-form.
 */
function createInspector() {
  let stats = { rendered: 0, ms: 0, edits: 0, components: componentsFor(ROWS) };
  let ready = false;
  let commits = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let writer: ((row: number, column: Column, value: Value) => void) | undefined;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  const inspector = {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getStats: () => stats,
    /** Whether commits come from editing (and count and flash), not from mounting */
    get ready() {
      return ready;
    },
    commit() {
      if (ready) commits += 1;
    },
    setRows(rows: number) {
      stats = { ...stats, components: componentsFor(rows) };
      notify();
    },
    setWriter(next: typeof writer) {
      writer = next;
      ready = false;
      if (next) setTimeout(() => (ready = true), 300);
    },
    /** Runs one edit's update right away, so its time is the form's own */
    edit(update: () => void) {
      commits = 0;
      const start = performance.now();
      flushSync(update);
      const ms = performance.now() - start;
      afterNextPaint(() => {
        stats = { ...stats, rendered: commits, ms, edits: stats.edits + 1 };
        notify();
      });
    },
    play(root: HTMLElement) {
      let step = 0;
      const run = () => {
        const { row, column, values } = script[step % script.length];
        const cell = root
          .querySelectorAll('[data-sheet-row]')
          [row]?.querySelector(`[data-column="${column}"]`);
        cell?.setAttribute('data-typing', '');
        values.forEach((value, i) => {
          timer = setTimeout(
            () => inspector.edit(() => writer?.(row, column, value)),
            300 + i * 160
          );
        });
        timer = setTimeout(
          () => {
            cell?.removeAttribute('data-typing');
            step += 1;
            timer = setTimeout(run, 700);
          },
          300 + values.length * 160 + 600
        );
      };
      run();
    },
    stop(root?: HTMLElement | null) {
      clearTimeout(timer);
      root?.querySelector('[data-typing]')?.removeAttribute('data-typing');
    },
  };
  return inspector;
}

type Inspector = ReturnType<typeof createInspector>;
const InspectorContext = createContext<Inspector | null>(null);

function useInspector() {
  const inspector = useContext(InspectorContext);
  if (!inspector)
    throw new Error('useInspector must be used inside <SheetDemo>');
  return inspector;
}

/** Counts each commit of the calling component and outlines it, like DevTools' highlight updates */
function useHighlight<T extends HTMLElement>() {
  const inspector = useInspector();
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    if (!inspector.ready) return;
    inspector.commit();
    if (!ref.current || reducedMotion()) return;
    ref.current.animate(
      [
        { outlineColor: 'rgb(97 218 251)', outlineWidth: '2px' },
        { outlineColor: 'rgb(97 218 251 / 0)', outlineWidth: '2px' },
      ],
      { duration: 900, easing: 'ease-out' }
    );
  });
  return ref;
}

const cellClass =
  'h-8 w-full min-w-0 rounded-md border bg-fd-background text-sm outline outline-offset-2 outline-transparent transition-colors focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20 data-[typing]:border-sky-400/60 data-[typing]:ring-2 data-[typing]:ring-sky-400/20';

/** One field in one row, of any kind */
function useCell<T>(rowId: number, name: Column) {
  const ancestors = useMemo(() => [{ name: 'people', rowId }], [rowId]);
  return useField<T>({ name, ancestors });
}

function TextCell(props: { rowId: number }) {
  const inspector = useInspector();
  const ref = useHighlight<HTMLInputElement>();
  const { fieldValue, setFieldValue } = useCell<string>(props.rowId, 'name');
  return (
    <input
      ref={ref}
      id={`sheet-name-${props.rowId}`}
      data-column="name"
      aria-labelledby="sheet-col-name"
      value={fieldValue ?? ''}
      onChange={(e) => inspector.edit(() => setFieldValue(e.target.value))}
      className={cn(cellClass, 'px-2')}
    />
  );
}

function SelectCell(props: { rowId: number }) {
  const inspector = useInspector();
  const ref = useHighlight<HTMLSelectElement>();
  const { fieldValue, setFieldValue } = useCell<string>(props.rowId, 'team');
  return (
    <div className="relative">
      <select
        ref={ref}
        data-column="team"
        aria-labelledby={`sheet-col-team sheet-name-${props.rowId}`}
        value={fieldValue ?? ''}
        onChange={(e) => inspector.edit(() => setFieldValue(e.target.value))}
        className={cn(cellClass, 'appearance-none pr-7 pl-2')}
      >
        {teams.map((team) => (
          <option key={team}>{team}</option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-fd-muted-foreground"
      />
    </div>
  );
}

function MoneyCell(props: { rowId: number; name: 'salary' | 'bonus' }) {
  const inspector = useInspector();
  const ref = useHighlight<HTMLInputElement>();
  const { fieldValue, setFieldValue } = useCell<number>(
    props.rowId,
    props.name
  );
  return (
    // A "$" inside the input, as a real app would show it; the value itself stays a plain number
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-fd-muted-foreground"
      >
        $
      </span>
      <input
        ref={ref}
        data-column={props.name}
        inputMode="numeric"
        aria-labelledby={`sheet-col-${props.name} sheet-name-${props.rowId}`}
        value={fieldValue ? String(fieldValue) : ''}
        placeholder="0"
        onChange={(e) => {
          const value = Number(e.target.value.replace(/\D/g, '')) || 0;
          inspector.edit(() => setFieldValue(value));
        }}
        className={cn(
          cellClass,
          'pr-2 pl-5 text-right tabular-nums placeholder:text-fd-muted-foreground/50'
        )}
      />
    </div>
  );
}

function CheckboxCell(props: { rowId: number }) {
  const inspector = useInspector();
  const ref = useHighlight<HTMLInputElement>();
  const { fieldValue, setFieldValue } = useCell<boolean>(props.rowId, 'remote');
  return (
    <div className="flex justify-center">
      <input
        ref={ref}
        type="checkbox"
        data-column="remote"
        aria-labelledby={`sheet-col-remote sheet-name-${props.rowId}`}
        checked={!!fieldValue}
        onChange={(e) => inspector.edit(() => setFieldValue(e.target.checked))}
        className="size-4 rounded accent-emerald-600 outline outline-offset-4 outline-transparent data-[typing]:ring-2 data-[typing]:ring-sky-400/40"
      />
    </div>
  );
}

/** Watches only its own row's two money fields */
function RowTotal(props: { rowId: number }) {
  const ref = useHighlight<HTMLSpanElement>();
  const fieldNames = useMemo(
    () =>
      ['salary', 'bonus'].map((name) => ({
        name,
        ancestors: [{ name: 'people', rowId: props.rowId }],
      })),
    [props.rowId]
  );
  const { values } = useFieldWatch({ fieldNames });
  return (
    <span
      ref={ref}
      className="block rounded px-1 text-right text-sm font-medium tabular-nums outline outline-offset-2 outline-transparent"
    >
      {money.format((values.salary ?? 0) + (values.bonus ?? 0))}
    </span>
  );
}

// Rows know only their rowId, so deleting one doesn't re-render the rows after it.
// The row number comes from a CSS counter, so it never needs a render either.
const Row = memo(function Row(props: {
  rowId: number;
  onRemove: (rowId: number) => void;
}) {
  return (
    <div
      data-sheet-row
      className={cn(
        'grid items-center gap-2 border-b px-3 py-1.5 [counter-increment:row] last:border-b-0',
        COLUMNS
      )}
    >
      {/* Numbered by CSS, for the eye only; screen readers identify rows by name */}
      <span
        aria-hidden
        className="font-mono text-xs text-fd-muted-foreground tabular-nums before:content-[counter(row)]"
      />
      <TextCell rowId={props.rowId} />
      <SelectCell rowId={props.rowId} />
      <MoneyCell rowId={props.rowId} name="salary" />
      <MoneyCell rowId={props.rowId} name="bonus" />
      <CheckboxCell rowId={props.rowId} />
      <RowTotal rowId={props.rowId} />
      <button
        type="button"
        aria-labelledby={`sheet-delete sheet-name-${props.rowId}`}
        onClick={() => props.onRemove(props.rowId)}
        className="grid size-7 place-items-center rounded-md text-fd-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-600 focus-visible:ring-2 focus-visible:ring-rose-500/40 dark:hover:text-rose-300"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
});

function Kpi(props: { label: string; children: ReactNode }) {
  const ref = useHighlight<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className="rounded-md px-1 text-right outline outline-offset-4 outline-transparent"
    >
      <div className="text-xs text-fd-muted-foreground">{props.label}</div>
      <div className="text-lg font-semibold tracking-tight tabular-nums sm:text-xl">
        {props.children}
      </div>
    </div>
  );
}

/** Watches only the checkbox column */
function RemoteCount() {
  const { values } = useFieldArrayColumnWatch({
    fieldArrayName: 'people',
    fieldNames: ['remote'],
  });
  const remote = values.filter(
    (row: { remote?: boolean }) => row.remote
  ).length;
  return <Kpi label="Remote">{remote}</Kpi>;
}

/** Watches only the two money columns */
function PayrollTotal() {
  const { values } = useFieldArrayColumnWatch({
    fieldArrayName: 'people',
    fieldNames: ['salary', 'bonus'],
  });
  const total = values.reduce(
    (sum: number, row: { salary?: number; bonus?: number }) =>
      sum + (row.salary ?? 0) + (row.bonus ?? 0),
    0
  );
  return <Kpi label="Total payroll">{money.format(total)}</Kpi>;
}

function Sheet() {
  const inspector = useInspector();
  // The sheet renders only when rows are added or removed; count those renders too
  useLayoutEffect(() => {
    if (inspector.ready) inspector.commit();
  });
  const initialValues = useMemo(() => ({ people: initialRows }), []);
  useForm({ initialValues, onSubmit: () => {} });
  const { fieldArrayProps, remove } = useFieldArray({
    name: 'people',
    fieldNames: ['name', 'team', 'salary', 'bonus', 'remote'],
  });
  const { setValue } = useFormContext();
  const rowIds = fieldArrayProps.rowIds;

  // One function for every row, so rows can stay memoized
  const latest = useRef({ rowIds, remove });
  latest.current = { rowIds, remove };
  const removeRow = useCallback(
    (rowId: number) =>
      inspector.edit(() =>
        latest.current.remove(latest.current.rowIds.indexOf(rowId))
      ),
    [inspector]
  );
  useEffect(() => inspector.setRows(rowIds.length), [inspector, rowIds.length]);

  useEffect(() => {
    inspector.setWriter((row, column, value) =>
      setValue(
        {
          type: 'field',
          name: column,
          ancestors: [{ name: 'people', rowId: rowIds[row] }],
        },
        { value }
      )
    );
    return () => inspector.setWriter(undefined);
  }, [inspector, setValue, rowIds]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b px-4 py-3 sm:px-5">
        <div>
          <div className="text-xs text-fd-muted-foreground">
            Team budget · Q4
          </div>
          <div className="text-lg font-semibold tracking-tight">
            {rowIds.length} people
          </div>
        </div>
        <div className="flex gap-6">
          <RemoteCount />
          <PayrollTotal />
        </div>
      </div>
      {/* One scroll box both ways, so the header stays put and phones can swipe sideways */}
      <div className="h-[20rem] overflow-auto">
        <div className="min-w-[48rem] [counter-reset:row]">
          <div
            className={cn(
              'sticky top-0 z-10 grid gap-2 border-b bg-fd-muted px-3 py-2 text-xs font-medium text-fd-muted-foreground',
              COLUMNS
            )}
          >
            <span>#</span>
            <span id="sheet-col-name">Name</span>
            <span id="sheet-col-team">Team</span>
            <span id="sheet-col-salary" className="text-right">
              Salary
            </span>
            <span id="sheet-col-bonus" className="text-right">
              Bonus
            </span>
            <span id="sheet-col-remote" className="text-center">
              Remote
            </span>
            <span className="text-right">Total</span>
            <span id="sheet-delete" className="sr-only">
              Delete
            </span>
          </div>
          {rowIds.map((rowId) => (
            <Row key={rowId} rowId={rowId} onRemove={removeRow} />
          ))}
        </div>
      </div>
    </>
  );
}

/** The DevTools-style readout along the bottom of the window */
function InspectorBar() {
  const inspector = useInspector();
  const stats = useSyncExternalStore(
    inspector.subscribe,
    inspector.getStats,
    inspector.getStats
  );
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t bg-zinc-950 px-4 py-2 font-mono text-xs text-zinc-400 [color-scheme:dark] sm:px-5">
      <span className="flex items-center gap-2 text-sky-300">
        <Atom className="size-3.5" /> Highlight updates
      </span>
      <span aria-live="polite">
        {stats.edits === 0 ? (
          `${stats.components.toLocaleString('en-US')} components · edit any cell`
        ) : (
          <>
            Last edit:{' '}
            <span className="font-semibold text-sky-300">{stats.rendered}</span>{' '}
            of {stats.components.toLocaleString('en-US')} components rendered ·{' '}
            {stats.ms < 10 ? stats.ms.toFixed(1) : Math.round(stats.ms)} ms
          </>
        )}
      </span>
    </div>
  );
}

export function SheetDemo() {
  const [inspector] = useState(createInspector);
  const [visible, setVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Mount the sheet only when it's about to come into view, then start the cursor once it settles
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let started: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setVisible(true);
        if (!reducedMotion())
          started = setTimeout(() => inspector.play(root), 1000);
      },
      { rootMargin: '200px' }
    );
    observer.observe(root);
    // Only the visitor's own pointer or keys take over from the cursor
    const stop = () => {
      clearTimeout(started);
      inspector.stop(root);
    };
    root.addEventListener('pointerdown', stop);
    root.addEventListener('keydown', stop);
    return () => {
      observer.disconnect();
      root.removeEventListener('pointerdown', stop);
      root.removeEventListener('keydown', stop);
      stop();
    };
  }, [inspector]);

  return (
    <div ref={rootRef} className="relative">
      <div
        aria-hidden
        className="absolute -inset-x-8 -inset-y-6 -z-10 rounded-[2.5rem] bg-gradient-to-b from-emerald-500/15 via-teal-500/5 to-transparent blur-2xl"
      />
      <InspectorContext.Provider value={inspector}>
        <div className="overflow-hidden rounded-2xl border bg-fd-background/90 text-left shadow-2xl shadow-emerald-950/10 backdrop-blur">
          <div className="flex items-center gap-3 border-b bg-fd-muted/40 px-4 py-2.5">
            <div className="flex gap-1.5" aria-hidden>
              <span className="size-2.5 rounded-full bg-fd-foreground/15" />
              <span className="size-2.5 rounded-full bg-fd-foreground/15" />
              <span className="size-2.5 rounded-full bg-fd-foreground/15" />
            </div>
            <span className="truncate font-mono text-xs text-fd-muted-foreground">
              acme.app/budget
            </span>
          </div>
          {visible ? (
            // Nothing here reads the whole form's values, so that tracking can stay off
            <FormProvider options={{ skipValuesObserver: true }}>
              <Sheet />
            </FormProvider>
          ) : (
            <div className="h-[24.5rem]" />
          )}
          <InspectorBar />
        </div>
      </InspectorContext.Provider>
    </div>
  );
}
