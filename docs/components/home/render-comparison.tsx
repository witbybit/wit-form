'use client';

import { Play, RotateCcw } from 'lucide-react';
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { FormProvider, useField, useForm } from 'wit-form';
import { cn } from '@/lib/cn';
import { Container, SectionHeading } from './primitives';

type Side = 'shared' | 'atoms';

const FIELDS = [
  { name: 'name', label: 'Name' },
  { name: 'email', label: 'Email', value: 'ada@example.com' },
  { name: 'phone', label: 'Phone', value: '+44 20 7946 0958' },
  { name: 'company', label: 'Company', value: 'Analytical Engines' },
  { name: 'role', label: 'Role', value: 'Engineer' },
  { name: 'website', label: 'Website', value: 'ada.dev' },
  { name: 'street', label: 'Street', value: '12 St James’s Sq' },
  { name: 'city', label: 'City', value: 'London' },
  { name: 'zip', label: 'Postcode', value: 'SW1Y 4JH' },
  { name: 'country', label: 'Country', value: 'United Kingdom' },
  { name: 'team', label: 'Team size', value: '11–50' },
];

const INITIAL_VALUES: Record<string, string> = Object.fromEntries(
  FIELDS.map((field) => [field.name, field.value ?? ''])
);

const SAMPLE_TEXT = 'Ada Lovelace';

const FLASH = {
  shared: 'rgb(244 63 94 / 0.55)',
  atoms: 'rgb(16 185 129 / 0.7)',
};

/**
 * Mirrors keystrokes into both forms and tallies the renders each one does.
 * It lives outside React state, so the section itself never re-renders and the tallies stay honest.
 */
function createDemoStore() {
  const empty = { keystrokes: 0, shared: 0, atoms: 0 };
  let snapshot = empty;
  let ready = false;
  let playback: ReturnType<typeof setInterval> | undefined;
  const listeners = new Set<() => void>();
  const typers = new Set<(value: string) => void>();
  const notify = () => listeners.forEach((listener) => listener());

  const stopPlayback = () => {
    clearInterval(playback);
    playback = undefined;
  };

  const reset = () => {
    snapshot = empty;
    ready = true;
    notify();
  };

  const type = (value: string) => {
    snapshot = { ...snapshot, keystrokes: snapshot.keystrokes + 1 };
    notify();
    typers.forEach((setValue) => setValue(value));
  };

  return {
    get ready() {
      return ready;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => empty,
    bump(side: Side) {
      snapshot = { ...snapshot, [side]: snapshot[side] + 1 };
      notify();
    },
    /** Zeroes the tallies; also called once mounting settles, so they open at 0 */
    reset,
    onType(setValue: (value: string) => void) {
      typers.add(setValue);
      return () => {
        typers.delete(setValue);
      };
    },
    type(value: string) {
      stopPlayback();
      // The first keystroke can beat the settle timer, so start counting from it
      if (!ready) reset();
      type(value);
    },
    play() {
      stopPlayback();
      reset();
      let length = 0;
      type('');
      playback = setInterval(() => {
        length += 1;
        type(SAMPLE_TEXT.slice(0, length));
        if (length === SAMPLE_TEXT.length) stopPlayback();
      }, 110);
    },
    stopPlayback,
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
      !store.ready ||
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
  label: string;
  value: string;
  editable?: boolean;
}) {
  const store = useDemo();
  const ref = useRenderFlash(props.side);
  const formName = props.side === 'shared' ? 'shared form state' : 'Wit Form';

  return (
    <div
      ref={ref}
      className={cn(
        'flex h-9 min-w-0 items-center gap-3 rounded-md border bg-fd-background/70 px-3 text-sm',
        props.editable &&
          'col-span-full border-fd-foreground/25 focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/25'
      )}
    >
      <span
        className={cn(
          'w-16 shrink-0 font-mono text-[11px] text-fd-muted-foreground',
          // Phones show two narrow columns, where the values speak for themselves
          !props.editable && 'max-sm:hidden'
        )}
      >
        {props.label}
      </span>
      {props.editable ? (
        <input
          value={props.value}
          onChange={(e) => store.type(e.target.value)}
          placeholder="Type here…"
          aria-label={`${props.label} (${formName})`}
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-fd-muted-foreground/70"
        />
      ) : (
        <span className="truncate text-fd-muted-foreground">{props.value}</span>
      )}
    </div>
  );
}

/* Shared form state: one values object in context, read by every field */

const SharedValues = createContext<Record<string, string>>(INITIAL_VALUES);

function SharedField(props: { name: string; label: string }) {
  const values = useContext(SharedValues);
  return (
    <FieldBox
      side="shared"
      label={props.label}
      value={values[props.name]}
      editable={props.name === 'name'}
    />
  );
}

function SharedForm() {
  const store = useDemo();
  const [values, setValues] = useState(INITIAL_VALUES);

  useEffect(
    () => store.onType((name) => setValues((prev) => ({ ...prev, name }))),
    [store]
  );

  return (
    <SharedValues.Provider value={values}>
      <FieldGrid>
        {FIELDS.map((field) => (
          <SharedField key={field.name} name={field.name} label={field.label} />
        ))}
      </FieldGrid>
    </SharedValues.Provider>
  );
}

/* Wit Form: each field subscribes to its own atom */

function AtomField(props: { name: string; label: string }) {
  const store = useDemo();
  const editable = props.name === 'name';
  const { fieldValue, setFieldValue } = useField<string>({ name: props.name });

  useEffect(() => {
    if (editable) return store.onType(setFieldValue);
  }, [editable, store, setFieldValue]);

  return (
    <FieldBox
      side="atoms"
      label={props.label}
      value={fieldValue ?? ''}
      editable={editable}
    />
  );
}

function AtomFields() {
  useForm({ initialValues: INITIAL_VALUES, onSubmit: () => {} });
  return (
    <FieldGrid>
      {FIELDS.map((field) => (
        <AtomField key={field.name} name={field.name} label={field.label} />
      ))}
    </FieldGrid>
  );
}

function AtomForm() {
  return (
    <FormProvider>
      <AtomFields />
    </FormProvider>
  );
}

function FieldGrid(props: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{props.children}</div>;
}

function RenderCount(props: { side: Side }) {
  const tally = useTally();
  const ours = props.side === 'atoms';
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 font-mono text-xs tabular-nums',
        ours
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          : 'bg-rose-500/10 text-rose-600 dark:text-rose-300'
      )}
    >
      {tally[props.side]} {tally[props.side] === 1 ? 'render' : 'renders'}
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
        <RenderCount side={props.side} />
      </div>

      {props.children}

      <div>
        <h3 className="mb-1.5 font-semibold">{props.title}</h3>
        <p className="text-sm text-fd-muted-foreground">{props.body}</p>
      </div>
    </div>
  );
}

