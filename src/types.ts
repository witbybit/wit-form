import type {
  MaybePromise,
  StandardSchemaV1,
  ValidationResult,
} from './validation';

export type { MaybePromise, StandardSchemaV1, ValidationResult };

/**
 * A validator returns an error message, or null/undefined when the value is valid.
 * It may also return a promise of that (async validation).
 */
export type Validator<V = any, O = any> = (
  value: V,
  otherParams?: O
) => MaybePromise<ValidationResult>;

export interface IAtomValueBase {
  initVer: number;
  /** Blurred, or marked by a submit/validation */
  touched?: boolean;
  /** Validated by submit, validateFields/validateAllFields or given an error with setError */
  validated?: boolean;
  /** Changed by the user through setFieldValue */
  changed?: boolean;
  /** An async validator is running (or a debounced validation is waiting) */
  isValidating?: boolean;
  validate?: Validator;
  error?: string | null;
  type: IFieldType;
}

export interface IFieldAtomValue<D = any, E = any> extends IAtomValueBase {
  data?: D;
  extraInfo?: E;
}

export interface IFieldArrayAtomValue extends IAtomValueBase {
  rowIds: number[];
  fieldNames: IChildFieldInfo[];
  skipUnregister?: boolean;
  /** Rows created from the initial values. Nested lists only read initial values inside these rows. */
  initialRowIds?: number[];
}

export interface InitialValues {
  values: any;
  extraInfos: any;
  version: number;
  settings?: { skipUnregister?: boolean; skipUnusedInitialValues?: boolean };
}

export interface FinalValues {
  values: any;
  extraInfos: any;
}

export interface IRemoveFieldParams {
  fieldNames: (
    | string
    | {
        ancestors?: { name: string; rowId: number }[];
        name: string;
        type?: 'field';
      }
  )[];
}

export interface IFieldWatchParams {
  fieldNames: (
    string | { ancestors?: { name: string; rowId: number }[]; name: string }
  )[];
  /**
   * This is needed only for the advanced case of watching field outside the FormProvider hierarchy (assuming a formId was specified).
   * Ideally this should never be defined.
   */
  formId?: string;
}

export interface IFieldArrayColWatchParams {
  ancestors?: { name: string; rowId: number }[];
  fieldArrayName: string;
  fieldNames?: string[];
  /**
   * This is optional and needed only for watching field outside the FormProvider hierarchy (assuming a formId was specified).
   * Ideally this should never be defined.
   */
  formId?: string;
}

export type IFieldType = 'field' | 'field-array';

export interface IAncestorInput {
  name: string;
  rowId: number;
}

export interface IFieldProps<D> {
  /**
   * Only required if the field is part of field array
   */
  ancestors?: { name: string; rowId: number }[];
  name: string;
  defaultValue?: D;
  /**
   * validate is only allowed to be set once when useField() is invoked.
   * If you need to use some external state for validation, please use validateCallback instead
   */
  validate?: Validator<D | undefined>;
  /**
   * validateCallback will be a function wrapped in useCallback() and this will be updated
   * for internal state changes. Please be careful to make sure it has a fixed list of dependencies
   * and doesn't change all the time since that can cause an infinite loop.
   */
  validateCallback?: Validator<D | undefined>;
  /**
   * A Standard Schema (Zod, Valibot, ArkType, ...) for this field's value. Runs before validate.
   */
  schema?: StandardSchemaV1;
  /**
   * Wait this many milliseconds after the last change before validating.
   * Useful for async validators that call a server. Submit never waits.
   */
  debounceValidation?: number;
  /**
   * Useful for referencing other fields in validation
   * */
  depFields?: (
    string | { name: string; ancestors?: { name: string; rowId: number }[] }
  )[];
  skipUnregister?: boolean;
}

export type IChildFieldInfo =
  | string
  | { name: string; type: 'field' }
  | { name: string; type: 'field-array'; fieldNames: IChildFieldInfo[] };

export interface IFieldArrayProps {
  name: string;
  /**
   * Name of the fields for this field array.
   * Note that by default it's assumed to be of type 'field'
   */
  fieldNames: IChildFieldInfo[];
  // TODO: Implement validate here
  // Note that this should be memoized or kept outside a function component so that it doesn't change on every render.
  validate?: Validator<any[]>;
  /**
   * A Standard Schema for the array of rows, e.g. z.array(z.object({...})).min(1)
   */
  schema?: StandardSchemaV1;
  depFields?: string[];
  skipUnregister?: boolean;
  ancestors?: IAncestorInput[];
  defaultValue?: any[];
}

