'use client';

import { ArrowUp, Check, ChevronDown, Minus, Plus, X } from 'lucide-react';
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
  tripType: z.enum(['leisure', 'business']),
  nights: z.number().min(1),
  travelers: z
    .array(
      z.object({
        name: z.string('Required').min(1, 'Required'),
        age: z.number('Enter an age').min(18, 'Must be 18+'),
      })
    )
    .min(1, 'Add a traveler'),
  contact: z.object({ email: z.email('Enter a valid email') }),
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

/* Small inputs for other kinds of values: a choice, a number, booleans and a list of strings */

function TripType() {
  const { fieldValue, setFieldValue } = useField<string>({ name: 'tripType' });
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <span id={id} className="text-xs text-fd-muted-foreground">
        Trip type
      </span>
      <div
        role="radiogroup"
        aria-labelledby={id}
        className="grid grid-cols-2 rounded-md border bg-fd-muted/40 p-0.5"
      >
        {['Leisure', 'Business'].map((label) => {
          const value = label.toLowerCase();
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={fieldValue === value}
              onClick={() => setFieldValue(value)}
              className={cn(
                'h-7 rounded text-sm transition',
                fieldValue === value
                  ? 'bg-fd-background font-medium shadow-sm'
                  : 'text-fd-muted-foreground hover:text-fd-foreground'
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Nights() {
  const { fieldValue = 1, setFieldValue } = useField<number>({
    name: 'nights',
  });
  const id = useId();
  const step = (by: number) =>
    setFieldValue(Math.min(30, Math.max(1, fieldValue + by)));
  return (
    <div className="flex flex-col gap-1">
      <span id={id} className="text-xs text-fd-muted-foreground">
        Nights
      </span>
      <div
        role="group"
        aria-labelledby={id}
        className="flex h-8 items-center justify-between rounded-md border bg-fd-background px-1"
      >
        <button
          type="button"
          aria-label="One night fewer"
          onClick={() => step(-1)}
          className="grid size-6 place-items-center rounded text-fd-muted-foreground hover:bg-fd-accent"
        >
          <Minus className="size-3.5" />
        </button>
        <span className="text-sm tabular-nums" aria-live="polite">
          {fieldValue}
        </span>
        <button
          type="button"
          aria-label="One more night"
          onClick={() => step(1)}
          className="grid size-6 place-items-center rounded text-fd-muted-foreground hover:bg-fd-accent"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function Switch(props: { name: string; label: string }) {
  const { fieldValue, setFieldValue } = useField<boolean>({
    name: props.name,
  });
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      {props.label}
      <button
        type="button"
        role="switch"
        aria-checked={!!fieldValue}
        onClick={() => setFieldValue(!fieldValue)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition',
          fieldValue ? 'bg-emerald-600' : 'bg-fd-muted-foreground/30'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition',
            fieldValue && 'translate-x-4'
          )}
        />
      </button>
    </label>
  );
}

function Checkbox(props: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
        className="size-4 accent-emerald-600"
      />
      {props.label}
    </label>
  );
}

const extras = [
  { value: 'insurance', label: 'Travel insurance' },
  { value: 'pickup', label: 'Airport pickup' },
  { value: 'lounge', label: 'Lounge access' },
];

/** One field whose value is a list of strings */
function Extras() {
  const { fieldValue = [], setFieldValue } = useField<string[]>({
    name: 'extras',
  });
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1 text-xs text-fd-muted-foreground">Extras</legend>
      {extras.map((extra) => (
        <Checkbox
          key={extra.value}
          label={extra.label}
          checked={fieldValue.includes(extra.value)}
          onChange={(checked) =>
            setFieldValue(
              checked
                ? [...fieldValue, extra.value]
                : fieldValue.filter((value) => value !== extra.value)
            )
          }
        />
      ))}
    </fieldset>
  );
}

function Newsletter() {
  const { fieldValue, setFieldValue } = useField<boolean>({
    name: 'preferences.newsletter',
  });
  return (
    <Checkbox
      label="Send me travel tips"
      checked={!!fieldValue}
      onChange={setFieldValue}
    />
  );
}

/* The steps */

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

function TripStep() {
  return (
    <div className="flex flex-col gap-4">
      <DestinationSelect />
      <div className="grid grid-cols-2 gap-3">
        <TripType />
        <Nights />
      </div>
      <Switch name="flexibleDates" label="My dates are flexible" />
    </div>
  );
}

function TravelersStep(props: { travelers: ReturnType<typeof useFieldArray> }) {
  const { fieldArrayProps, append, swap, remove, error } = props.travelers;
  return (
    <div className="flex flex-col gap-2">
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
    </div>
  );
}

function ExtrasStep() {
  return (
    <div className="flex flex-col gap-4">
      <Extras />
      <div className="grid gap-2 sm:grid-cols-2">
        <Field name="contact.email" label="Email" placeholder="Email" />
        <Field name="contact.phone" label="Phone" placeholder="Phone" />
      </div>
      <Newsletter />
    </div>
  );
}

const steps = ['Trip', 'Travelers', 'Extras'];

/** The live values, nested exactly as onSubmit will receive them */
function ValuesPanel(props: { submitted: boolean }) {
  const values = useFormValues();
  return (
    <div className="flex min-w-0 flex-col border-t bg-zinc-950 [color-scheme:dark] md:border-t-0 md:border-l">
      <div className="border-b border-white/10 px-4 py-2 font-mono text-[11px] text-zinc-400">
        {props.submitted ? 'onSubmit(values)' : 'useFormValues()'}
      </div>
      <pre className="max-h-[26rem] flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-emerald-300/90">
        {JSON.stringify(values, null, 2)}
      </pre>
    </div>
  );
}

function BookingWizard() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const { handleSubmit, validateFields } = useForm({
    initialValues: {
      destination: 'denver',
      tripType: 'leisure',
      nights: 4,
      flexibleDates: false,
      travelers: [{ name: 'Ada Lovelace', age: 36 }, { name: 'Alan Turing' }],
      extras: ['insurance'],
      preferences: { newsletter: true },
    },
    schema: bookingSchema,
    mode: 'onChange',
    // Steps that aren't shown keep their values
    skipUnregister: true,
    // Keep the page where it is; the visitor didn't ask to be scrolled
    shouldFocusError: false,
    onSubmit: () => setSubmitted(true),
  });
  // The list lives here, so "Next" can check each row's fields
  const travelers = useFieldArray({
    name: 'travelers',
    fieldNames: ['name', 'age', 'passport'],
  });
  const abroad = useAbroad();

  const stepFields = () => {
    if (step === 0) return ['destination', 'tripType', 'nights'];
    if (step === 2) return ['contact.email'];
    const rowFields = abroad ? ['name', 'age', 'passport'] : ['name', 'age'];
    return [
      'travelers',
      ...travelers.fieldArrayProps.rowIds.flatMap((rowId) =>
        rowFields.map((name) => ({
          name,
          type: 'field' as const,
          ancestors: [{ name: 'travelers', rowId }],
        }))
      ),
    ];
  };

  // "Next" checks only the fields of the current step
  const next = () => {
    if (validateFields(stepFields()).length === 0) setStep(step + 1);
  };

  return (
    <div className="grid md:grid-cols-[1.35fr_1fr]">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex min-h-[24rem] flex-col gap-5 p-4 sm:p-5"
      >
        <ol className="flex items-center gap-2 text-xs">
          {steps.map((label, index) => (
            <li key={label} className="flex items-center gap-2">
              <button
                type="button"
                disabled={index > step}
                aria-current={index === step ? 'step' : undefined}
                onClick={() => setStep(index)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-0.5 transition',
                  index === step
                    ? 'bg-fd-accent font-medium text-fd-foreground'
                    : 'text-fd-muted-foreground enabled:hover:text-fd-foreground'
                )}
              >
                <span
                  className={cn(
                    'grid size-5 place-items-center rounded-full text-[10px] font-semibold',
                    index < step
                      ? 'bg-emerald-600 text-white'
                      : index === step
                        ? 'bg-fd-foreground text-fd-background'
                        : 'border'
                  )}
                >
                  {index < step ? <Check className="size-3" /> : index + 1}
                </span>
                {label}
              </button>
              {index < steps.length - 1 && (
                <span aria-hidden className="h-px w-4 bg-fd-border" />
              )}
            </li>
          ))}
        </ol>

        <div className="flex-1">
          {step === 0 && <TripStep />}
          {step === 1 && <TravelersStep travelers={travelers} />}
          {step === 2 && <ExtrasStep />}
        </div>

        <div className="flex gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="h-9 rounded-md px-4 text-sm text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground"
            >
              Back
            </button>
          )}
          {step < steps.length - 1 ? (
            <button
              type="button"
              data-action="next"
              onClick={next}
              className="ml-auto h-9 rounded-md bg-fd-foreground px-5 text-sm font-medium text-fd-background transition hover:opacity-90"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              className="ml-auto h-9 rounded-md bg-fd-foreground px-5 text-sm font-medium text-fd-background transition hover:opacity-90"
            >
              {submitted ? 'Booked ✓' : 'Book trip'}
            </button>
          )}
        </div>
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

  // A short scripted visit: pick Kyoto, move on, add an underage traveler, try to continue
  useEffect(() => {
    const root = rootRef.current;
    if (
      !root ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    let stopped = false;
    const at = (ms: number, step: () => void) =>
      timers.push(setTimeout(() => !stopped && step(), ms));
    const find = <T extends Element>(selector: string) =>
      root.querySelector<T>(selector);
    const click = (selector: string) => find<HTMLElement>(selector)?.click();
    const age = () =>
      find<HTMLInputElement>('[data-traveler="1"] [data-field="age"]');

    at(900, () => click('[data-field="destination"]'));
    at(1600, () => click('[data-value="kyoto"]'));
    at(2600, () => click('[data-action="next"]'));
    at(3500, () => age() && typeInto(age()!, '1'));
    at(3750, () => age() && typeInto(age()!, '16'));
    at(5000, () => click('[data-action="next"]'));

    const stop = () => {
      stopped = true;
      timers.forEach(clearTimeout);
    };
    root.addEventListener('pointerdown', stop, { once: true });
    // Only the visitor's own pointer or keys take over; the script's clicks and focus don't
    root.addEventListener('keydown', stop, { once: true });
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
          <BookingWizard />
        </FormProvider>
      </div>
    </div>
  );
}
