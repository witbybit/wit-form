import { atom } from 'jotai';
import {
  atomFamily,
  atomWithDefault,
  type FormAtom,
  type FormGetter,
  type FormResetter,
  type FormSetter,
  getNewRowId,
  stableStringify,
} from './atomUtils';
import { runValidator, ValidationCollector } from './validation';
import {
  type FinalValues,
  type IAncestorInput,
  type IChildFieldInfo,
  type IFieldArrayAtomValue,
  type IFieldArrayRowInput,
  type IFieldAtomInput,
  type IFieldAtomSelectorInput,
  type IFieldAtomValue,
  type IFieldError,
  type IFormConfig,
  type IFormPropsOverrideAtomValue,
  type IFormSubmitState,
  type IFieldType,
  type Validator,
  type IGetFieldArrayInput,
  type InitialValues,
} from './types';
import { getPathInObj, isDeepEqual, isUndefined, setPathInObj } from './utils';

export const formValuesAtom = atomFamily('FormValues', (_formId: string) =>
  atomWithDefault<FinalValues>({ values: {}, extraInfos: {} })
);

export const formPropsOverrideAtom = atomFamily(
  'FormPropsOverride',
  (_formId: string) =>
    atomWithDefault<IFormPropsOverrideAtomValue>({ validate: null })
);

export const formInitialValuesAtom = atomFamily(
  'FormInitialValues',
  (_formId: string) =>
    atomWithDefault<InitialValues>({
      values: {},
      version: 0,
      extraInfos: {},
      settings: {
        skipUnregister: undefined,
        skipUnusedInitialValues: undefined,
      },
    })
);

/**
 * Incremented whenever any field/field array atom of the form changes.
 * This is used for observing the form values in real-time.
 */
export const formFieldsVersionAtom = atomFamily(
  'FormFieldsVersion',
  (_formId: string) => atom(0)
);

export const combinedFieldAtomValues: {
  [formId: string]: {
    fields: {
      [atomKey: string]: {
        atomValue: IFieldAtomValue;
        param: IFieldAtomSelectorInput;
      };
    };
    fieldArrays: {
      [atomKey: string]: {
        atomValue: IFieldArrayAtomValue;
        param: IFieldAtomSelectorInput;
      };
    };
  };
} = {};

export const fieldAtomFamily = atomFamily(
  'FormFields',
  (param: IFieldAtomSelectorInput, key: string) =>
    atomWithDefault<IFieldAtomValue | IFieldArrayAtomValue>(
      param.type === 'field'
        ? ({
            initVer: 0,
            type: 'field',
          } as IFieldAtomValue)
        : ({
            fieldNames: [],
            initVer: 0,
            rowIds: [],
            type: 'field-array',
          } as IFieldArrayAtomValue),
      (newValue, set) => {
        if (!combinedFieldAtomValues[param.formId]) {
          combinedFieldAtomValues[param.formId] = {
            fields: {},
            fieldArrays: {},
          };
        }
        const fieldsObj = combinedFieldAtomValues[param.formId].fields;
        const fieldArrObj = combinedFieldAtomValues[param.formId].fieldArrays;
        if (param.type === 'field') {
          fieldsObj[key] = {
            atomValue: newValue as IFieldAtomValue,
            param,
          };
        } else if (param.type === 'field-array') {
          fieldArrObj[key] = {
            atomValue: newValue as IFieldArrayAtomValue,
            param,
          };
        }
        set(formFieldsVersionAtom(param.formId), (v) => v + 1);
      }
    )
);

/** Identifies a field or field array within a form (used for schema errors and focus) */
export function fieldKey(
  name: string,
  ancestors: IAncestorInput[] | undefined,
  type: IFieldType = 'field'
) {
  return stableStringify({
    a: (ancestors ?? []).map((a) => [a.name, a.rowId]),
    n: name,
    t: type,
  });
}

export const formConfigAtom = atomFamily('FormConfig', (_formId: string) =>
  atom<IFormConfig>({ mode: 'onTouched', shouldFocusError: true })
);

export const initialSubmitState: IFormSubmitState = {
  isSubmitting: false,
  isSubmitted: false,
  isSubmitSuccessful: false,
  submitCount: 0,
  isValidatingSubmit: false,
  formErrors: [],
};

export const formSubmitStateAtom = atomFamily(
  'FormSubmitState',
  (_formId: string) => atom<IFormSubmitState>(initialSubmitState)
);

