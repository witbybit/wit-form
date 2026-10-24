'use client';

import { ArrowUp, Check, ChevronDown, Plus, X } from 'lucide-react';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  FormProvider,
  useField,
  useFieldArray,
  useFieldWatch,
  useForm,
  useFormValues,
  type IAncestorInput,
} from 'wit-form';
import { z } from 'zod';
import { cn } from '@/lib/cn';

const destinations: Record<string, { label: string; abroad: boolean }> = {
  denver: { label: 'Denver, USA', abroad: false },
  kyoto: { label: 'Kyoto, Japan', abroad: true },
  lisbon: { label: 'Lisbon, Portugal', abroad: true },
};

const isAbroad = (destination: unknown) =>
  typeof destination === 'string' && !!destinations[destination]?.abroad;

// One schema for the whole booking. Its errors land on the matching fields, row by row
const bookingSchema = z.object({
  destination: z.string('Pick a destination'),
  travelers: z
    .array(
      z.object({
        name: z.string('Required').min(1, 'Required'),
        age: z.number('Enter an age').min(18, 'Must be 18+'),
      })
    )
    .min(1, 'Add a traveler'),
});

// A plain rule next to the schema: only trips abroad need a passport
const validatePassport = (
  value: unknown,
  other?: { values: Record<string, unknown> }
) => (isAbroad(other?.values.destination) && !value ? 'Needed abroad' : null);

const inputClass =
  'h-8 w-full min-w-0 rounded-md border bg-fd-background px-2 text-sm outline-none transition-colors placeholder:text-fd-muted-foreground/60 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 aria-invalid:border-rose-500/60';

function Field(props: {
  name: string;
  label: string;
  ancestors?: IAncestorInput[];
  type?: 'text' | 'number';
  placeholder?: string;
  validate?: typeof validatePassport;
  depFields?: string[];
  className?: string;
}) {
  const id = useId();
  const { fieldValue, setFieldValue, onBlur, error, ref } = useField<
    string | number | undefined
  >({
    name: props.name,
    ancestors: props.ancestors,
    validate: props.validate,
    depFields: props.depFields,
  });
  return (
    <div className={props.className}>
      <input
        id={id}
        ref={ref}
        data-field={props.name}
        aria-label={props.label}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        inputMode={props.type === 'number' ? 'numeric' : undefined}
        placeholder={props.placeholder ?? props.label}
        value={fieldValue ?? ''}
        onChange={(e) => {
          const raw = e.target.value;
          setFieldValue(
            props.type === 'number'
              ? raw === ''
                ? undefined
                : Number(raw.replace(/\D/g, ''))
              : raw
          );
        }}
        onBlur={onBlur}
        className={inputClass}
      />
      {error && (
        <p
          id={`${id}-error`}
          className="mt-1 text-xs text-rose-600 dark:text-rose-300"
        >
          {error}
        </p>
      )}
    </div>
  );
}

const options = Object.entries(destinations);

/**
 * A select in the style of shadcn/ui: a trigger button and a list that opens below it.
 * Arrow keys, Home and End move, Enter or Space picks, Escape closes.
 */