function Controls() {
  const store = useDemo();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-fd-muted-foreground">
        Type in either{' '}
        <span className="font-medium text-fd-foreground">Name</span> field.
        Keystrokes go to both forms, and the counters are real React renders.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => store.play()}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-fd-background/60 px-3 text-xs font-medium transition outline-none hover:bg-fd-accent focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-[0.98]"
        >
          <Play className="size-3.5" /> Type for me
        </button>
        <button
          type="button"
          onClick={() => {
            store.stopPlayback();
            store.reset();
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-fd-muted-foreground transition outline-none hover:bg-fd-accent hover:text-fd-foreground focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <RotateCcw className="size-3.5" /> Reset counters
        </button>
      </div>
    </div>
  );
}

/** The punchline: the same keystrokes, side by side, in one sentence */
function Verdict() {
  const tally = useTally();
  if (tally.keystrokes === 0) {
    return (
      <p className="text-center text-sm text-fd-muted-foreground">
        Each form has {FIELDS.length} fields. Watch how many of them a single
        keystroke wakes up.
      </p>
    );
  }
  const keys = `${tally.keystrokes} ${tally.keystrokes === 1 ? 'keystroke' : 'keystrokes'}`;
  return (
    <p className="text-center text-sm text-pretty sm:text-base">
      <span className="font-medium">{keys}:</span>{' '}
      <span className="font-mono font-semibold tabular-nums text-rose-600 dark:text-rose-300">
        {tally.shared}
      </span>{' '}
      field renders with shared state,{' '}
      <span className="font-mono font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
        {tally.atoms}
      </span>{' '}
      with Wit Form.{' '}
      <span className="text-fd-muted-foreground">
        The gap grows with every field you add.
      </span>
    </p>
  );
}

export function RenderComparison() {
  const [store] = useState(createDemoStore);

  // Mounting renders every field a few times while Wit Form initialises its atoms, which says
  // nothing about typing. Zero the tallies once that settles, unless the visitor already started.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (store.getSnapshot().keystrokes === 0) store.reset();
    }, 300);
    return () => {
      clearTimeout(timer);
      store.stopPlayback();
    };
  }, [store]);

  return (
    <section className="pt-16 pb-20 sm:pt-20 sm:pb-28">
      <Container className="flex flex-col gap-10">
        <SectionHeading
          eyebrow="Why atoms"
          title="Your form shouldn't re-render because one input changed."
          description="Most form libraries keep values in one shared object, so every keystroke re-renders every field. Wit Form gives each field its own atom: an update only reaches the field that changed."
        />
        <DemoContext.Provider value={store}>
          <div className="flex flex-col gap-4">
            <Controls />
            <div className="grid gap-4 md:grid-cols-2">
              <Panel
                side="shared"
                label="Shared form state"
                title="Every field wakes up"
                body="Each keystroke replaces the form object, so every field that reads it renders again, unless you memoize and tune selectors."
              >
                <SharedForm />
              </Panel>
              <Panel
                side="atoms"
                label="Wit Form"
                title="Only the field you touched"
                body="The input writes to its own atom. The rest of the form doesn't notice, with no memo, selectors or manual tuning."
              >
                <AtomForm />
              </Panel>
            </div>
            <Verdict />
          </div>
        </DemoContext.Provider>
      </Container>
    </section>
  );
}