export interface ISchemaErrors {
  /** Errors from the form schema, by fieldKey */
  fields: Record<string, string>;
  /** Issues that don't belong to a mounted field */
  form: string[];
}

export const emptySchemaErrors: ISchemaErrors = { fields: {}, form: [] };

export const formSchemaErrorsAtom = atomFamily(
  'FormSchemaErrors',
  (_formId: string) => atom<ISchemaErrors>(emptySchemaErrors)
);

/** The form schema's error for one field (only notifies that field when its own error changes) */
export const fieldSchemaErrorAtom = atomFamily(
  'FieldSchemaError',
  (param: IFieldAtomSelectorInput) => {
    const key = fieldKey(param.name, param.ancestors, param.type);
    return atom(
      (get) =>
        get(formSchemaErrorsAtom(param.formId)).fields[key] as
          string | undefined
    );
  }
);

interface IFormErrorsSummary {
  errors: IFieldError[];
  isValidating: boolean;
  schemaFormErrors: string[];
}

/** All current errors of a form. Keeps the same object while nothing changes, so subscribers don't re-render. */
export const formErrorsAtom = atomFamily('FormErrors', (formId: string) => {
  let prev: IFormErrorsSummary | null = null;
  return atom((get) => {
    get(formFieldsVersionAtom(formId));
    const schemaErrors = get(formSchemaErrorsAtom(formId));
    const combined = combinedFieldAtomValues[formId];
    const errors: IFieldError[] = [];
    let isValidating = false;
    const entries = combined
      ? [
          ...Object.values(combined.fields),
          ...Object.values(combined.fieldArrays),
        ]
      : [];
    for (const { atomValue, param } of entries) {
      if (atomValue.isValidating) {
        isValidating = true;
      }
      const error =
        atomValue.error ||
        schemaErrors.fields[fieldKey(param.name, param.ancestors, param.type)];
      if (error) {
        errors.push({
          error,
          name: param.name,
          ancestors: param.ancestors,
          type: param.type,
        });
      }
    }
    const next: IFormErrorsSummary = {
      errors,
      isValidating,
      schemaFormErrors: schemaErrors.form,
    };
    if (prev && isDeepEqual(prev, next)) {
      return prev;
    }
    prev = next;
    return next;
  });
});

export const formIsValidAtom = atomFamily('FormIsValid', (formId: string) =>
  atom((get) => {
    const { errors, schemaFormErrors } = get(formErrorsAtom(formId));
    return errors.length === 0 && schemaFormErrors.length === 0;
  })
);

export const formIsValidatingAtom = atomFamily(
  'FormIsValidating',
  (formId: string) =>
    atom(
      (get) =>
        get(formErrorsAtom(formId)).isValidating ||
        get(formSubmitStateAtom(formId)).isValidatingSubmit
    )
);

export const formIsDirtyAtom = atomFamily('FormIsDirty', (formId: string) =>
  atom(
    (get) =>
      !isDeepEqual(
        get(formInitialValuesAtom(formId)).values,
        get(formValuesAtom(formId)).values
      )
  )
);

export const formIsSubmittedAtom = atomFamily(
  'FormIsSubmitted',
  (formId: string) =>
    atom((get) => get(formSubmitStateAtom(formId)).isSubmitted)
);

/** Used in place of a subscription that isn't needed (hooks must always subscribe to something) */
export const falseAtom = atom(false);

/**
 * Removes all the cached atoms of the form. Should only be used once the form is no longer used anywhere.
 */
export function removeFormAtoms(formId: string) {
  const isForm = (id: string) => id === formId;
  formConfigAtom.removeWhere(isForm);
  formSubmitStateAtom.removeWhere(isForm);
  formSchemaErrorsAtom.removeWhere(isForm);
  formErrorsAtom.removeWhere(isForm);
  formIsValidAtom.removeWhere(isForm);
  formIsValidatingAtom.removeWhere(isForm);
  formIsDirtyAtom.removeWhere(isForm);
  formIsSubmittedAtom.removeWhere(isForm);
  fieldSchemaErrorAtom.removeWhere((param) => param.formId === formId);
  formValuesAtom.removeWhere((id) => id === formId);
  formPropsOverrideAtom.removeWhere((id) => id === formId);
  formInitialValuesAtom.removeWhere((id) => id === formId);
  formFieldsVersionAtom.removeWhere((id) => id === formId);
  fieldAtomFamily.removeWhere((param) => param.formId === formId);
  fieldArrayColAtomValueSelectorFamily.removeWhere(
    (param) => param.formId === formId
  );
  multipleFieldsSelectorFamily.removeWhere(
    (params) => !!params.length && params[0].formId === formId
  );
}

