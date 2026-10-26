'use client';

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
import { DemoControls } from './demo-controls';

type Side = 'shared' | 'atoms';
type DemoField = { name: string; label: string; sample: string };

// Every field starts empty; "Type for me" fills in these samples, one field after another.
// They're short, so they still fit in the narrow columns on phones.
const FIELDS: DemoField[] = [
  { name: 'name', label: 'Name', sample: 'Ada Lovelace' },
  { name: 'email', label: 'Email', sample: 'ada@mail.io' },
  { name: 'phone', label: 'Phone', sample: '020 7946' },
  { name: 'company', label: 'Company', sample: 'Engines Ltd' },
  { name: 'role', label: 'Role', sample: 'Engineer' },
  { name: 'website', label: 'Website', sample: 'ada.dev' },
  { name: 'street', label: 'Street', sample: '12 St James' },
  { name: 'city', label: 'City', sample: 'London' },
  { name: 'zip', label: 'Postcode', sample: 'SW1Y 4JH' },
  { name: 'country', label: 'Country', sample: 'UK' },
  { name: 'team', label: 'Team size', sample: '11–50' },
];

const valuesOf = (fields: DemoField[]) =>
  Object.fromEntries(fields.map((field) => [field.name, '']));

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
  // Renders while the forms mount or restore aren't the visitor's doing, so they don't count
  let settling: ReturnType<typeof setTimeout> | undefined;
  let afterSettle: (() => void) | undefined;
  let playback: ReturnType<typeof setInterval> | undefined;
  let playing = false;
  const listeners = new Set<() => void>();
  const setters = new Map<Side, (name: string, value: string) => void>();
  const notify = () => listeners.forEach((listener) => listener());

  const stopPlayback = () => {
    clearInterval(playback);
    playback = undefined;
    if (playing) {
      playing = false;
      notify();
    }
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
    isPlaying: () => playing,
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
    /** Puts every field back to its starting value, then zeroes the tallies */
    restore(then?: () => void) {
      settle(then);
      for (const field of FIELDS) {
        setters.forEach((set) => set(field.name, ''));
      }
    },
    play() {
      this.restore(() => {
        playing = true;
        notify();
        // Every keystroke of the whole form, in order
        const keys = FIELDS.flatMap((field) =>
          [...field.sample].map((_, i) => [
            field.name,
            field.sample.slice(0, i + 1),
          ])
        );
        let next = 0;
        playback = setInterval(() => {
          const [name, value] = keys[next++];
          type(name, value);
          if (next === keys.length) stopPlayback();
        }, 45);
      });
    },
    /** Stops typing where it is */
    pause() {
      stopPlayback();
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

/** The Name field on top, full width, and the other fields in two columns below it */
function FieldGrid(props: {
  fields: DemoField[];
  render: (field: DemoField) => ReactNode;
}) {
  const [first, ...rest] = props.fields;
  return (
    <div className="flex flex-col gap-2">
      {props.render(first)}
      <div className="grid grid-cols-2 gap-2">{rest.map(props.render)}</div>
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
  const playing = useSyncExternalStore(
    store.subscribe,
    store.isPlaying,
    () => false
  );
  return (
    <div className="flex items-center gap-3 border-b bg-fd-muted/40 px-4 py-2.5">
      <div className="flex gap-1.5" aria-hidden>
        <span className="size-2.5 rounded-full bg-fd-foreground/15" />
        <span className="size-2.5 rounded-full bg-fd-foreground/15" />
        <span className="size-2.5 rounded-full bg-fd-foreground/15" />
      </div>
      <DemoControls
        playing={playing}
        onPlay={() => store.play()}
        onPause={() => store.pause()}
        onReset={() => store.restore()}
      />
    </div>
  );
}

/** The punchline: the same keystrokes, side by side, in one sentence */
function Verdict() {
  const tally = useTally();
  if (tally.keystrokes === 0) {
    return (
      <p className="text-center text-sm text-pretty text-fd-muted-foreground">
        Each form has {FIELDS.length} fields. Type in either one: keystrokes go
        to both, and the counters are real React renders.
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
      with Wit Form.
    </p>
  );
}

export function RenderComparison() {
  const [store] = useState(createDemoStore);
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
              <SharedForm fields={FIELDS} />
            </Panel>
            <Panel
              side="atoms"
              label="Wit Form"
              title="Only the field you touched"
              body="The input writes to its own atom. The rest of the form never hears about it, and there is nothing to memoize."
            >
              <AtomForm fields={FIELDS} />
            </Panel>
          </div>
          <div className="border-t px-4 py-3 sm:px-5">
            <Verdict />
          </div>
        </div>
      </DemoContext.Provider>
    </div>
  );
}
