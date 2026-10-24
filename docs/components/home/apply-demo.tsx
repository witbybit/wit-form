'use client';

import { Check, ChevronDown, Plus, Upload, X } from 'lucide-react';
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
  useForm,
  useFormValues,
  type IAncestorInput,
} from 'wit-form';
import { z } from 'zod';
import { cn } from '@/lib/cn';

const countries = [
  { value: 'us', label: 'United States' },
  { value: 'gb', label: 'United Kingdom' },
  { value: 'de', label: 'Germany' },
  { value: 'in', label: 'India' },
  { value: 'jp', label: 'Japan' },
];

const roles = ['Frontend', 'Backend', 'Design'];
const skillOptions = [
  'React',
  'TypeScript',
  'Node.js',
  'GraphQL',
  'Figma',
  'Testing',
];

// One schema for the whole application. Its errors land on the matching fields, row by row
const applicationSchema = z.object({
  name: z.string('Enter your name').min(1, 'Enter your name'),
  contact: z.object({
    email: z.email('Enter a valid email'),
    phone: z.string().optional(),
  }),
  country: z.string('Pick a country'),
  role: z.string('Pick a role'),
  years: z.number(),
  skills: z.array(z.string()).min(1, 'Pick at least one skill'),
  history: z.array(
    z.object({
      company: z.string('Required').min(1, 'Required'),
      title: z.string('Required').min(1, 'Required'),
    })
  ),
  resume: z.object(
    { name: z.string(), size: z.number() },
    'Attach your resume'
  ),
  startDate: z.string('Pick a date').min(1, 'Pick a date'),
  coverLetter: z.string().max(280, 'Keep it under 280 characters').optional(),
  terms: z.literal(true, 'Please accept the terms'),
});

const inputClass =
  'h-8 w-full min-w-0 rounded-md border bg-fd-background px-2 text-sm text-fd-foreground outline-none transition-colors placeholder:text-fd-muted-foreground/60 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 aria-invalid:border-rose-500/60';

function FieldError(props: { id: string; error?: string | null }) {
  if (!props.error) return null;
  return (
    <p id={props.id} className="mt-1 text-xs text-rose-600 dark:text-rose-300">
      {props.error}
    </p>
  );
}

function Label(props: { htmlFor?: string; id?: string; children: string }) {
  return (
    <label
      htmlFor={props.htmlFor}
      id={props.id}
      className="mb-1 block text-xs text-fd-muted-foreground"
    >
      {props.children}
    </label>
  );
}

/* Text-like inputs: text, email, phone and date */

function Input(props: {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'date';
  placeholder?: string;
  ancestors?: IAncestorInput[];
  hideLabel?: boolean;
  className?: string;
}) {
  const id = useId();
  const { fieldValue, setFieldValue, onBlur, error, ref } = useField<string>({
    name: props.name,
    ancestors: props.ancestors,
  });
  return (
    <div className={props.className}>
      {!props.hideLabel && <Label htmlFor={id}>{props.label}</Label>}
      <input
        id={id}
        ref={ref}
        type={props.type ?? 'text'}
        data-field={props.name}
        aria-label={props.hideLabel ? props.label : undefined}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        placeholder={props.placeholder}
        value={fieldValue ?? ''}
        onChange={(e) => setFieldValue(e.target.value)}
        onBlur={onBlur}
        className={inputClass}
      />
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

/**
 * A select in the style of shadcn/ui: a trigger button and a list that opens below it.
 * Arrow keys, Home and End move, Enter or Space picks, Escape closes.
 */
function Select(props: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  const { fieldValue, setFieldValue, onBlur, error, ref } = useField<string>({
    name: props.name,
  });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const baseId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const { options } = props;
  const selected = options.findIndex((option) => option.value === fieldValue);

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
    setFieldValue(options[index].value);
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
    <div ref={rootRef} className="relative">
      <Label id={`${baseId}-label`}>{props.label}</Label>
      <button
        ref={(element) => {
          triggerRef.current = element;
          ref(element);
        }}
        type="button"
        role="combobox"
        data-field={props.name}
        aria-labelledby={`${baseId}-label`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${baseId}-list`}
        aria-activedescendant={open ? `${baseId}-option-${active}` : undefined}
        aria-invalid={!!error}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        className={cn(
          inputClass,
          'flex items-center justify-between text-left',
          selected < 0 && 'text-fd-muted-foreground/60',
          open && 'border-emerald-500/60 ring-2 ring-emerald-500/20'
        )}
      >
        {selected >= 0 ? options[selected].label : props.placeholder}
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
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${baseId}-option-${index}`}
              role="option"
              data-value={option.value}
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
              {option.label}
            </li>
          ))}
        </ul>
      )}
      <FieldError id={`${baseId}-error`} error={error} />
    </div>
  );
}

