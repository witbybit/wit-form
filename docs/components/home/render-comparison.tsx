'use client';

import { Play, RotateCcw } from 'lucide-react';
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { flushSync } from 'react-dom';
import { FormProvider, useField, useForm, useFormContext } from 'wit-form';
import { cn } from '@/lib/cn';

type Side = 'shared' | 'atoms';
type DemoField = { name: string; label: string; value: string };

// Short values, so they still fit in the narrow columns on phones
const BASE_FIELDS: DemoField[] = [
  { name: 'name', label: 'Name', value: '' },
  { name: 'email', label: 'Email', value: 'ada@mail.io' },
  { name: 'phone', label: 'Phone', value: '020 7946' },
  { name: 'company', label: 'Company', value: 'Engines Ltd' },
  { name: 'role', label: 'Role', value: 'Engineer' },
  { name: 'website', label: 'Website', value: 'ada.dev' },
  { name: 'street', label: 'Street', value: '12 St James' },
  { name: 'city', label: 'City', value: 'London' },
  { name: 'zip', label: 'Postcode', value: 'SW1Y 4JH' },
  { name: 'country', label: 'Country', value: 'UK' },
  { name: 'team', label: 'Team size', value: '11–50' },
];

// Big enough by default for the gap to show at a glance; the verdict offers 1,000
const DEFAULT_COUNT = 100;
const LARGE_COUNT = 1000;

function makeFields(count: number): DemoField[] {
  const extra = Array.from(
    { length: Math.max(0, count - BASE_FIELDS.length) },
    (_, i) => {
      const n = BASE_FIELDS.length + i + 1;
      return { name: `field${n}`, label: `Field ${n}`, value: `Value ${n}` };
    }
  );
  return [...BASE_FIELDS.slice(0, count), ...extra];
}

const valuesOf = (fields: DemoField[]) =>
  Object.fromEntries(fields.map((field) => [field.name, field.value]));

const SAMPLE_TEXT = 'Ada Lovelace';

const FLASH = {
  shared: 'rgb(244 63 94 / 0.55)',
  atoms: 'rgb(16 185 129 / 0.7)',
};

/**
 * Sends each keystroke to both forms, one after the other, and tallies the renders and the time
 * each form spends on it. It lives outside React state, so the section itself never re-renders.
 */
function createDemoStore() {
  const empty = { keystrokes: 0, shared: 0, atoms: 0, sharedMs: 0, atomsMs: 0 };
  let snapshot = empty;
  let fields = makeFields(DEFAULT_COUNT);
  // Renders while the forms mount or restore aren't the visitor's doing, so they don't count
  let settling: ReturnType<typeof setTimeout> | undefined;
  let afterSettle: (() => void) | undefined;
  let playback: ReturnType<typeof setInterval> | undefined;
  const listeners = new Set<() => void>();
  const setters = new Map<Side, (name: string, value: string) => void>();
  const notify = () => listeners.forEach((listener) => listener());

  const stopPlayback = () => {
    clearInterval(playback);
    playback = undefined;
  };

  const reset = () => {
    snapshot = empty;
    notify();
  };

  /** Waits until the forms have stopped rendering for a moment, then zeroes the tallies */
  const scheduleSettle = () => {
    clearTimeout(settling);
    settling = setTimeout(() => {
      settling = undefined;
      reset();
      const then = afterSettle;
      afterSettle = undefined;
      then?.();
    }, 200);
  };

  const settle = (then?: () => void) => {
    stopPlayback();
    afterSettle = then;
    scheduleSettle();
  };

  const type = (name: string, value: string) => {
    const time = { shared: 0, atoms: 0 };
    // One form at a time, flushed right away, so each form's render time is its own
    for (const side of ['shared', 'atoms'] as const) {
      const set = setters.get(side);
      if (!set) continue;
      const start = performance.now();
      flushSync(() => set(name, value));
      time[side] = performance.now() - start;
    }
    snapshot = {
      ...snapshot,
      keystrokes: snapshot.keystrokes + 1,
      sharedMs: snapshot.sharedMs + time.shared,
      atomsMs: snapshot.atomsMs + time.atoms,
    };
    notify();
  };

  return {
    /** Whether renders right now come from typing, so they count and flash */
    get counting() {
      return !settling;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => empty,
    bump(side: Side) {
      if (settling) {
        scheduleSettle();
        return;
      }
      snapshot = { ...snapshot, [side]: snapshot[side] + 1 };
      notify();
    },
    register(side: Side, set: (name: string, value: string) => void) {
      setters.set(side, set);
      return () => {
        setters.delete(side);
      };
    },
    settle,
    type(name: string, value: string) {
      stopPlayback();
      // The visitor's first keystroke can beat the settle timer, so start counting from it
      if (settling) {
        clearTimeout(settling);
        settling = undefined;
        afterSettle = undefined;
        reset();
      }
      type(name, value);
    },
    /** Switches both forms to a new number of fields; they remount with fresh values */
    resize(count: number) {
      fields = makeFields(count);
      settle();
    },
    /** Puts every field back to its starting value, then zeroes the tallies */
    restore(then?: () => void) {
      settle(then);
      for (const field of fields) {
        setters.forEach((set) => set(field.name, field.value));
      }
    },
    play() {
      this.restore(() => {
        let length = 0;
        playback = setInterval(() => {
          length += 1;
          type('name', SAMPLE_TEXT.slice(0, length));
          if (length === SAMPLE_TEXT.length) stopPlayback();
        }, 110);
      });
    },
    stop() {
      stopPlayback();
      clearTimeout(settling);
    },
  };
}

type DemoStore = ReturnType<typeof createDemoStore>;

const DemoContext = createContext<DemoStore | null>(null);

function useDemo() {
  const store = useContext(DemoContext);
  if (!store) throw new Error('useDemo must be used inside <RenderComparison>');
  return store;
}

function useTally() {
  const store = useDemo();
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );
}