export function getFullObjectPath(
  params: IFieldAtomSelectorInput,
  get: FormGetter
) {
  let path = '';
  let prevAncestors: IAncestorInput[] = [];
  for (const ancestor of params.ancestors) {
    const ancestorValue = get(
      fieldAtomFamily({
        formId: params.formId,
        ancestors: prevAncestors,
        name: ancestor.name,
        type: 'field-array',
      })
    ) as IFieldArrayAtomValue;
    const rowIndex = ancestorValue.rowIds.indexOf(ancestor.rowId);
    path = path + `${ancestor.name}[${rowIndex}].`;
    prevAncestors.push(ancestor);
  }
  path = path + params.name;
  return path;
}

/**
 * Whether every row in `ancestors` was created from the initial values. A list inside a row that
 * was added later must not read the initial values at its index (they belong to another row).
 */
export function areRowsFromInitialValues(
  formId: string,
  ancestors: IAncestorInput[],
  get: FormGetter
) {
  return ancestors.every((ancestor, i) => {
    const parent = get(
      fieldAtomFamily({
        formId,
        ancestors: ancestors.slice(0, i),
        name: ancestor.name,
        type: 'field-array',
      })
    ) as IFieldArrayAtomValue;
    return !!parent.initialRowIds?.includes(ancestor.rowId);
  });
}

export function resetFieldArrayRow(
  formId: string,
  params: IFieldArrayRowInput,
  get: FormGetter,
  reset: FormResetter
) {
  const fieldArrayValue = get(
    fieldAtomFamily({
      ancestors: params.ancestors,
      name: params.name,
      type: 'field-array',
      formId,
    })
  ) as IFieldArrayAtomValue;
  const fieldAncestors = params.ancestors?.length
    ? [...params.ancestors, { name: params.name, rowId: params.rowId }]
    : [{ name: params.name, rowId: params.rowId }];
  for (const field of fieldArrayValue.fieldNames) {
    if (typeof field === 'string') {
      reset(
        fieldAtomFamily({
          ancestors: fieldAncestors,
          name: field,
          type: 'field',
          formId,
        })
      );
    } else {
      if (field.type === 'field') {
        reset(
          fieldAtomFamily({
            ancestors: fieldAncestors,
            name: field.name,
            type: 'field',
            formId,
          })
        );
      } else {
        const fieldArrayValue = get(
          fieldAtomFamily({
            ancestors: fieldAncestors,
            name: field.name,
            type: 'field-array',
            formId,
          })
        ) as IFieldArrayAtomValue;
        for (const rowId of fieldArrayValue.rowIds) {
          resetFieldArrayRow(
            formId,
            { ancestors: fieldAncestors, name: field.name, rowId },
            get,
            reset
          );
        }
      }
    }
  }
}

interface IValidationParams {
  set: FormSetter;
  isValidation: boolean;
  skipFieldCheck?: boolean;
  /** Collects async validation results. Errors from async validators are added to `errors` when they settle. */
  collector?: ValidationCollector;
  /** Shared with nested field arrays so their async errors end up in the same list */
  errors?: IFieldError[];
}

/**
 * Runs a field's validator during a submit/validation and records the result on the field.
 * A failing field is marked as touched and validated so its error shows.
 */
export function validateFieldAtom(
  fieldAtom: FormAtom<IFieldAtomValue | IFieldArrayAtomValue>,
  validate: Validator | undefined,
  args: [value: any, otherParams?: any],
  set: FormSetter,
  collector: ValidationCollector,
  onError: (error: string) => void
) {
  if (!validate) {
    return;
  }
  collector.add(
    runValidator(() => validate(...args)),
    (error) => {
      set(fieldAtom, (val) =>
        Object.assign({}, val, {
          error: error ?? undefined,
          isValidating: false,
          ...(error ? { touched: true, validated: true } : {}),
        })
      );
      if (error) {
        onError(error);
      }
    }
  );
}