/** A single choice, shown as a segmented control */
function RoleField() {
  const id = useId();
  const { fieldValue, setFieldValue, error } = useField<string>({
    name: 'role',
  });
  return (
    <div>
      <Label id={id}>Role</Label>
      <div
        role="radiogroup"
        aria-labelledby={id}
        className="grid grid-cols-3 rounded-md border bg-fd-muted/40 p-0.5"
      >
        {roles.map((role) => (
          <button
            key={role}
            type="button"
            role="radio"
            data-value={role}
            aria-checked={fieldValue === role}
            onClick={() => setFieldValue(role)}
            className={cn(
              'h-7 rounded text-sm transition',
              fieldValue === role
                ? 'bg-fd-background font-medium shadow-sm'
                : 'text-fd-muted-foreground hover:text-fd-foreground'
            )}
          >
            {role}
          </button>
        ))}
      </div>
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

/** A number, set with a slider */
function YearsField() {
  const id = useId();
  const { fieldValue = 0, setFieldValue } = useField<number>({ name: 'years' });
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-fd-muted-foreground">
        <label htmlFor={id}>Years of experience</label>
        <span className="font-medium text-fd-foreground tabular-nums">
          {fieldValue === 15 ? '15+' : fieldValue}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={15}
        value={fieldValue}
        onChange={(e) => setFieldValue(Number(e.target.value))}
        className="w-full accent-emerald-600"
      />
    </div>
  );
}

/** A list of strings, picked with toggle chips */
function SkillsField() {
  const id = useId();
  const {
    fieldValue = [],
    setFieldValue,
    error,
  } = useField<string[]>({
    name: 'skills',
  });
  return (
    <div>
      <Label id={id}>Skills</Label>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-1.5">
        {skillOptions.map((skill) => {
          const on = fieldValue.includes(skill);
          return (
            <button
              key={skill}
              type="button"
              data-value={skill}
              aria-pressed={on}
              onClick={() =>
                setFieldValue(
                  on
                    ? fieldValue.filter((s) => s !== skill)
                    : [...fieldValue, skill]
                )
              }
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs transition',
                on
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'text-fd-muted-foreground hover:text-fd-foreground'
              )}
            >
              {skill}
            </button>
          );
        })}
      </div>
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

type ResumeMeta = { name: string; size: number };

/** A file: the value keeps its name and size; the File itself rides along as extra info */
function ResumeField() {
  const id = useId();
  const { fieldValue, setFieldValue, error, ref } = useField<
    ResumeMeta | undefined,
    { file: File }
  >({ name: 'resume' });
  return (
    <div>
      <Label htmlFor={id}>Resume</Label>
      <label
        className={cn(
          'flex h-9 cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 text-sm transition hover:bg-fd-accent focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/20',
          error && 'border-rose-500/60'
        )}
      >
        <Upload className="size-4 shrink-0 text-fd-muted-foreground" />
        <span
          className={cn('truncate', !fieldValue && 'text-fd-muted-foreground')}
        >
          {fieldValue
            ? `${fieldValue.name} · ${Math.max(1, Math.round(fieldValue.size / 1024))} KB`
            : 'Upload a PDF'}
        </span>
        <input
          id={id}
          ref={ref}
          type="file"
          data-field="resume"
          accept=".pdf,.doc,.docx"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file)
              setFieldValue({ name: file.name, size: file.size }, { file });
          }}
        />
      </label>
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

