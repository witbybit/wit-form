'use client';

/**
 * Presentational helpers shared by the examples. Nothing in this file is specific to wit-form
 * except FormInspector, which shows the live form state next to each example.
 */
import { useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useFormState, useFormValuesAndExtraInfos, useIsDirty } from 'wit-form';

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Lays out a demo with an optional side panel, which moves below it in narrow containers */
export function Example(props: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="@container font-sans text-slate-800">
      <div className="grid gap-6 @3xl:grid-cols-5">
        <div className="min-w-0 @3xl:col-span-3">{props.children}</div>
        {props.aside && (
          <aside className="min-w-0 @3xl:col-span-2">{props.aside}</aside>
        )}
      </div>
    </div>
  );
}

export function Card(props: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${
        props.className ?? ''
      }`}
    >
      {props.children}
    </div>
  );
}

const buttonVariants = {
  primary:
    'bg-emerald-700 text-white hover:bg-emerald-600 focus-visible:outline-emerald-700 disabled:bg-emerald-300',
  secondary:
    'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  danger:
    'bg-white text-red-600 ring-1 ring-inset ring-red-200 hover:bg-red-50 disabled:text-red-300',
  ghost: 'text-slate-600 hover:bg-slate-100 disabled:text-slate-300',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants;
  size?: 'sm' | 'md';
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1 rounded-md font-medium shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed ${
        size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3.5 py-2 text-sm'
      } ${buttonVariants[variant]} ${className ?? ''}`}
      {...rest}
    />
  );
}

export function Alert(props: {
  tone: 'error' | 'success' | 'info';
  title?: string;
  children?: ReactNode;
}) {
  const tones = {
    error: 'bg-red-50 text-red-800 ring-red-200',
    success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    info: 'bg-sky-50 text-sky-800 ring-sky-200',
  };
  return (
    <div
      role={props.tone === 'error' ? 'alert' : 'status'}
      className={`rounded-md p-3 text-sm ring-1 ring-inset ${tones[props.tone]}`}
    >
      {props.title && <p className="font-medium">{props.title}</p>}
      {props.children && <div className="mt-1">{props.children}</div>}
    </div>
  );
}

/** Counts how many times its parent has rendered. Used to show what re-renders as you type. */
export function RenderCount() {
  const renders = useRef(0);
  renders.current += 1;
  return (
    <span
      title="Number of renders"
      className="inline-block min-w-[1.75rem] rounded bg-amber-100 px-1 text-center font-mono text-[10px] leading-4 text-amber-800 tabular-nums"
    >
      {renders.current}
    </span>
  );
}

function Json(props: { value: unknown }) {
  return (
    <pre className="max-h-96 overflow-auto rounded-md bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-100">
      {JSON.stringify(props.value, null, 2) ?? 'undefined'}
    </pre>
  );
}

/**
 * Shows the live values, the dirty state and the last submitted values of the surrounding form.
 * Must be rendered inside the form's FormProvider.
 */
export function FormInspector(props: {
  submitted?: unknown;
  showExtraInfos?: boolean;
  /** Show isValid, isValidating and submitCount from useFormState */
  showStatus?: boolean;
}) {
  const { values, extraInfos } = useFormValuesAndExtraInfos();
  const isDirty = useIsDirty();
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Form state</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            isDirty
              ? 'bg-amber-100 text-amber-800'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {isDirty ? 'Dirty' : 'Pristine'}
        </span>
      </div>
      {props.showStatus && <FormStatus />}
      <section>
        <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Live values
        </h4>
        <Json value={values} />
      </section>
      {props.showExtraInfos && (
        <section>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Live extra infos
          </h4>
          <Json value={extraInfos} />
        </section>
      )}
      <section>
        <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Last submit
        </h4>
        {props.submitted === undefined ? (
          <p className="text-slate-500">Not submitted yet.</p>
        ) : (
          <Json value={props.submitted} />
        )}
      </section>
    </div>
  );
}

/** A few properties of useFormState. Only these re-render this component. */
function FormStatus() {
  const { isValid, isValidating, submitCount } = useFormState();
  const items = [
    ['Valid', isValid ? 'Yes' : 'No'],
    ['Validating', isValidating ? 'Yes' : 'No'],
    ['Submits', String(submitCount)],
  ];
  return (
    <dl className="grid grid-cols-3 gap-2 text-center">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-md bg-slate-50 px-2 py-1.5">
          <dt className="text-[11px] uppercase tracking-wide text-slate-500">
            {label}
          </dt>
          <dd className="font-medium text-slate-900 tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
