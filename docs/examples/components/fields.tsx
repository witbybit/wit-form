'use client';

/**
 * Reusable field components built on `useField`.
 *
 * wit-form doesn't ship any UI. You write a small set of components like these once, styled
 * for your app, and every form reuses them. Each one subscribes to a single field, so typing
 * in it re-renders only that component.
 */
import { useId, useMemo, type ReactNode } from 'react';
import { useField, type IAncestorInput, type StandardSchemaV1 } from 'wit-form';

/** Returns an error message (or a promise of one), or null when the value is valid */
type Validator<T> = (
  value: T | undefined,
  other?: { values: any; extraInfos: any }
) => string | null | undefined | Promise<string | null | undefined>;

type DepFields = (string | { name: string; ancestors?: IAncestorInput[] })[];

interface BaseFieldProps<T> {
  /** Field path, e.g. `email` or `address.city` */
  name: string;
  label?: string;
  hint?: ReactNode;
  required?: boolean;
  validate?: Validator<T>;
  /** A Standard Schema (Zod, Valibot, ArkType, ...) for this field's value */
  schema?: StandardSchemaV1;
  /** Wait for typing to pause (in milliseconds) before validating, e.g. for server checks */
  debounceValidation?: number;
  /** Fields whose values are passed to `validate` as `other.values` */
  depFields?: DepFields;
  /** Only needed for fields inside a field array row */
  ancestors?: IAncestorInput[];
  defaultValue?: T;
  disabled?: boolean;
  /** Hide the label visually, e.g. in table cells. It is still read by screen readers. */
  hideLabel?: boolean;
  className?: string;
}

const isEmpty = (value: unknown) =>
  value === undefined || value === null || value === '' || value === false;

/** Combines the `required` check with a custom validator */
function useValidator<T>(
  required: boolean | undefined,
  validate: Validator<T> | undefined
): Validator<T> {
  return useMemo(
    () => (value, other) => {
      if (required && isEmpty(value)) return 'Required';
      return validate?.(value, other) ?? null;
    },
    [required, validate]
  );
}

const inputClass =
  'block w-full rounded-md border-0 bg-white py-1.5 px-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset disabled:bg-slate-50 disabled:text-slate-500';

function inputRing(error: unknown) {
  return error
    ? 'ring-red-300 focus:ring-red-500'
    : 'ring-slate-300 focus:ring-emerald-600';
}

function FieldShell(props: {
  id: string;
  label?: string;
  hideLabel?: boolean;
  required?: boolean;
  hint?: ReactNode;
  error?: string | null;
  /** An async validator is running */
  validating?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={props.className}>
      {props.label && (
        <label
          htmlFor={props.id}
          className={
            props.hideLabel
              ? 'sr-only'
              : 'mb-1 block text-sm font-medium text-slate-700'
          }
        >
          {props.label}
          {props.required && <span className="text-red-500"> *</span>}
        </label>
      )}
      {props.children}
      {props.validating ? (
        <p className="mt-1 text-xs text-slate-500" aria-live="polite">
          Checking…
        </p>
      ) : props.error ? (
        <p id={`${props.id}-error`} className="mt-1 text-xs text-red-600">
          {props.error}
        </p>
      ) : (
        props.hint && (
          <p id={`${props.id}-hint`} className="mt-1 text-xs text-slate-500">
            {props.hint}
          </p>
        )
      )}
    </div>
  );
}

function describedBy(id: string, error: unknown, hint: unknown) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export function TextField(
  props: BaseFieldProps<string> & {
    type?: 'text' | 'email' | 'password' | 'url' | 'tel' | 'date';
    placeholder?: string;
    autoComplete?: string;
    /** Called after the value changes, with the new value */
    onValueChange?: (value: string) => void;
    onBlur?: () => void;
  }
) {
  const id = useId();
  const { fieldValue, setFieldValue, onBlur, error, isValidating, ref } =
    useField<string>({
      name: props.name,
      ancestors: props.ancestors,
      defaultValue: props.defaultValue,
      depFields: props.depFields,
      validate: useValidator(props.required, props.validate),
      schema: props.schema,
      debounceValidation: props.debounceValidation,
    });
  return (
    <FieldShell id={id} error={error} validating={isValidating} {...props}>
      <input
        id={id}
        ref={ref}
        type={props.type ?? 'text'}
        className={`${inputClass} ${inputRing(error)}`}
        value={fieldValue ?? ''}
        placeholder={props.placeholder}
        autoComplete={props.autoComplete}
        disabled={props.disabled}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error, props.hint)}
        onChange={(e) => {
          setFieldValue(e.target.value);
          props.onValueChange?.(e.target.value);
        }}
        onBlur={() => {
          onBlur();
          props.onBlur?.();
        }}
      />
    </FieldShell>
  );
}