export function getFieldArrayDataAndExtraInfo(
  formId: string,
  params: IGetFieldArrayInput,
  get: FormGetter,
  validationParams?: IValidationParams,
  // relative ancestors are from the point of view of the root field array where getValue() was called
  relativeAncestors?: IAncestorInput[]
): {
  data: any[];
  extraInfo: any;
  errors?: IFieldError[];
} {
  const isValidation = validationParams?.isValidation;
  const set = validationParams?.set;
  const skipFieldCheck = validationParams?.skipFieldCheck;
  // Errors of async validators are pushed into `errors` once they settle; callers await the collector
  const collector = validationParams?.collector ?? new ValidationCollector();
  let { name } = params;
  const data: any[] = [];
  const extraInfo: any = [];
  const errors: IFieldError[] = validationParams?.errors ?? [];
  const fieldArrayAtom = fieldAtomFamily({
    ancestors: params.ancestors,
    name: params.name,
    type: 'field-array',
    formId,
  });
  const fieldArrayAtomValue = get(fieldArrayAtom) as IFieldArrayAtomValue;
  let rowIdx = -1;
  // TODO: Add support for otherParams in field array validation
  for (const rowId of fieldArrayAtomValue.rowIds) {
    const fieldAncestors: IAncestorInput[] = params.ancestors?.length
      ? [...params.ancestors, { rowId, name: params.name }]
      : [{ rowId, name: params.name }];
    rowIdx++;
    const fieldRelativeAncestors: IAncestorInput[] = relativeAncestors
      ? [...relativeAncestors, { name, rowId }]
      : [{ name, rowId }];
    data.push({});
    extraInfo.push({});
    const filteredFieldNames = fieldArrayAtomValue.fieldNames.filter(
      (f) =>
        !params.fieldNames ||
        params.fieldNames.indexOf(typeof f === 'string' ? f : f.name) !== -1
    );
    for (const field of filteredFieldNames) {
      if (typeof field === 'string') {
        const fieldAtom = fieldAtomFamily({
          name: field,
          type: 'field',
          ancestors: fieldAncestors,
          formId,
        });
        const fieldValue = get(fieldAtom) as IFieldAtomValue;
        if (isValidation && !skipFieldCheck && set) {
          validateFieldAtom(
            fieldAtom,
            fieldValue.validate,
            [fieldValue.data],
            set,
            collector,
            (error) =>
              errors.push({
                error,
                name: field,
                type: 'field',
                ancestors: fieldRelativeAncestors,
              })
          );
        }
        setPathInObj(data[rowIdx], field, fieldValue.data);
        setPathInObj(extraInfo[rowIdx], field, fieldValue.extraInfo);
      } else {
        if (field.type === 'field') {
          const fieldAtom = fieldAtomFamily({
            name: field.name,
            type: 'field',
            ancestors: fieldAncestors,
            formId,
          });
          const fieldValue = get(fieldAtom) as IFieldAtomValue;
          if (isValidation && !skipFieldCheck && set) {
            validateFieldAtom(
              fieldAtom,
              fieldValue.validate,
              [fieldValue.data],
              set,
              collector,
              (error) =>
                errors.push({
                  error,
                  name: field.name,
                  type: 'field',
                  ancestors: fieldRelativeAncestors,
                })
            );
          }
          setPathInObj(data[rowIdx], field.name, fieldValue.data);
          setPathInObj(extraInfo[rowIdx], field.name, fieldValue.extraInfo);
        } else {
          const {
            data: fieldData,
            extraInfo: fieldExtraInfo,
            errors: fieldErrors,
          } = getFieldArrayDataAndExtraInfo(
            formId,
            {
              name: field.name,
              ancestors: fieldAncestors,
            },
            get,
            validationParams
              ? { ...validationParams, collector, errors }
              : undefined,
            fieldRelativeAncestors
          );
          if (fieldErrors?.length && fieldErrors !== errors) {
            errors.push(...fieldErrors);
          }
          if (!isUndefined(fieldData)) {
            setPathInObj(data[rowIdx], field.name, fieldData);
          }
          if (!isUndefined(fieldExtraInfo)) {
            setPathInObj(extraInfo[rowIdx], field.name, fieldExtraInfo);
          }
        }
      }
    }
  }
  if (isValidation && set) {
    validateFieldAtom(
      fieldArrayAtom,
      fieldArrayAtomValue.validate,
      [data],
      set,
      collector,
      (error) =>
        errors.push({
          error,
          name: name,
          type: 'field-array',
          ancestors: relativeAncestors ?? [],
        })
    );
  }
  return { data, extraInfo, errors };
}

interface ISetFieldArrayParams {
  get: FormGetter;
  set: FormSetter;
  reset: FormResetter;
  // value should be an array since field array is being set
  dataArr: any[];
  extraInfoArr?: any[];
  // initialValuesVer is only needed if fields are being initialized
  initialValuesVersion?: number;
  // Needed only for initializing the field array
  fieldNames?: IChildFieldInfo[];
  mode?:
    | { type: 'set' }
    | { type: 'insert'; rowIndex?: number }
    // Replaces the values of existing rows, starting at rowIndex, keeping their row ids
    | { type: 'update'; rowIndex: number };
  skipRecursion?: boolean;
  /** The rows come from the initial values (remembered so nested lists know which rows those are) */
  isInitialization?: boolean;
}

