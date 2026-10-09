import { Field, type IFieldComponentProps } from './Field';
import {
  useField,
  useFieldArray,
  useFieldArrayColumnWatch,
  useFieldWatch,
  useForm,
  useFormContext,
  useFormState,
  useFormValues,
} from './FormProvider';
import type {
  DeepPartial,
  IAncestorInput,
  IChildFieldInfo,
  IFieldArrayProps,
  IFieldProps,
  IFormContextFieldInput,
  IFormProps,
} from './types';

type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | Date
  | Blob
  | ((...args: any[]) => any);

// Limits recursion so very deep or recursive types don't slow down the compiler
type Depth = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

type IsLeaf<T> = T extends Primitive | readonly any[] ? true : false;

/**
 * Every field name of T: top-level keys and dot paths into nested objects, e.g. 'name' | 'address' | 'address.city'.
 * Arrays end a path: an array is either a single field's value or a field array (see ArrayPath).
 */
export type FieldPath<T, D extends number = 9> = [D] extends [never]
  ? never
  : IsLeaf<T> extends true
    ? never
    : {
        [K in keyof T & string]-?: IsLeaf<NonNullable<T[K]>> extends true
          ? K
          : K | `${K}.${FieldPath<NonNullable<T[K]>, Depth[D]>}`;
      }[keyof T & string];

/** Paths of T that hold an array of objects, i.e. the names you can pass to useFieldArray */
export type ArrayPath<T, D extends number = 9> = [D] extends [never]
  ? never
  : IsLeaf<T> extends true
    ? never
    : {
        [K in keyof T & string]-?: NonNullable<
          T[K]
        > extends readonly (infer E)[]
          ? NonNullable<E> extends Primitive | readonly any[]
            ? never
            : K
          : NonNullable<T[K]> extends Primitive
            ? never
            : `${K}.${ArrayPath<NonNullable<T[K]>, Depth[D]>}`;
      }[keyof T & string];

/** The type of the value at path P in T */
export type PathValue<T, P extends string> = unknown extends T
  ? any
  : P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? PathValue<NonNullable<T[K]>, Rest>
      : never
    : P extends keyof T
      ? T[P]
      : never;

type ArrayElement<A> = A extends readonly (infer E)[] ? E : never;

type AncestorLike = { readonly name: string; readonly rowId: number };

/**
 * The values of one row, given the rows a field belongs to (outermost first).
 * When an ancestor's name isn't a literal type (e.g. a `string` variable), the row is `any`.
 */
export type RowValues<
  T,
  A extends readonly AncestorLike[],
> = A extends readonly [
  infer First extends AncestorLike,
  ...infer Rest extends readonly AncestorLike[],
]
  ? string extends First['name']
    ? any
    : RowValues<
        NonNullable<ArrayElement<NonNullable<PathValue<T, First['name']>>>>,
        Rest
      >
  : A extends readonly []
    ? T
    : any;

type TypedChildFields<Row> = (
  | FieldPath<Row>
  | { name: FieldPath<Row>; type: 'field' }
  | { name: ArrayPath<Row>; type: 'field-array'; fieldNames: IChildFieldInfo[] }
)[];

type FieldReturn<D, E> = ReturnType<typeof useField<D, E>>;

type FieldArrayReturn<Row> = Omit<
  ReturnType<typeof useFieldArray>,
  | 'append'
  | 'prepend'
  | 'insert'
  | 'update'
  | 'replace'
  | 'setFieldArrayValue'
  | 'getFieldArrayValue'
> & {
  append: (...rows: DeepPartial<Row>[]) => void;
  prepend: (...rows: DeepPartial<Row>[]) => void;
  insert: (index: number, ...rows: DeepPartial<Row>[]) => void;
  update: (index: number, row: DeepPartial<Row>, extraInfo?: any) => void;
  replace: (rows: DeepPartial<Row>[]) => void;
  setFieldArrayValue: (rows: DeepPartial<Row>[]) => void;
  getFieldArrayValue: () => DeepPartial<Row>[];
};