export function TextAreaField(
  props: BaseFieldProps<string> & { placeholder?: string; rows?: number }
) {
  const id = useId();
  const { fieldValue, setFieldValue, onBlur, error, isValidating, ref } =
    useField<string>({
      name: props.name,
      ancestors: props.ancestors,
      defaultValue: props.defaultValue,
      depFields: props.depFields,
      validate: useValidator(props.required, props.validate),
      schema: props.schema,
      debounceValidation: props.debounceValidation,
    });
  return (
    <FieldShell id={id} error={error} validating={isValidating} {...props}>
      <textarea
        id={id}
        ref={ref}
        rows={props.rows ?? 3}
        className={`${inputClass} ${inputRing(error)}`}
        value={fieldValue ?? ''}
        placeholder={props.placeholder}
        disabled={props.disabled}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error, props.hint)}
        onChange={(e) => setFieldValue(e.target.value)}
        onBlur={onBlur}
      />
    </FieldShell>
  );
}

/** Stores a `number`, or `undefined` while the input is empty */
export function NumberField(
  props: BaseFieldProps<number> & {
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    prefix?: string;
  }
) {
  const id = useId();
  const { fieldValue, setFieldValue, onBlur, error, isValidating, ref } =
    useField<number | undefined>({
      name: props.name,
      ancestors: props.ancestors,
      defaultValue: props.defaultValue,
      depFields: props.depFields,
      validate: useValidator(props.required, props.validate),
      schema: props.schema,
      debounceValidation: props.debounceValidation,
    });
  return (
    <FieldShell id={id} error={error} validating={isValidating} {...props}>
      <div className="relative">
        {props.prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-sm text-slate-500">
            {props.prefix}
          </span>
        )}
        <input
          id={id}
          ref={ref}
          type="number"
          inputMode="decimal"
          className={`${inputClass} ${inputRing(error)} ${
            props.prefix ? 'pl-6' : ''
          }`}
          value={fieldValue ?? ''}
          min={props.min}
          max={props.max}
          step={props.step}
          placeholder={props.placeholder}
          disabled={props.disabled}
          aria-invalid={!!error}
          aria-describedby={describedBy(id, error, props.hint)}
          onChange={(e) =>
            setFieldValue(
              e.target.value === '' ? undefined : e.target.valueAsNumber
            )
          }
          onBlur={onBlur}
        />
      </div>
    </FieldShell>
  );
}

export interface Option {
  label: string;
  value: string;
}

/**
 * Stores the option's `value`. The option's `label` is stored as the field's `extraInfo`,
 * so it's available in `onSubmit(values, extraInfos)` without looking it up again.
 */
export function SelectField(
  props: BaseFieldProps<string> & {
    options: Option[];
    placeholder?: string;
  }
) {
  const id = useId();
  const { fieldValue, setFieldValue, onBlur, error, isValidating, ref } =
    useField<string, { label: string }>({
      name: props.name,
      ancestors: props.ancestors,
      defaultValue: props.defaultValue,
      depFields: props.depFields,
      validate: useValidator(props.required, props.validate),
      schema: props.schema,
      debounceValidation: props.debounceValidation,
    });
  return (
    <FieldShell id={id} error={error} validating={isValidating} {...props}>
      <select
        id={id}
        ref={ref}
        className={`${inputClass} ${inputRing(error)} pr-8`}
        value={fieldValue ?? ''}
        disabled={props.disabled}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error, props.hint)}
        onChange={(e) => {
          const option = props.options.find((o) => o.value === e.target.value);
          setFieldValue(
            e.target.value,
            option ? { label: option.label } : undefined
          );
        }}
        onBlur={onBlur}
      >
        <option value="">{props.placeholder ?? 'Select…'}</option>
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function CheckboxField(
  props: Omit<BaseFieldProps<boolean>, 'hideLabel'> & { label: ReactNode }
) {
  const id = useId();
  const { fieldValue, setFieldValue, onBlur, error, isValidating, ref } =
    useField<boolean>({
      name: props.name,
      ancestors: props.ancestors,
      defaultValue: props.defaultValue,
      depFields: props.depFields,
      validate: useValidator(props.required, props.validate),
      schema: props.schema,
      debounceValidation: props.debounceValidation,
    });
  return (
    <div className={props.className}>
      <div className="flex items-start gap-2">
        <input
          id={id}
          ref={ref}
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-emerald-600"
          checked={!!fieldValue}
          disabled={props.disabled}
          aria-invalid={!!error}
          aria-describedby={describedBy(id, error, props.hint)}
          onChange={(e) => setFieldValue(e.target.checked)}
          onBlur={onBlur}
        />
        <label htmlFor={id} className="text-sm text-slate-700">
          {props.label}
        </label>
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : (
        props.hint && (
          <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">
            {props.hint}
          </p>
        )
      )}
    </div>
  );
}