/** Counts every commit of the calling field and flashes its box, without rendering anything itself */
function useRenderFlash(side: Side) {
  const store = useDemo();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    store.bump(side);
    if (
      !store.counting ||
      !ref.current ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    ref.current.animate(
      [
        { boxShadow: `0 0 0 1px ${FLASH[side]}, 0 0 14px ${FLASH[side]}` },
        { boxShadow: '0 0 0 1px transparent, 0 0 0 transparent' },
      ],
      { duration: 650, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
    );
  });

  return ref;
}

function FieldBox(props: {
  side: Side;
  name: string;
  label: string;
  value: string;
}) {
  const store = useDemo();
  const ref = useRenderFlash(props.side);
  const formName = props.side === 'shared' ? 'one state object' : 'Wit Form';
  // Name is the empty, full-width field that invites the first keystroke
  const featured = props.name === 'name';

  return (
    <div
      ref={ref}
      className={cn(
        'flex h-9 min-w-0 items-center gap-3 rounded-md border bg-fd-background/70 px-3 text-sm transition-colors hover:border-fd-foreground/25 focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/25',
        featured && 'border-fd-foreground/25'
      )}
    >
      <span
        className={cn(
          'w-16 shrink-0 font-mono text-[11px] text-fd-muted-foreground',
          // Phones show two narrow columns, where the values speak for themselves
          !featured && 'max-sm:hidden'
        )}
      >
        {props.label}
      </span>
      <input
        value={props.value}
        onChange={(e) => store.type(props.name, e.target.value)}
        placeholder={featured ? 'Type here…' : props.label}
        aria-label={`${props.label} (${formName})`}
        spellCheck={false}
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-fd-muted-foreground/70"
      />
    </div>
  );
}

/** The Name field on top, the rest in a scroll box, so bigger forms don't stretch the page */
function FieldGrid(props: {
  fields: DemoField[];
  render: (field: DemoField) => ReactNode;
}) {
  const [first, ...rest] = props.fields;
  return (
    <div className="flex flex-col gap-2">
      {props.render(first)}
      <div className="grid max-h-[13.5rem] grid-cols-2 gap-2 overflow-y-auto">
        {rest.map(props.render)}
      </div>
    </div>
  );
}

/* One state object: every field reads it from context */

const SharedValues = createContext<Record<string, string>>({});

function SharedField(props: { field: DemoField }) {
  const values = useContext(SharedValues);
  return (
    <FieldBox
      side="shared"
      name={props.field.name}
      label={props.field.label}
      value={values[props.field.name] ?? ''}
    />
  );
}