export function setFieldArrayDataAndExtraInfo(
  formId: string,
  params: IFieldAtomInput,
  setParams: ISetFieldArrayParams
) {
  let {
    get,
    set,
    reset,
    dataArr,
    extraInfoArr,
    initialValuesVersion,
    mode,
    fieldNames: childFields,
    isInitialization,
  } = setParams;
  if (!mode) {
    mode = { type: 'set' };
  }
  const fieldArrayParams: IFieldAtomSelectorInput = {
    ...params,
    formId,
    type: 'field-array',
  };
  const fieldArrayAtomValue = get(
    fieldAtomFamily(fieldArrayParams)
  ) as IFieldArrayAtomValue;
  if (fieldArrayAtomValue.type !== 'field-array') {
    throw new Error(
      'Please check the field type in field array since this seems to be a regular field but has been specified as a nested field array'
    );
  }
  const oldRowIds = fieldArrayAtomValue.rowIds;
  let dataRowsLength = dataArr?.length ?? 0;
  let rowIdsToRemove: number[] = [];
  let rowIds: number[] = [...oldRowIds];
  let startIndex = 0;
  if (!mode || mode.type === 'set') {
    if (oldRowIds.length > dataRowsLength) {
      rowIds = oldRowIds.slice(0, dataRowsLength);
      rowIdsToRemove = oldRowIds.slice(dataRowsLength, oldRowIds.length);
    } else if (oldRowIds.length < dataRowsLength) {
      const noOfElementsToAdd = dataRowsLength - oldRowIds.length;
      for (let i = 0; i < noOfElementsToAdd; i++) {
        rowIds.push(getNewRowId(rowIds));
      }
    }
    set(fieldAtomFamily(fieldArrayParams), (val) =>
      Object.assign({}, val, {
        rowIds,
        initVer: initialValuesVersion ?? val.initVer,
        fieldNames:
          initialValuesVersion && childFields?.length
            ? childFields
            : (val as IFieldArrayAtomValue).fieldNames,
        ...(isInitialization ? { initialRowIds: rowIds } : {}),
      } as Partial<IFieldArrayAtomValue>)
    );
    for (const rowId of rowIdsToRemove) {
      resetFieldArrayRow(formId, { ...fieldArrayParams, rowId }, get, reset);
    }
  } else if (mode.type === 'insert') {
    rowIds = [...oldRowIds];
    if (!dataRowsLength) {
      dataRowsLength = 1;
    }
    if (mode.rowIndex !== undefined) {
      startIndex = mode.rowIndex;
      for (let i = startIndex; i < startIndex + dataRowsLength; i++) {
        rowIds.splice(i, 0, getNewRowId(rowIds));
      }
    } else {
      startIndex = rowIds.length;
      for (let i = 0; i < dataRowsLength; i++) {
        rowIds.push(getNewRowId(rowIds));
      }
    }
    set(fieldAtomFamily(fieldArrayParams), (val) =>
      Object.assign({}, val, {
        rowIds,
        initVer: initialValuesVersion ?? val.initVer,
      } as Partial<IFieldArrayAtomValue>)
    );
  } else if (mode.type === 'update') {
    startIndex = mode.rowIndex;
    // Only update rows that exist
    dataArr = (dataArr ?? []).slice(0, Math.max(rowIds.length - startIndex, 0));
  }
  if (dataArr?.length) {
    for (
      let dataIdx = startIndex;
      dataIdx < startIndex + dataArr.length;
      dataIdx++
    ) {
      // Need to subtract startIndex because only the new data is passed during insert
      // For e.g. if startIndex is 1 and data is at index 0, we need to get the value at index 0 for row index 1.
      const fieldValues = dataArr[dataIdx - startIndex];
      const extraInfos = extraInfoArr?.[dataIdx - startIndex];
      const rowId = rowIds[dataIdx];
      const fieldAncestors = params.ancestors.length
        ? [...params.ancestors, { name: params.name, rowId }]
        : [{ name: params.name, rowId }];
      // Read the fields again: the array may have just received them above (e.g. a new nested array)
      const { fieldNames: rowFieldNames } = get(
        fieldAtomFamily(fieldArrayParams)
      ) as IFieldArrayAtomValue;
      for (const field of rowFieldNames) {
        if (typeof field === 'string') {
          const data = getPathInObj(fieldValues, field);
          const extraInfo = getPathInObj(extraInfos, field);
          set(
            fieldAtomFamily({
              name: field,
              ancestors: fieldAncestors,
              type: 'field',
              formId,
            }),
            (existingValue) => {
              return Object.assign({}, existingValue, {
                data,
                extraInfo,
                initVer: initialValuesVersion ?? existingValue.initVer,
              } as Partial<IFieldAtomValue>);
            }
          );
        } else {
          if (field.type === 'field') {
            const data = getPathInObj(fieldValues, field.name);
            const extraInfo = getPathInObj(extraInfos, field.name);
            set(
              fieldAtomFamily({
                name: field.name,
                ancestors: fieldAncestors,
                type: 'field',
                formId,
              }),
              (existingValue) => {
                return Object.assign({}, existingValue, {
                  data,
                  extraInfo,
                  initVer: initialValuesVersion ?? existingValue.initVer,
                } as Partial<IFieldAtomValue>);
              }
            );
          } else if (field.type === 'field-array') {
            const data = getPathInObj(fieldValues, field.name);
            const extraInfo = getPathInObj(extraInfos, field.name);
            if (data === undefined && mode.type !== 'set') {
              // A new or updated row without this list: leave it alone, so a new row's list
              // starts from its useFieldArray defaultValue and an updated row keeps its rows
              continue;
            }
            setFieldArrayDataAndExtraInfo(
              formId,
              { name: field.name, ancestors: fieldAncestors },
              {
                get,
                set,
                dataArr: data,
                reset,
                extraInfoArr: extraInfo,
                initialValuesVersion,
                // The child array may not be mounted yet, so give it the fields declared by the parent
                fieldNames: initialValuesVersion ? field.fieldNames : undefined,
                // The nested arrays of new or updated rows get exactly the given rows
                mode: { type: 'set' },
                isInitialization,
              }
            );
          }
        }
      }
    }
  }
}