export interface TypedFormHooks<Values> {
  useForm: (props: IFormProps<Values>) => ReturnType<typeof useForm<Values>>;

  useField: <
    const A extends readonly AncestorLike[] = [],
    N extends FieldPath<RowValues<Values, A>> = FieldPath<RowValues<Values, A>>,
    E = any,
  >(
    props: Omit<
      IFieldProps<PathValue<RowValues<Values, A>, N>>,
      'name' | 'ancestors'
    > & { name: N; ancestors?: A }
  ) => FieldReturn<PathValue<RowValues<Values, A>, N>, E>;

  useFieldArray: <
    const A extends readonly AncestorLike[] = [],
    N extends ArrayPath<RowValues<Values, A>> = ArrayPath<RowValues<Values, A>>,
  >(
    props: Omit<
      IFieldArrayProps,
      'name' | 'ancestors' | 'fieldNames' | 'defaultValue'
    > & {
      name: N;
      ancestors?: A;
      fieldNames: TypedChildFields<
        ArrayElement<NonNullable<PathValue<RowValues<Values, A>, N>>>
      >;
      defaultValue?: DeepPartial<
        ArrayElement<NonNullable<PathValue<RowValues<Values, A>, N>>>
      >[];
    }
  ) => FieldArrayReturn<
    ArrayElement<NonNullable<PathValue<RowValues<Values, A>, N>>>
  >;

  useFieldWatch: (props: {
    fieldNames: (
      FieldPath<Values> | { name: string; ancestors?: IAncestorInput[] }
    )[];
    formId?: string;
  }) => { values: DeepPartial<Values>; extraInfos: any };

  useFieldArrayColumnWatch: <
    const A extends readonly AncestorLike[] = [],
    N extends ArrayPath<RowValues<Values, A>> = ArrayPath<RowValues<Values, A>>,
  >(props: {
    fieldArrayName: N;
    ancestors?: A;
    fieldNames?: FieldPath<
      ArrayElement<NonNullable<PathValue<RowValues<Values, A>, N>>>
    >[];
    formId?: string;
  }) => {
    values: DeepPartial<
      ArrayElement<NonNullable<PathValue<RowValues<Values, A>, N>>>
    >[];
    extraInfos: any[];
  };

  useFormValues: (params?: { formId?: string }) => DeepPartial<Values>;

  useFormContext: (params?: { formId?: string }) => Omit<
    ReturnType<typeof useFormContext>,
    'setValue' | 'getValues'
  > & {
    setValue: {
      <N extends FieldPath<Values>>(
        name: N,
        newValue: { value?: PathValue<Values, N>; extraInfo?: any }
      ): void;
      (
        key: IFormContextFieldInput,
        newValue: { value?: any; extraInfo?: any }
      ): void;
    };
    getValues: () => { values: DeepPartial<Values>; extraInfos: any };
  };

  useFormState: typeof useFormState;

  Field: <
    const A extends readonly AncestorLike[] = [],
    N extends FieldPath<RowValues<Values, A>> = FieldPath<RowValues<Values, A>>,
  >(
    props: Omit<IFieldComponentProps, 'name' | 'ancestors'> & {
      name: N;
      ancestors?: A;
    }
  ) => ReturnType<typeof Field>;
}

/**
 * Returns the wit-form hooks typed for your form's values: field names are checked against
 * `Values`, and values are typed by their path. Create it once per form type, outside components.
 *
 * ```ts
 * const { useForm, useField, useFieldArray } = createFormHooks<Order>();
 * ```
 *
 * At runtime these are the same hooks wit-form exports, so typed and untyped hooks work together.
 */
export function createFormHooks<Values>(): TypedFormHooks<Values> {
  return {
    useForm,
    useField,
    useFieldArray,
    useFieldWatch,
    useFieldArrayColumnWatch,
    useFormValues,
    useFormContext,
    useFormState,
    Field,
  } as unknown as TypedFormHooks<Values>;
}