function SharedForm(props: { fields: DemoField[] }) {
  const store = useDemo();
  const [values, setValues] = useState(() => valuesOf(props.fields));

  useEffect(
    () =>
      store.register('shared', (name, value) =>
        setValues((prev) => ({ ...prev, [name]: value }))
      ),
    [store]
  );

  return (
    <SharedValues.Provider value={values}>
      <FieldGrid
        fields={props.fields}
        render={(field) => <SharedField key={field.name} field={field} />}
      />
    </SharedValues.Provider>
  );
}

/* Wit Form: each field subscribes to its own atom */

function AtomField(props: { field: DemoField }) {
  const { fieldValue } = useField<string>({ name: props.field.name });
  return (
    <FieldBox
      side="atoms"
      name={props.field.name}
      label={props.field.label}
      value={fieldValue ?? ''}
    />
  );
}

function AtomFields(props: { fields: DemoField[] }) {
  const store = useDemo();
  const initialValues = useMemo(() => valuesOf(props.fields), [props.fields]);
  useForm({ initialValues, onSubmit: () => {} });
  const { setValue } = useFormContext();

  useEffect(
    () => store.register('atoms', (name, value) => setValue(name, { value })),
    [store, setValue]
  );

  return (
    <FieldGrid
      fields={props.fields}
      render={(field) => <AtomField key={field.name} field={field} />}
    />
  );
}

function AtomForm(props: { fields: DemoField[] }) {
  return (
    <FormProvider>
      <AtomFields fields={props.fields} />
    </FormProvider>
  );
}

const formatMs = (ms: number) =>
  ms < 10 ? ms.toFixed(1) : String(Math.round(ms));

/** Renders so far, and the average time per keystroke once there is one */
function Tally(props: { side: Side; label?: string; className?: string }) {
  const tally = useTally();
  const ours = props.side === 'atoms';
  const renders = tally[props.side];
  const ms = ours ? tally.atomsMs : tally.sharedMs;
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 font-mono text-xs whitespace-nowrap tabular-nums',
        ours
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          : 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
        props.className
      )}
    >
      {props.label && (
        <span className="font-sans font-medium">{props.label}: </span>
      )}
      {renders.toLocaleString('en-US')} {renders === 1 ? 'render' : 'renders'}
      {tally.keystrokes > 0 && ` · ${formatMs(ms / tally.keystrokes)} ms/key`}
    </span>
  );
}