/**
 * Gets the data for particular fields from the field array.
 * Note that it's assumed that user is listening to field in the lowest field array.
 * This method won't work correctly if the referenced field doesn't have data (i.e. is a field array)
 */
export const fieldArrayColAtomValueSelectorFamily = atomFamily(
  'FieldArrayColAtomValueSelector',
  ({
    formId,
    ancestors,
    fieldArrayName,
    fieldNames,
  }: {
    formId: string;
    ancestors?: { name: string; rowId: number }[];
    fieldArrayName: string;
    fieldNames?: string[];
  }) =>
    atom<{ values: any[]; extraInfos: any[] }>((get) => {
      const { data, extraInfo } = getFieldArrayDataAndExtraInfo(
        formId,
        {
          ancestors: ancestors ?? [],
          name: fieldArrayName,
          fieldNames,
        },
        get
      );
      return { values: data, extraInfos: extraInfo };
    })
);

export const multipleFieldsSelectorFamily = atomFamily(
  'FormFieldsSelector',
  (
    fieldNames: {
      formId: string;
      ancestors?: { name: string; rowId: number }[];
      name: string;
    }[]
  ) =>
    atom<{
      values: { [key: string]: any };
      extraInfos: { [key: string]: any };
    }>((get) => {
      if (!fieldNames?.length) {
        return { values: {}, extraInfos: {} };
      }
      const values: any = {};
      const extraInfos: any = {};
      const initialAtomVal = get(
        formInitialValuesAtom(fieldNames?.[0]?.formId)
      ) as InitialValues;
      for (const fieldInfo of fieldNames) {
        const fieldAtomVal = get(
          fieldAtomFamily({
            ancestors: fieldInfo.ancestors ?? [],
            name: fieldInfo.name,
            type: 'field',
            formId: fieldInfo.formId,
          })
        ) as IFieldAtomValue;
        setPathInObj(
          values,
          fieldInfo.name,
          fieldAtomVal?.data === undefined
            ? getPathInObj(initialAtomVal?.values ?? {}, fieldInfo.name)
            : fieldAtomVal?.data
        );
        setPathInObj(
          extraInfos,
          fieldInfo.name,
          fieldAtomVal?.extraInfo === undefined
            ? getPathInObj(initialAtomVal?.extraInfos ?? {}, fieldInfo.name)
            : fieldAtomVal?.extraInfo
        );
      }
      return { values, extraInfos };
    })
);
