'use client';

import { Atom, BarChart3, Search, Users, Wallet } from 'lucide-react';
import {
  createContext,
  memo,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
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

const EMPLOYEES = 500;
// Two inputs and a total per row, plus the payroll total
const COMPONENTS = EMPLOYEES * 3 + 1;

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
const teams = [
  'Engineering',
  'Design',
  'Sales',
  'Support',
  'Finance',
  'Marketing',
];

const people = Array.from({ length: EMPLOYEES }, (_, i) => ({
  name: `${firstNames[i % firstNames.length]} ${lastNames[(i * 5 + Math.floor(i / firstNames.length)) % lastNames.length]}`,
  team: teams[(i * 7) % teams.length],
}));

const initialLines = people.map((_, i) => ({
  salary: 4200 + ((i * 373) % 46) * 100,
  bonus: (i * 7) % 5 === 0 ? 500 : 0,
}));

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

/**
 * Counts and times each keystroke, the way React DevTools' "Highlight updates" shows it,
 * and runs the autoplay cursor. Nothing here is part of wit-form.
 */
function createInspector() {
  let stats = { rendered: 0, ms: 0, keystrokes: 0 };
  let ready = false;
  let commits = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let writer: ((row: number, name: 'bonus', value: number) => void) | undefined;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  const inspector = {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getStats: () => stats,
    /** Whether commits come from typing (and count and flash), not from mounting */
    get ready() {
      return ready;
    },
    commit() {
      if (ready) commits += 1;
    },
    setWriter(next: typeof writer) {
      writer = next;
      ready = false;
      if (next) setTimeout(() => (ready = true), 300);
    },
    /** Runs one keystroke's update right away, so its time is the form's own */
    keystroke(update: () => void) {
      commits = 0;
      const start = performance.now();
      flushSync(update);
      const ms = performance.now() - start;
      afterNextPaint(() => {
        stats = { rendered: commits, ms, keystrokes: stats.keystrokes + 1 };
        notify();
      });
    },
    /** Types bonus amounts into a few visible rows, one character at a time */
    play(root: HTMLElement) {
      const amounts = ['750', '1200', '300', '2500', '900'];
      let step = 0;
      const typeNext = () => {
        const row = [1, 4, 2, 6, 3][step % 5];
        const amount = amounts[step % amounts.length];
        const input = root.querySelector<HTMLElement>(
          `[data-cell="${row}-bonus"]`
        );
        input?.setAttribute('data-typing', '');
        let length = 0;
        const typeChar = () => {
          length += 1;
          inspector.keystroke(() =>
            writer?.(row, 'bonus', Number(amount.slice(0, length)))
          );
          if (length < amount.length) {
            timer = setTimeout(typeChar, 160);
          } else {
            timer = setTimeout(() => {
              input?.removeAttribute('data-typing');
              step += 1;
              timer = setTimeout(typeNext, 900);
            }, 700);
          }
        };
        timer = setTimeout(typeChar, 400);
      };
      typeNext();
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
    throw new Error('useInspector must be used inside <PayrollDemo>');
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

function MoneyInput(props: {
  row: number;
  rowId: number;
  name: 'salary' | 'bonus';
  label: string;
  className?: string;
}) {
  const inspector = useInspector();
  const ref = useHighlight<HTMLInputElement>();
  const ancestors = useMemo(
    () => [{ name: 'lines', rowId: props.rowId }],
    [props.rowId]
  );
  const { fieldValue, setFieldValue } = useField<number>({
    name: props.name,
    ancestors,
  });
  return (
    // A "$" inside the input, as a real app would show it; the value itself stays a plain number
    <div className={cn('relative', props.className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-fd-muted-foreground"
      >
        $
      </span>
      <input
        ref={ref}
        data-cell={`${props.row}-${props.name}`}
        inputMode="numeric"
        aria-label={`${props.label}, ${people[props.row].name}, row ${props.row + 1}`}
        value={fieldValue ? String(fieldValue) : ''}
        placeholder="0"
        onChange={(e) => {
          const value = Number(e.target.value.replace(/\D/g, '')) || 0;
          inspector.keystroke(() => setFieldValue(value));
        }}
        className="h-8 w-full min-w-0 rounded-md border bg-fd-background pr-2 pl-5 text-right text-sm tabular-nums outline outline-offset-2 outline-transparent transition-colors placeholder:text-fd-muted-foreground/50 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20 data-[typing]:border-sky-400/60 data-[typing]:ring-2 data-[typing]:ring-sky-400/20"
      />
    </div>
  );
}

/** Watches only its own row's two fields */
function RowTotal(props: { rowId: number }) {
  const ref = useHighlight<HTMLSpanElement>();
  const fieldNames = useMemo(
    () =>
      ['salary', 'bonus'].map((name) => ({
        name,
        ancestors: [{ name: 'lines', rowId: props.rowId }],
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

const Row = memo(function Row(props: { rowId: number; row: number }) {
  const person = people[props.row];
  const initials = person.name
    .split(' ')
    .map((part) => part[0])
    .join('');
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_6rem_6rem] items-center gap-3 border-b px-4 py-2 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_7rem] sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-fd-muted text-[10px] font-semibold text-fd-muted-foreground">
          {initials}
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-medium">
            {person.name}
          </span>
          <span className="block truncate text-xs text-fd-muted-foreground">
            {person.team}
          </span>
        </span>
      </div>
      <MoneyInput
        className="max-sm:hidden"
        row={props.row}
        rowId={props.rowId}
        name="salary"
        label="Salary"
      />
      <MoneyInput
        row={props.row}
        rowId={props.rowId}
        name="bonus"
        label="Bonus"
      />
      <RowTotal rowId={props.rowId} />
    </div>
  );
});

/** Watches the two money columns of every row */
function PayrollTotal() {
  const ref = useHighlight<HTMLDivElement>();
  const { values } = useFieldArrayColumnWatch({
    fieldArrayName: 'lines',
    fieldNames: ['salary', 'bonus'],
  });
  const total = values.reduce(
    (sum: number, line: { salary?: number; bonus?: number }) =>
      sum + (line.salary ?? 0) + (line.bonus ?? 0),
    0
  );
  return (
    <div
      ref={ref}
      className="rounded-md px-1 outline outline-offset-4 outline-transparent"
    >
      <div className="text-xs text-fd-muted-foreground">Total payroll</div>
      <div className="text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
        {money.format(total)}
      </div>
    </div>
  );
}

function PayrollForm() {
  const inspector = useInspector();
  const initialValues = useMemo(() => ({ lines: initialLines }), []);
  useForm({ initialValues, onSubmit: () => {} });
  const { fieldArrayProps } = useFieldArray({
    name: 'lines',
    fieldNames: ['salary', 'bonus'],
  });
  const { setValue } = useFormContext();
  const rowIds = fieldArrayProps.rowIds;

  useEffect(() => {
    inspector.setWriter((row, name, value) =>
      setValue(
        {
          type: 'field',
          name,
          ancestors: [{ name: 'lines', rowId: rowIds[row] }],
        },
        { value }
      )
    );
    return () => inspector.setWriter(undefined);
  }, [inspector, setValue, rowIds]);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b px-4 py-4 sm:px-5">
        <div>
          <div className="text-xs text-fd-muted-foreground">
            Payroll · October
          </div>
          <div className="text-lg font-semibold tracking-tight">
            {EMPLOYEES} employees
          </div>
        </div>
        <PayrollTotal />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_6rem_6rem] gap-3 border-b bg-fd-muted/40 px-4 py-2 text-xs font-medium text-fd-muted-foreground sm:grid-cols-[minmax(0,1fr)_7rem_7rem_7rem] sm:px-5">
        <span>Employee</span>
        <span className="text-right max-sm:hidden">Salary</span>
        <span className="text-right">Bonus</span>
        <span className="text-right">Total</span>
      </div>
      <div className="h-[19rem] overflow-y-auto">
        {rowIds.map((rowId, row) => (
          <Row key={rowId} rowId={rowId} row={row} />
        ))}
      </div>
    </div>
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
        {stats.keystrokes === 0 ? (
          `${COMPONENTS.toLocaleString('en-US')} components · type in any field`
        ) : (
          <>
            Last keystroke:{' '}
            <span className="font-semibold text-sky-300">{stats.rendered}</span>{' '}
            of {COMPONENTS.toLocaleString('en-US')} components rendered ·{' '}
            {stats.ms < 10 ? stats.ms.toFixed(1) : Math.round(stats.ms)} ms
          </>
        )}
      </span>
    </div>
  );
}

function Sidebar() {
  const items = [
    { icon: Wallet, label: 'Payroll', active: true },
    { icon: Users, label: 'People' },
    { icon: BarChart3, label: 'Reports' },
  ];
  return (
    <nav
      aria-hidden
      className="hidden w-44 shrink-0 flex-col gap-1 border-r bg-fd-muted/30 p-3 md:flex"
    >
      <div className="mb-2 flex items-center gap-2 rounded-md border bg-fd-background px-2 py-1.5 text-xs text-fd-muted-foreground">
        <Search className="size-3.5" /> Search
      </div>
      {items.map((item) => (
        <span
          key={item.label}
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
            item.active
              ? 'bg-fd-accent font-medium text-fd-foreground'
              : 'text-fd-muted-foreground'
          )}
        >
          <item.icon className="size-4" /> {item.label}
        </span>
      ))}
    </nav>
  );
}

export function PayrollDemo() {
  const [inspector] = useState(createInspector);
  const [visible, setVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Mount the form only when it's about to come into view, then start the cursor once it settles
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
    return () => {
      observer.disconnect();
      clearTimeout(started);
      inspector.stop(root);
    };
  }, [inspector]);

  return (
    <div ref={rootRef} className="relative">
      <div
        aria-hidden
        className="absolute -inset-x-8 -inset-y-6 -z-10 rounded-[2.5rem] bg-gradient-to-b from-emerald-500/15 via-teal-500/5 to-transparent blur-2xl"
      />
      <InspectorContext.Provider value={inspector}>
        {/* The visitor's first focus takes over from the cursor */}
        <div
          onFocusCapture={() => inspector.stop(rootRef.current)}
          className="overflow-hidden rounded-2xl border bg-fd-background/90 text-left shadow-2xl shadow-emerald-950/10 backdrop-blur"
        >
          <div className="flex items-center gap-3 border-b bg-fd-muted/40 px-4 py-2.5">
            <div className="flex gap-1.5" aria-hidden>
              <span className="size-2.5 rounded-full bg-fd-foreground/15" />
              <span className="size-2.5 rounded-full bg-fd-foreground/15" />
              <span className="size-2.5 rounded-full bg-fd-foreground/15" />
            </div>
            <span className="truncate font-mono text-xs text-fd-muted-foreground">
              acme.app/payroll
            </span>
          </div>
          <div className="flex">
            <Sidebar />
            {visible ? (
              // Nothing here reads the whole form's values, so that tracking can stay off
              <FormProvider options={{ skipValuesObserver: true }}>
                <PayrollForm />
              </FormProvider>
            ) : (
              <div className="h-[25.5rem] flex-1" />
            )}
          </div>
          <InspectorBar />
        </div>
      </InspectorContext.Provider>
    </div>
  );
}
