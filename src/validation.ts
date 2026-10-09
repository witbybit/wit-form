/**
 * The Standard Schema interface (https://standardschema.dev), implemented by Zod, Valibot, ArkType,
 * Effect Schema and others. It's copied here, as the spec recommends, so wit-form has no dependency
 * on any schema library.
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1.Props<Input, Output>;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace StandardSchemaV1 {
  export interface Props<Input = unknown, Output = Input> {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown
    ) => Result<Output> | Promise<Result<Output>>;
    readonly types?: Types<Input, Output> | undefined;
  }
  export type Result<Output> = SuccessResult<Output> | FailureResult;
  export interface SuccessResult<Output> {
    readonly value: Output;
    readonly issues?: undefined;
  }
  export interface FailureResult {
    readonly issues: ReadonlyArray<Issue>;
  }
  export interface Issue {
    readonly message: string;
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
  }
  export interface PathSegment {
    readonly key: PropertyKey;
  }
  export interface Types<Input = unknown, Output = Input> {
    readonly input: Input;
    readonly output: Output;
  }
}

/** What a validator returns: an error message, or nothing when the value is valid */
export type ValidationResult = string | null | undefined;

export type MaybePromise<T> = T | Promise<T>;

export function isPromiseLike<T = unknown>(val: any): val is PromiseLike<T> {
  return (
    val !== null &&
    (typeof val === 'object' || typeof val === 'function') &&
    typeof val.then === 'function'
  );
}

/**
 * A validator that throws or rejects blocks submission instead of silently passing,
 * e.g. when the request behind an async "is this username taken?" check fails.
 */
export function errorToMessage(err: unknown): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return typeof err === 'string' && err ? err : 'Validation failed';
}

/**
 * Runs a validator and normalizes its result. Sync validators stay sync, so forms without async
 * validators keep a fully synchronous submit.
 */
export function runValidator(
  fn: () => MaybePromise<ValidationResult>
): MaybePromise<ValidationResult> {
  let result: MaybePromise<ValidationResult>;
  try {
    result = fn();
  } catch (err) {
    return errorToMessage(err);
  }
  if (isPromiseLike<ValidationResult>(result)) {
    return Promise.resolve(result).then(
      (res) => res || undefined,
      (err) => errorToMessage(err)
    );
  }
  return result || undefined;
}

export function isStandardSchema(val: any): val is StandardSchemaV1 {
  return (
    !!val &&
    typeof val === 'object' &&
    typeof val['~standard']?.validate === 'function'
  );
}

export interface ISchemaIssue {
  message: string;
  path: PropertyKey[];
}

function normalizeIssues(
  result: StandardSchemaV1.Result<unknown>
): ISchemaIssue[] {
  if (!result.issues) {
    return [];
  }
  return result.issues.map((issue) => ({
    message: issue.message,
    path: (issue.path ?? []).map((segment) =>
      typeof segment === 'object' && segment !== null
        ? (segment as StandardSchemaV1.PathSegment).key
        : (segment as PropertyKey)
    ),
  }));
}

/** Validates a value against a Standard Schema and returns its issues (sync when the schema is sync) */
export function getSchemaIssues(
  schema: StandardSchemaV1,
  value: unknown
): MaybePromise<ISchemaIssue[]> {
  let result: MaybePromise<StandardSchemaV1.Result<unknown>>;
  try {
    result = schema['~standard'].validate(value);
  } catch (err) {
    return [{ message: errorToMessage(err), path: [] }];
  }
  if (isPromiseLike<StandardSchemaV1.Result<unknown>>(result)) {
    return Promise.resolve(result).then(normalizeIssues, (err) => [
      { message: errorToMessage(err), path: [] },
    ]);
  }
  return normalizeIssues(result);
}

type AnyValidator = (value: any, otherParams?: any) => any;

/**
 * Combines a field's schema and validator into one validator.
 * The schema runs first; the validator only runs once the schema passes.
 */
export function combineValidators(
  schema: StandardSchemaV1 | undefined,
  validate: AnyValidator | undefined
): AnyValidator | undefined {
  if (!schema) {
    return validate;
  }
  return (value: any, otherParams?: any) => {
    const issues = getSchemaIssues(schema, value);
    const fromIssues = (list: ISchemaIssue[]) =>
      list.length
        ? list[0].message
        : validate
          ? runValidator(() => validate(value, otherParams))
          : undefined;
    return isPromiseLike<ISchemaIssue[]>(issues)
      ? Promise.resolve(issues).then(fromIssues)
      : fromIssues(issues);
  };
}

/**
 * Collects validation results. Sync results are applied right away; async ones are applied when they
 * settle, and `settled()` resolves once all of them have.
 */
export class ValidationCollector {
  private pending: Promise<void>[] = [];

  add(
    result: MaybePromise<ValidationResult>,
    apply: (error: ValidationResult) => void
  ) {
    if (isPromiseLike<ValidationResult>(result)) {
      this.pending.push(Promise.resolve(result).then(apply));
    } else {
      apply(result);
    }
  }

  addPending(promise: Promise<void>) {
    this.pending.push(promise);
  }

  get hasPending() {
    return this.pending.length > 0;
  }

  async settled(): Promise<void> {
    // Results can schedule more work (e.g. nested arrays), so wait until nothing is left
    while (this.pending.length) {
      const current = this.pending;
      this.pending = [];
      await Promise.all(current);
    }
  }
}
