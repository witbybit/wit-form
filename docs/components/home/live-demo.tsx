'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { FormProvider, useField, useForm, useFormValues } from 'wit-form';
import { cn } from '@/lib/cn';
import { Window } from './primitives';

/**
 * Shows how many times its parent component has committed, and flashes on every new one.
 * It writes to the DOM from an effect so counting never causes a render of its own.
 */
function RenderBadge(props: { label?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const count = useRef(0);

  useEffect(() => {
    count.current += 1;
    const el = ref.current;
    if (!el) return;
    el.textContent = String(count.current);
    if (
      count.current > 1 &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      el.animate(
        [
          {
            backgroundColor: 'rgb(251 191 36)',
            color: 'rgb(24 24 27)',
            transform: 'scale(1.25)',
          },
          {
            backgroundColor: 'rgb(251 191 36 / 0.12)',
            color: 'rgb(252 211 77)',
            transform: 'scale(1)',
          },
        ],
        { duration: 700, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
      );
    }
  });

  return (
    <span
      title={props.label ?? 'Renders'}
      className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-500"
    >
      <span className="sr-only">{props.label ?? 'Renders'}:</span>
      <span
        ref={ref}
        className="inline-block min-w-6 rounded bg-amber-400/12 px-1 text-center leading-4 tabular-nums text-amber-300"
      >
        0
      </span>
    </span>
  );
}

function DemoField(props: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  validate?: (value: string | undefined) => string | null;
}) {
  const id = useId();
  const { fieldValue, setFieldValue, onBlur, error } = useField<string>({
    name: props.name,
    validate: props.validate,
  });

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-medium text-zinc-300">
          {props.label}
        </label>
        <RenderBadge label={`${props.label} renders`} />
      </div>
      <input
        id={id}
        type={props.type ?? 'text'}
        value={fieldValue ?? ''}
        placeholder={props.placeholder}
        onChange={(e) => setFieldValue(e.target.value)}
        onBlur={onBlur}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          'block w-full rounded-md border bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 transition outline-none focus:bg-white/[0.06] focus:ring-2',
          error
            ? 'border-red-500/60 focus:ring-red-500/40'
            : 'border-white/10 focus:border-indigo-400/60 focus:ring-indigo-500/30'
        )}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

const required = (value: string | undefined) => (!value ? 'Required' : null);
const email = (value: string | undefined) => {
  if (!value) return 'Required';
  return /^\S+@\S+\.\S+$/.test(value) ? null : 'Enter a valid email';
};

/** Watches every value, so it re-renders on each keystroke, unlike the fields */
function ValuesPreview() {
  const values = useFormValues();
  return (
    <div className="border-t border-white/10 bg-black/30 px-5 py-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          useFormValues()
        </span>
        <RenderBadge label="Preview renders" />
      </div>
      <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-emerald-300/90">
        {JSON.stringify(values, null, 2)}
      </pre>
    </div>
  );
}

function SignupForm() {
  const [status, setStatus] = useState<'idle' | 'done'>('idle');
  const { handleSubmit, formState } = useForm({
    initialValues: { name: 'Ada Lovelace' },
    onSubmit: async () => {
      await new Promise((resolve) => setTimeout(resolve, 700));
      setStatus('done');
    },
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between rounded-md border border-dashed border-white/10 px-3 py-1.5">
          <span className="font-mono text-[10px] text-zinc-500">
            {'<SignupForm />'}
          </span>
          <RenderBadge label="Form renders" />
        </div>
        <DemoField name="name" label="Name" validate={required} />
        <DemoField
          name="email"
          label="Email"
          type="email"
          placeholder="ada@example.com"
          validate={email}
        />
        <button
          type="submit"
          disabled={formState.isSubmitting}
          className="inline-flex h-9 w-full items-center justify-center rounded-md bg-indigo-500 text-sm font-medium text-white transition hover:bg-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-300 outline-none active:scale-[0.99] disabled:opacity-60"
        >
          {formState.isSubmitting
            ? 'Submitting…'
            : status === 'done'
              ? 'Submitted ✓'
              : 'Submit'}
        </button>
      </div>
      <ValuesPreview />
    </form>
  );
}

export function LiveDemo() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-indigo-500/25 via-violet-500/10 to-transparent blur-2xl"
      />
      <Window
        title="signup-form.tsx"
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse" />
            live
          </span>
        }
      >
        <FormProvider>
          <SignupForm />
        </FormProvider>
      </Window>
      <p className="mt-3 text-center text-xs text-fd-muted-foreground">
        Type in a field. Only its counter, and the preview that watches it, go
        up.
      </p>
    </div>
  );
}