function CoverLetterField() {
  const id = useId();
  const {
    fieldValue = '',
    setFieldValue,
    onBlur,
    error,
  } = useField<string>({
    name: 'coverLetter',
  });
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-fd-muted-foreground">
        <label htmlFor={id}>Cover letter</label>
        <span
          className={cn(
            'tabular-nums',
            fieldValue.length > 280 && 'text-rose-500'
          )}
        >
          {fieldValue.length}/280
        </span>
      </div>
      <textarea
        data-field="coverLetter"
        id={id}
        rows={2}
        value={fieldValue}
        aria-invalid={!!error}
        onChange={(e) => setFieldValue(e.target.value)}
        onBlur={onBlur}
        placeholder="Why this role?"
        className={cn(inputClass, 'h-auto resize-none py-1.5')}
      />
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

function TermsField() {
  const id = useId();
  const { fieldValue, setFieldValue, error, ref } = useField<boolean>({
    name: 'terms',
  });
  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-2 text-sm">
        <input
          id={id}
          ref={ref}
          type="checkbox"
          data-field="terms"
          checked={!!fieldValue}
          aria-invalid={!!error}
          onChange={(e) => setFieldValue(e.target.checked)}
          className="size-4 accent-emerald-600"
        />
        I agree to the terms
      </label>
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

function NewsletterSwitch() {
  const { fieldValue, setFieldValue } = useField<boolean>({
    name: 'newsletter',
  });
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      Email me about other roles
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

/* Work history: a list of rows, each with its own fields */

function Position(props: {
  rowId: number;
  index: number;
  onRemove: () => void;
}) {
  const ancestors = useMemo<IAncestorInput[]>(
    () => [{ name: 'history', rowId: props.rowId }],
    [props.rowId]
  );
  return (
    <div className="flex items-start gap-2" data-position={props.index}>
      <Input
        name="company"
        label={`Company ${props.index + 1}`}
        placeholder="Company"
        ancestors={ancestors}
        hideLabel
        className="min-w-0 flex-1"
      />
      <Input
        name="title"
        label={`Job title ${props.index + 1}`}
        placeholder="Job title"
        ancestors={ancestors}
        hideLabel
        className="min-w-0 flex-1"
      />
      <button
        type="button"
        aria-label={`Remove position ${props.index + 1}`}
        onClick={props.onRemove}
        className="grid size-8 shrink-0 place-items-center rounded-md text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

/* Steps */

function ProfileStep() {
  return (
    <div className="flex flex-col gap-3">
      <Input name="name" label="Full name" placeholder="Grace Hopper" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          name="contact.email"
          label="Email"
          type="email"
          placeholder="you@mail.com"
        />
        <Input
          name="contact.phone"
          label="Phone"
          type="tel"
          placeholder="Optional"
        />
      </div>
      <Select
        name="country"
        label="Country"
        options={countries}
        placeholder="Pick a country"
      />
    </div>
  );
}

function ExperienceStep(props: { history: ReturnType<typeof useFieldArray> }) {
  const { fieldArrayProps, append, remove } = props.history;
  return (
    <div className="flex flex-col gap-3">
      <RoleField />
      <YearsField />
      <SkillsField />
      <div>
        <Label>Work history</Label>
        <div className="flex flex-col gap-2">
          {fieldArrayProps.rowIds.map((rowId, index) => (
            <Position
              key={rowId}
              rowId={rowId}
              index={index}
              onRemove={() => remove(index)}
            />
          ))}
          <button
            type="button"
            data-action="add-position"
            onClick={() => append()}
            className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground"
          >
            <Plus className="size-3.5" /> Add position
          </button>
        </div>
      </div>
    </div>
  );
}

function FinishStep() {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <ResumeField />
        <Input name="startDate" label="Earliest start date" type="date" />
      </div>
      <CoverLetterField />
      <TermsField />
      <NewsletterSwitch />
    </div>
  );
}

const steps = [
  {
    label: 'Profile',
    fields: ['name', 'contact.email', 'contact.phone', 'country'],
  },
  { label: 'Experience', fields: ['role', 'years', 'skills', 'history'] },
  { label: 'Finish', fields: ['resume', 'startDate', 'coverLetter', 'terms'] },
];

/** The live values, nested exactly as onSubmit will receive them */
function ValuesPanel(props: { submitted: boolean }) {
  const values = useFormValues();
  return (
    <div className="flex min-w-0 flex-col border-t bg-zinc-950 [color-scheme:dark] md:border-t-0 md:border-l">
      <div className="border-b border-white/10 px-4 py-2 font-mono text-[11px] text-zinc-400">
        {props.submitted ? 'onSubmit(values)' : 'useFormValues()'}
      </div>
      <pre className="max-h-[30rem] flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-emerald-300/90">
        {JSON.stringify(values, null, 2)}
      </pre>
    </div>
  );
}

function ApplicationWizard() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const { handleSubmit, validateFields } = useForm({
    initialValues: {
      years: 3,
      skills: [],
      history: [{ company: 'Initech', title: 'Engineer' }],
      newsletter: true,
    },
    schema: applicationSchema,
    mode: 'onChange',
    // Steps that aren't shown keep their values
    skipUnregister: true,
    // Keep the page where it is; the visitor didn't ask to be scrolled
    shouldFocusError: false,
    onSubmit: () => setSubmitted(true),
  });
  // The list lives here, so "Next" can check each row's fields
  const history = useFieldArray({
    name: 'history',
    fieldNames: ['company', 'title'],
  });

  const stepFields = () => [
    ...steps[step].fields,
    ...(step === 1
      ? history.fieldArrayProps.rowIds.flatMap((rowId) =>
          ['company', 'title'].map((name) => ({
            name,
            type: 'field' as const,
            ancestors: [{ name: 'history', rowId }],
          }))
        )
      : []),
  ];

  // "Next" checks only the fields of the current step
  const next = () => {
    if (validateFields(stepFields()).length === 0) setStep(step + 1);
  };

  return (
    <div className="grid md:grid-cols-[1.35fr_1fr]">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex min-h-[27rem] flex-col gap-5 p-4 sm:p-5"
      >
        <ol className="flex items-center gap-2 text-xs">
          {steps.map(({ label }, index) => (
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
          {step === 0 && <ProfileStep />}
          {step === 1 && <ExperienceStep history={history} />}
          {step === 2 && <FinishStep />}
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
              {submitted ? 'Submitted ✓' : 'Submit application'}
            </button>
          )}
        </div>
      </form>
      <ValuesPanel submitted={submitted} />
    </div>
  );
}

/** Sets an input's value the way typing does, so React and the form see a real change */
function typeInto(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
) {
  const prototype = Object.getPrototypeOf(element);
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(
    element,
    value
  );
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

export function ApplyDemo() {
  const rootRef = useRef<HTMLDivElement>(null);

  // A scripted visit that runs into validation twice, fixes it and submits:
  // profile, experience with an empty position, then finish with missing fields
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
    let time = 600;
    const then = (delay: number, step: () => void) => {
      time += delay;
      timers.push(setTimeout(() => !stopped && step(), time));
    };
    const find = <T extends Element>(selector: string) =>
      root.querySelector<T>(selector);
    const click = (selector: string) => find<HTMLElement>(selector)?.click();
    // Attaches a file the way a drop would, through the input's own file list
    const attach = (selector: string, name: string) => {
      const input = find<HTMLInputElement>(selector);
      if (!input) return;
      const transfer = new DataTransfer();
      transfer.items.add(
        new File([new Uint8Array(48_000)], name, { type: 'application/pdf' })
      );
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const type = (selector: string, text: string) =>
      [...text].forEach((_, i) =>
        then(45, () => {
          const input = find<HTMLInputElement | HTMLTextAreaElement>(selector);
          if (input) typeInto(input, text.slice(0, i + 1));
        })
      );

    type('[data-field="name"]', 'Grace Hopper');
    type('[data-field="contact.email"]', 'grace@mail.io');
    then(500, () => click('[data-field="country"]'));
    then(700, () => click('[data-value="us"]'));
    then(900, () => click('[data-action="next"]'));
    then(900, () => click('[data-value="Frontend"]'));
    then(600, () => click('[data-value="React"]'));
    then(400, () => click('[data-value="TypeScript"]'));
    then(700, () => click('[data-action="add-position"]'));
    then(1000, () => click('[data-action="next"]'));

    // Fix the empty position and carry on
    then(1300, () => {});
    type('[data-position="1"] [data-field="company"]', 'Hooli');
    type('[data-position="1"] [data-field="title"]', 'Staff engineer');
    then(700, () => click('[data-action="next"]'));

    // Try to submit too early, then fill in what's missing and submit
    then(1000, () => click('button[type="submit"]'));
    then(1300, () => attach('[data-field="resume"]', 'grace-hopper.pdf'));
    then(700, () => {
      const date = find<HTMLInputElement>('[data-field="startDate"]');
      if (date) typeInto(date, '2026-12-01');
    });
    type('[data-field="coverLetter"]', 'I build compilers and teach.');
    then(500, () => click('[data-field="terms"]'));
    then(900, () => click('button[type="submit"]'));

    const stop = () => {
      stopped = true;
      timers.forEach(clearTimeout);
    };
    // Only the visitor's own pointer or keys take over; the script's clicks and focus don't
    root.addEventListener('pointerdown', stop, { once: true });
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
            acme.jobs/apply
          </span>
        </div>
        <FormProvider>
          <ApplicationWizard />
        </FormProvider>
      </div>
    </div>
  );
}