function Panel(props: {
  side: Side;
  label: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  const ours = props.side === 'atoms';
  return (
    <div
      className={cn(
        'flex flex-col gap-5 rounded-2xl border p-5 sm:p-6',
        ours
          ? 'border-emerald-500/30 bg-gradient-to-b from-emerald-500/[0.07] to-transparent'
          : 'bg-fd-card/50'
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <span
          className={cn(
            'font-mono text-xs uppercase tracking-wider',
            ours
              ? 'text-emerald-600 dark:text-emerald-300'
              : 'text-fd-muted-foreground'
          )}
        >
          {props.label}
        </span>
        <Tally side={props.side} />
      </div>

      {props.children}

      <div>
        <h3 className="mb-1.5 font-semibold">{props.title}</h3>
        <p className="text-sm text-fd-muted-foreground">{props.body}</p>
      </div>
    </div>
  );
}

/** Both tallies in one bar that stays on screen while the stacked forms scroll past, on phones */
function StickyTally() {
  return (
    <div className="sticky top-14 z-10 flex flex-wrap items-center justify-center gap-2 border-b bg-fd-background/90 px-4 py-2 backdrop-blur md:hidden">
      <Tally side="shared" label="One object" />
      <Tally side="atoms" label="Wit Form" />
    </div>
  );
}

function Toolbar() {
  const store = useDemo();
  return (
    <div className="flex items-center justify-between gap-3 border-b bg-fd-muted/40 px-4 py-2.5 sm:px-5">
      <div className="flex gap-1.5" aria-hidden>
        <span className="size-2.5 rounded-full bg-fd-foreground/15" />
        <span className="size-2.5 rounded-full bg-fd-foreground/15" />
        <span className="size-2.5 rounded-full bg-fd-foreground/15" />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => store.play()}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-fd-background px-3 text-xs font-medium transition outline-none hover:bg-fd-accent focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-[0.98]"
        >
          <Play className="size-3.5" /> Type for me
        </button>
        <button
          type="button"
          onClick={() => store.restore()}
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-fd-muted-foreground transition outline-none hover:bg-fd-accent hover:text-fd-foreground focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <RotateCcw className="size-3.5" /> Reset
        </button>
      </div>
    </div>
  );
}

/** The punchline: the same keystrokes, side by side, in one sentence, with the size switch */
function Verdict(props: { count: number; onResize: (count: number) => void }) {
  const tally = useTally();
  const large = props.count >= LARGE_COUNT;
  const resize = (
    <button
      type="button"
      onClick={() => props.onResize(large ? DEFAULT_COUNT : LARGE_COUNT)}
      className="font-medium text-emerald-700 underline decoration-emerald-500/40 underline-offset-4 outline-none hover:decoration-current focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-300"
    >
      {large
        ? `Back to ${DEFAULT_COUNT} fields`
        : `Try ${LARGE_COUNT.toLocaleString('en-US')} fields`}
    </button>
  );
  if (tally.keystrokes === 0) {
    return (
      <p className="text-center text-sm text-pretty text-fd-muted-foreground">
        Each form has {props.count.toLocaleString('en-US')} fields. Type in
        either one: keystrokes go to both, and the counters are real React
        renders. {resize}
      </p>
    );
  }
  const keys = `${tally.keystrokes} ${tally.keystrokes === 1 ? 'keystroke' : 'keystrokes'}`;
  return (
    <p className="text-center text-sm text-pretty sm:text-base">
      <span className="font-medium">{keys}:</span>{' '}
      <span className="font-mono font-semibold tabular-nums text-rose-600 dark:text-rose-300">
        {tally.shared.toLocaleString('en-US')}
      </span>{' '}
      field renders with one state object,{' '}
      <span className="font-mono font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
        {tally.atoms.toLocaleString('en-US')}
      </span>{' '}
      with Wit Form. {resize}
    </p>
  );
}

export function RenderComparison() {
  const [store] = useState(createDemoStore);
  const [count, setCount] = useState(DEFAULT_COUNT);
  const fields = useMemo(() => makeFields(count), [count]);
  const rootRef = useRef<HTMLDivElement>(null);

  // Mounting renders every field a few times, which says nothing about typing.
  // Zero the tallies once that settles, unless the visitor already started typing.
  useEffect(() => {
    store.settle();
    return () => store.stop();
  }, [store]);

  // Most visitors don't type, so show the point once when the demo comes into view
  useEffect(() => {
    const root = rootRef.current;
    if (
      !root ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        if (store.getSnapshot().keystrokes === 0) store.play();
      },
      { threshold: 0.4 }
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [store]);

  const resize = (size: number) => {
    if (size === count) return;
    store.resize(size);
    setCount(size);
  };

  return (
    <div ref={rootRef} className="relative">
      <div
        aria-hidden
        className="absolute -inset-x-8 -inset-y-6 -z-10 rounded-[2.5rem] bg-gradient-to-b from-emerald-500/15 via-teal-500/5 to-transparent blur-2xl"
      />
      <DemoContext.Provider value={store}>
        {/* overflow-clip, not hidden, so the phone tally bar can stick to the viewport */}
        <div className="overflow-clip rounded-2xl border bg-fd-background/80 shadow-2xl shadow-emerald-950/10 backdrop-blur">
          <Toolbar />
          <StickyTally />
          <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2">
            <Panel
              side="shared"
              label="One state object"
              title="Every field wakes up"
              body="Values live in one object, so each keystroke hands every field a new copy and they all render again, unless you add memo and selectors."
            >
              <SharedForm key={count} fields={fields} />
            </Panel>
            <Panel
              side="atoms"
              label="Wit Form"
              title="Only the field you touched"
              body="The input writes to its own atom. The rest of the form never hears about it, and there is nothing to memoize."
            >
              <AtomForm key={count} fields={fields} />
            </Panel>
          </div>
          <div className="border-t px-4 py-3 sm:px-5">
            <Verdict count={count} onResize={resize} />
          </div>
        </div>
      </DemoContext.Provider>
    </div>
  );
}