function DestinationSelect() {
  const { fieldValue, setFieldValue, onBlur, ref } = useField<string>({
    name: 'destination',
  });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const baseId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const selected = options.findIndex(([value]) => value === fieldValue);

  // A click anywhere else closes the list
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const show = () => {
    setActive(Math.max(0, selected));
    setOpen(true);
  };
  const choose = (index: number) => {
    setFieldValue(options[index][0]);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    const last = options.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(last, active + 1),
      ArrowUp: Math.max(0, active - 1),
      Home: 0,
      End: last,
    };
    if (e.key in moves) {
      e.preventDefault();
      setActive(moves[e.key]);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(active);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative flex flex-col gap-1">
      <span id={`${baseId}-label`} className="text-xs text-fd-muted-foreground">
        Destination
      </span>
      <button
        ref={(element) => {
          triggerRef.current = element;
          ref(element);
        }}
        type="button"
        role="combobox"
        data-field="destination"
        aria-labelledby={`${baseId}-label`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${baseId}-list`}
        aria-activedescendant={open ? `${baseId}-option-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        className={cn(
          inputClass,
          'flex items-center justify-between text-left text-fd-foreground',
          open && 'border-emerald-500/60 ring-2 ring-emerald-500/20'
        )}
      >
        {selected >= 0 ? options[selected][1].label : 'Pick a destination'}
        <ChevronDown
          className={cn(
            'size-4 text-fd-muted-foreground transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <ul
          id={`${baseId}-list`}
          role="listbox"
          aria-labelledby={`${baseId}-label`}
          className="absolute top-full z-20 mt-1 w-full rounded-md border bg-fd-popover p-1 text-fd-popover-foreground shadow-lg motion-safe:animate-[select-in_120ms_ease-out]"
        >
          {options.map(([value, destination], index) => (
            <li
              key={value}
              id={`${baseId}-option-${index}`}
              role="option"
              data-value={value}
              aria-selected={index === selected}
              onPointerMove={() => setActive(index)}
              onClick={() => choose(index)}
              className={cn(
                'flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
                index === active && 'bg-fd-accent text-fd-accent-foreground'
              )}
            >
              <Check
                className={cn(
                  'size-3.5 shrink-0',
                  index === selected ? 'opacity-100' : 'opacity-0'
                )}
              />
              <span className="flex-1">{destination.label}</span>
              {destination.abroad && (
                <span className="text-xs text-fd-muted-foreground">
                  Passport needed
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Watches the destination, so the passport field appears only for trips abroad */
function useAbroad() {
  const { values } = useFieldWatch({ fieldNames: ['destination'] });
  return isAbroad(values.destination);
}

function Traveler(props: {
  rowId: number;
  index: number;
  onMoveUp?: () => void;
  onRemove: () => void;
}) {
  const ancestors = useMemo<IAncestorInput[]>(
    () => [{ name: 'travelers', rowId: props.rowId }],
    [props.rowId]
  );
  const abroad = useAbroad();
  return (
    <div
      className="flex items-start gap-2 rounded-lg border bg-fd-muted/20 p-2"
      data-traveler={props.index}
    >
      <span className="mt-1.5 w-4 shrink-0 text-center font-mono text-xs text-fd-muted-foreground">
        {props.index + 1}
      </span>
      {/* On phones the name takes its own line, with age and passport below it */}
      <div className="flex min-w-0 flex-1 flex-wrap items-start gap-2">
        <Field
          name="name"
          label={`Traveler ${props.index + 1} name`}
          placeholder="Name"
          ancestors={ancestors}
          className="min-w-0 basis-full sm:basis-0 sm:flex-1"
        />
        <Field
          name="age"
          label={`Traveler ${props.index + 1} age`}
          placeholder="Age"
          type="number"
          ancestors={ancestors}
          className="w-20"
        />
        {abroad && (
          <Field
            name="passport"
            label={`Traveler ${props.index + 1} passport`}
            placeholder="Passport no."
            ancestors={ancestors}
            validate={validatePassport}
            depFields={['destination']}
            className="w-28"
          />
        )}
      </div>
      <div className="flex shrink-0">
        <button
          type="button"
          aria-label={`Move traveler ${props.index + 1} up`}
          disabled={!props.onMoveUp}
          onClick={props.onMoveUp}
          className="grid size-8 place-items-center rounded-md text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground disabled:opacity-30"
        >
          <ArrowUp className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label={`Remove traveler ${props.index + 1}`}
          onClick={props.onRemove}
          className="grid size-8 place-items-center rounded-md text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/** The live values, nested exactly as onSubmit will receive them */
function ValuesPanel(props: { submitted: boolean }) {
  const values = useFormValues();
  return (
    <div className="flex min-w-0 flex-col border-t bg-zinc-950 [color-scheme:dark] md:border-t-0 md:border-l">
      <div className="border-b border-white/10 px-4 py-2 font-mono text-[11px] text-zinc-400">
        {props.submitted ? 'onSubmit(values)' : 'useFormValues()'}
      </div>
      <pre className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-emerald-300/90">
        {JSON.stringify(values, null, 2)}
      </pre>
    </div>
  );
}

function BookingForm() {
  const [submitted, setSubmitted] = useState(false);
  const { handleSubmit } = useForm({
    initialValues: {
      destination: 'denver',
      travelers: [{ name: 'Ada Lovelace', age: 36 }, { name: 'Alan Turing' }],
    },
    schema: bookingSchema,
    mode: 'onChange',
    // Keep the page where it is; the visitor didn't ask to be scrolled
    shouldFocusError: false,
    onSubmit: () => setSubmitted(true),
  });
  const { fieldArrayProps, append, swap, remove, error } = useFieldArray({
    name: 'travelers',
    fieldNames: ['name', 'age', 'passport'],
  });

  return (
    <div className="grid md:grid-cols-[1.35fr_1fr]">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4 p-4 sm:p-5"
      >
        <DestinationSelect />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs text-fd-muted-foreground">
            Travelers
          </legend>
          {fieldArrayProps.rowIds.map((rowId, index) => (
            <Traveler
              key={rowId}
              rowId={rowId}
              index={index}
              onMoveUp={index > 0 ? () => swap(index - 1, index) : undefined}
              onRemove={() => remove(index)}
            />
          ))}
          {error && (
            <p className="text-xs text-rose-600 dark:text-rose-300">{error}</p>
          )}
          <button
            type="button"
            onClick={() => append()}
            className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground"
          >
            <Plus className="size-3.5" /> Add traveler
          </button>
        </fieldset>
        <button
          type="submit"
          className="mt-auto inline-flex h-9 items-center justify-center rounded-md bg-fd-foreground text-sm font-medium text-fd-background transition hover:opacity-90"
        >
          Book trip
        </button>
      </form>
      <ValuesPanel submitted={submitted} />
    </div>
  );
}

/** Sets an input's value the way typing does, so React and the form see a real change */
function typeInto(element: HTMLInputElement, value: string) {
  const prototype = Object.getPrototypeOf(element);
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(
    element,
    value
  );
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

export function TripDemo() {
  const rootRef = useRef<HTMLDivElement>(null);

  // A short scripted visit: an underage traveler, a trip abroad, then booking
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let stopped = false;
    const at = (ms: number, step: () => void) =>
      timers.push(setTimeout(() => !stopped && step(), ms));
    const find = <T extends Element>(selector: string) =>
      root.querySelector<T>(selector);

    const age = () =>
      find<HTMLInputElement>('[data-traveler="1"] [data-field="age"]');
    at(900, () => age() && typeInto(age()!, '1'));
    at(1150, () => age() && typeInto(age()!, '16'));
    // Open the destination list and pick Kyoto, the way a visitor would
    at(2300, () =>
      find<HTMLButtonElement>('[data-field="destination"]')?.click()
    );
    at(3000, () => find<HTMLElement>('[data-value="kyoto"]')?.click());
    at(4200, () => find<HTMLButtonElement>('button[type="submit"]')?.click());

    const stop = () => {
      stopped = true;
      timers.forEach(clearTimeout);
    };
    root.addEventListener('pointerdown', stop, { once: true });
    root.addEventListener('focusin', (e) => e.isTrusted && stop(), {
      once: true,
    });
    return stop;
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <div
        aria-hidden
        className="absolute -inset-x-8 -inset-y-6 -z-10 rounded-[2.5rem] bg-gradient-to-b from-emerald-500/15 via-teal-500/5 to-transparent blur-2xl"
      />
      <div className="overflow-hidden rounded-2xl border bg-fd-background/90 text-left shadow-2xl shadow-emerald-950/10 backdrop-blur">
        <div className="flex items-center gap-3 border-b bg-fd-muted/40 px-4 py-2.5">
          <div className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-fd-foreground/15" />
            <span className="size-2.5 rounded-full bg-fd-foreground/15" />
            <span className="size-2.5 rounded-full bg-fd-foreground/15" />
          </div>
          <span className="truncate font-mono text-xs text-fd-muted-foreground">
            acme.travel/booking
          </span>
        </div>
        <FormProvider>
          <BookingForm />
        </FormProvider>
      </div>
    </div>
  );
}