export interface IFieldAtomInput {
  ancestors: IAncestorInput[];
  name: string;
}

export interface IGetFieldArrayInput extends IFieldAtomInput {
  fieldNames?: string[];
}

export interface IFieldArrayRowInput extends IFieldAtomInput {
  rowId: number;
}

export interface IFormContextFieldInput {
  type: IFieldType;
  ancestors?: IAncestorInput[];
  name: string;
}

export type IFieldAtomSelectorInput = {
  ancestors: { name: string; rowId: number }[];
  name: string;
  type: IFieldType;
  formId: string;
};

export interface IFieldError {
  ancestors: { name: string; rowId: number }[];
  name: string;
  type: IFieldType;
  error: string;
}

export interface IIsDirtyProps {
  preCompareUpdateFormValues?: (formValues: any) => any;
}

/**
 * When field errors become visible:
 * - onTouched (default): after the field is blurred, or after a submit/validation
 * - onChange: as soon as the user changes the field (or it's blurred/submitted)
 * - onSubmit: only after the first submit (or validateFields) attempt
 */
export type ValidationMode = 'onTouched' | 'onChange' | 'onSubmit';

export interface IFormProps<Values = any> {
  onSubmit: (values: Values, extraInfos?: any) => any;
  onError?: (
    errors?: IFieldError[] | null,
    formErrors?: any[] | null,
    values?: Values
  ) => any;
  initialValues?: unknown extends Values ? any : DeepPartial<Values>;
  /**
   * Useful in cases where you want to show the errors at the form level rather than field level
   * To show field level errors, please use validate() function in useField instead
   */
  validate?: (data: Values) => MaybePromise<string[] | null | undefined>;
  /**
   * A Standard Schema (Zod, Valibot, ArkType, ...) for all the form values.
   * Issues are shown on the matching fields; issues without a matching field become form errors.
   */
  schema?: StandardSchemaV1;
  /**
   * When field errors become visible. Default 'onTouched'.
   */
  mode?: ValidationMode;
  /**
   * Focus the first invalid field (that has its `ref` attached) when a submit fails. Default true.
   */
  shouldFocusError?: boolean;
  /**
   * Should data be preserved if a field unmounts?
   * By default, this is false
   */
  skipUnregister?: boolean;
  /**
   * Reinitialize the form after submit back to the specified initial or empty values.
   * E.g. After changing password, you want to clear all the input fields
   */
  reinitializeOnSubmit?: boolean;
  /**
   * If true, initial values not mapped to  form fields, will not come in the output
   */
  skipUnusedInitialValues?: boolean;
}

export interface IFormPropsOverrideAtomValue {
  validate: IFormProps['validate'] | null;
}

export interface IFormConfig {
  mode: ValidationMode;
  shouldFocusError: boolean;
  /** The form schema, so validation started outside useForm (e.g. useFormContext) uses it too */
  schema?: StandardSchemaV1;
}

export interface IFormSubmitState {
  isSubmitting: boolean;
  isSubmitted: boolean;
  isSubmitSuccessful: boolean;
  submitCount: number;
  /** Waiting for async validators during a submit or validate*Async call */
  isValidatingSubmit: boolean;
  /** Errors from the form-level validate/schema in the last submit or validation, or set with setFormErrors */
  formErrors: string[];
}

export interface IFormState {
  /** onSubmit is running */
  isSubmitting: boolean;
  /** The form has been submitted at least once (whether or not it was valid) */
  isSubmitted: boolean;
  /** The last submit passed validation and onSubmit finished without failing */
  isSubmitSuccessful: boolean;
  /** How many times the form has been submitted */
  submitCount: number;
  /** Async validation is running for a field, a field array or a submit */
  isValidating: boolean;
  /** No field or field array has an error and the form schema (if any) passes */
  isValid: boolean;
  /** The values differ from the initial values */
  isDirty: boolean;
  /** Current errors of all fields and field arrays (including ones not shown yet) */
  errors: IFieldError[];
  /** Errors from the form-level validate/schema in the last submit, or set with setFormErrors */
  formErrors: string[];
}

/** Recursively makes every property optional */
export type DeepPartial<T> = T extends
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | Date
  | Blob
  | ((...args: any[]) => any)
  ? T
  : T extends readonly (infer E)[]
    ? DeepPartial<E>[]
    : { [K in keyof T]?: DeepPartial<T[K]> };
