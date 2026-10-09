import React, {
  useCallback,
  useEffect,
  Fragment,
  useMemo,
  useReducer,
  useRef,
  useContext,
} from 'react';
import {
  createStore,
  Provider,
  useAtom,
  useAtomValue,
  useSetAtom,
  useStore,
} from 'jotai';
import {
  combinedFieldAtomValues,
  emptySchemaErrors,
  falseAtom,
  fieldArrayColAtomValueSelectorFamily,
  fieldAtomFamily,
  fieldKey,
  fieldSchemaErrorAtom,
  formConfigAtom,
  formErrorsAtom,
  formFieldsVersionAtom,
  formInitialValuesAtom,
  formIsDirtyAtom,
  formIsSubmittedAtom,
  formIsValidatingAtom,
  formIsValidAtom,
  formPropsOverrideAtom,
  formSchemaErrorsAtom,
  formSubmitStateAtom,
  formValuesAtom,
  getFieldArrayDataAndExtraInfo,
  getFullObjectPath,
  type ISchemaErrors,
  multipleFieldsSelectorFamily,
  removeFormAtoms,
  resetFieldArrayRow,
  setFieldArrayDataAndExtraInfo,
  validateFieldAtom,
} from './atoms';
import {
  combineValidators,
  errorToMessage,
  getSchemaIssues,
  isPromiseLike,
  type ISchemaIssue,
  runValidator,
  type StandardSchemaV1,
  ValidationCollector,
  type ValidationResult,
} from './validation';
import {
  type FormAtom,
  type FormGetter,
  type FormResetter,
  type FormSetter,
  generateFormId,
  type ITransactionInterface,
  transactionAtom,
} from './atomUtils';
import {
  type IAncestorInput,
  type IFieldArrayAtomValue,
  type IFieldArrayColWatchParams,
  type IFieldArrayProps,
  type IFieldAtomSelectorInput,
  type IFieldAtomValue,
  type IFieldError,
  type IFieldProps,
  type IFieldWatchParams,
  type IFormContextFieldInput,
  type IFormProps,
  type IFormPropsOverrideAtomValue,
  type IFormState,
  type IFormSubmitState,
  type IIsDirtyProps,
  type InitialValues,
  type IRemoveFieldParams,
} from './types';
import {
  getPathInObj,
  setPathInObj,
  isDeepEqual,
  isUndefined,
  cloneDeep,
} from './utils';

/**
 * Runs the callback against the jotai store as a single transaction.
 * All reads within the callback see the latest values (including writes made earlier in the same callback)
 * and subscribers are notified only once the callback finishes.
 */
function useFormTransaction<Args extends any[], R>(
  fn: (ops: ITransactionInterface) => (...args: Args) => R,
  deps?: React.DependencyList
): (...args: Args) => R {
  const store = useStore();
  const callback = (...args: Args): R =>
    store.set(transactionAtom, (ops: ITransactionInterface) =>
      fn(ops)(...args)
    );
  return useCallback(callback, deps ? [store, ...deps] : [callback]);
}

function FormValuesObserver() {
  const formId = useContext(FormIdContext);
  const store = useStore();
  const setFormValues = useSetAtom(formValuesAtom(formId));
  // Changes whenever any field or field array of this form changes
  const fieldsVersion = useAtomValue(formFieldsVersionAtom(formId));
  const initialValues = useAtomValue(formInitialValuesAtom(formId));
  const localFormValuesRef = useRef<any>({
    values: {},
    extraInfo: {},
  });

  useEffect(() => {
    const newValues = getFormValues(formId, (atom) => store.get(atom));
    if (!isDeepEqual(newValues, localFormValuesRef.current)) {
      localFormValuesRef.current = newValues;
      setFormValues(newValues);
    }
  }, [formId, store, setFormValues, fieldsVersion, initialValues]);
  return null;
}

// TODO: Check if useField should be rendered again when same params are passed again
export function useField<D = any, E = any>(props: IFieldProps<D>) {
  const {
    ancestors,
    name,
    validate,
    validateCallback,
    defaultValue,
    depFields,
    skipUnregister,
    schema,
    debounceValidation,
  } = props;
  const formId = useContext(FormIdContext);
  const store = useStore();
  const initialValues = useAtomValue(formInitialValuesAtom(formId));
  const { mode } = useAtomValue(formConfigAtom(formId));
  const fieldParam: IFieldAtomSelectorInput = {
    ancestors: ancestors ?? [],
    name,
    type: 'field',
    formId,
  };
  const fieldAtom = fieldAtomFamily(fieldParam) as unknown as FormAtom<
    IFieldAtomValue<D, E>
  >;
  const [atomValue, setAtomValue] = useAtom(fieldAtom);
  // Error from the form-level schema, if there is one
  const schemaError = useAtomValue(fieldSchemaErrorAtom(fieldParam));
  // Only subscribed when it matters, so other modes don't re-render every field on the first submit
  const isFormSubmitted = useAtomValue(
    mode === 'onSubmit' ? formIsSubmittedAtom(formId) : falseAtom
  );
  // The field schema runs before validate, as part of the same validator
  const fieldValidate = useMemo(
    () => combineValidators(schema, validate),
    [validate]
  );
  const fieldValidateCallback = useMemo(
    () =>
      validateCallback
        ? combineValidators(schema, validateCallback)
        : undefined,
    [validateCallback]
  );
  const oldOtherParamsRef = useRef<any>(null);
  const oldValueRef = useRef<any>(null);
  const oldTouchedRef = useRef<any>(false);
  // Identifies the latest validation, so results of older async validations are ignored
  const validationRunRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    data: fieldValue,
    extraInfo,
    error,
    touched,
    validated,
    changed,
  } = atomValue;
  const depObjFields =
    depFields?.map((f) =>
      typeof f === 'string' ? { name: f, formId } : { ...f, formId }
    ) ?? [];
  // TODO: Memoize or change the params so that this hook doesn't render everytime useField is rendered
  const otherParams = useAtomValue(multipleFieldsSelectorFamily(depObjFields));

  const initializeFieldValue = useFormTransaction(
    ({ set, get }) =>
      () => {
        const initialValues = get(formInitialValuesAtom(formId));
        const fieldAtom = fieldAtomFamily({
          ancestors: ancestors ?? [],
          name,
          type: 'field',
          formId,
        });
        set(fieldAtom, (val) =>
          Object.assign({}, val, {
            validate: fieldValidate,
            initVer: initialValues.version,
          } as Partial<IFieldAtomValue>)
        );
        if (initialValues.values) {
          //TODO: Add field array atoms depending on initial values
          if (!ancestors?.length) {
            const initialValue = getPathInObj(initialValues.values, name);
            const extraInfo = getPathInObj(initialValues.extraInfos, name);
            set(fieldAtom, {
              data: initialValue === undefined ? defaultValue : initialValue,
              error: undefined,
              extraInfo,
              validate: fieldValidate,
              initVer: initialValues.version,
              touched: false,
              type: 'field',
            });
          }
        }
      },
    [name, defaultValue, fieldValidate, ancestors]
  );

  const resetField = useFormTransaction(
    ({ reset }) =>
      () => {
        // DEVNOTE: Not resetting the field if it is part of field array
        // since field array reset will reset those fields
        if (
          !skipUnregister &&
          !initialValues.settings?.skipUnregister &&
          !ancestors?.length
        ) {
          reset(
            fieldAtomFamily({
              name,
              ancestors: ancestors ?? [],
              type: 'field',
              formId,
            })
          );
        }
      },
    [skipUnregister, name, initialValues, ancestors]
  );

  useEffect(() => {
    if (atomValue.initVer < initialValues.version) {
      initializeFieldValue();
    } else if (fieldValidate && !atomValue.validate && !fieldValidateCallback) {
      setAtomValue((val) =>
        Object.assign({}, val, {
          validate: fieldValidate,
        } as Partial<IFieldAtomValue>)
      );
    } else if (
      fieldValidateCallback &&
      atomValue.validate !== fieldValidateCallback
    ) {
      setAtomValue((val) =>
        Object.assign({}, val, {
          validate: fieldValidateCallback,
        } as Partial<IFieldAtomValue>)
      );
    } else if (
      atomValue.initVer === initialValues.version &&
      defaultValue !== undefined
    ) {
      // Useful for setting field value as default value inside field array
      setAtomValue((val) => {
        // null, '' and 0 are valid values so only if it's undefined, we set it as default value.
        if (val.data === undefined) {
          return Object.assign({}, val, { data: defaultValue });
        }
        return val;
      });
    }
  }, [
    initializeFieldValue,
    initialValues.version,
    atomValue.initVer,
    defaultValue,
    fieldValidate,
    fieldValidateCallback,
    atomValue.validate,
    setAtomValue,
  ]);

  useEffect(() => {
    return () => {
      // Ignore async validations that finish after the field unmounts
      validationRunRef.current++;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      resetField();
    };
  }, [resetField]);

  // Trigger field validation when value changes (for e.g. setValue)
  useEffect(() => {
    if (
      !isDeepEqual(oldOtherParamsRef.current, otherParams) ||
      !isDeepEqual(oldValueRef.current, fieldValue) ||
      (!oldTouchedRef.current && touched)
    ) {
      oldOtherParamsRef.current = otherParams;
      oldValueRef.current = fieldValue;
      oldTouchedRef.current = true;
      const runId = ++validationRunRef.current;
      const applyError = (error: ValidationResult) => {
        if (runId === validationRunRef.current) {
          setAtomValue((val) =>
            val.error === error && !val.isValidating
              ? val
              : Object.assign({}, val, { error, isValidating: false })
          );
        }
      };
      const runValidation = () => {
        debounceTimerRef.current = null;
        const validateFn =
          fieldValidateCallback ?? store.get(fieldAtom).validate;
        const result = validateFn
          ? runValidator(() => validateFn(fieldValue, otherParams))
          : undefined;
        if (isPromiseLike<ValidationResult>(result)) {
          setAtomValue((val) =>
            val.isValidating
              ? val
              : Object.assign({}, val, { isValidating: true })
          );
          result.then(applyError);
        } else {
          applyError(result);
        }
      };
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (debounceValidation && debounceValidation > 0) {
        setAtomValue((val) =>
          val.isValidating
            ? val
            : Object.assign({}, val, { isValidating: true })
        );
        debounceTimerRef.current = setTimeout(
          runValidation,
          debounceValidation
        );
      } else {
        runValidation();
      }
    }
  }, [
    fieldValue,
    otherParams,
    setAtomValue,
    fieldValidateCallback,
    touched,
    debounceValidation,
    store,
    fieldAtom,
  ]);

  const key = fieldKey(name, ancestors);
  const ref = useCallback(
    (element: any) => registerFieldElement(formId, key, element),
    [formId, key]
  );

  // Compared with the value this field started with
  let initialValue = ancestors?.length
    ? getPathInObj(
        initialValues.values,
        getFullObjectPath(fieldParam, (a) => store.get(a))
      )
    : getPathInObj(initialValues.values, name);
  if (initialValue === undefined) {
    initialValue = defaultValue;
  }

  const visibleError = error || schemaError || undefined;
  const showError =
    mode === 'onSubmit'
      ? validated || isFormSubmitted
      : mode === 'onChange'
        ? touched || validated || changed
        : touched || validated;

  return {
    fieldValue,
    initValueVer: atomValue.initVer,
    extraInfo,
    setFieldValue: useCallback(
      (data: D, extraInfo?: E) => {
        setAtomValue((val) =>
          Object.assign({}, val, {
            data,
            extraInfo,
            changed: true,
          } as Partial<IFieldAtomValue>)
        );
      },
      [setAtomValue]
    ),
    error: showError ? visibleError : undefined,
    onBlur: useCallback(
      () =>
        setAtomValue((val) =>
          val.touched ? val : Object.assign({}, val, { touched: true })
        ),
      [setAtomValue]
    ),
    touched,
    /** An async validator is running, or a debounced validation is waiting */
    isValidating: !!atomValue.isValidating,
    /** The value differs from the field's initial value */
    isDirty: !isDeepEqual(fieldValue, initialValue),
    /** Attach to the input so the form can focus it when a submit fails */
    ref,
  };
}

export function useFieldWatch(props: IFieldWatchParams) {
  const { fieldNames, formId: extFormId } = props;
  const contextFormId = useContext(FormIdContext);
  const formId = extFormId ?? contextFormId;
  const fieldNameParams =
    fieldNames?.map((f) =>
      typeof f === 'string' ? { name: f, formId } : { ...f, formId }
    ) ?? [];
  const selector = multipleFieldsSelectorFamily(fieldNameParams);
  const { values, extraInfos } = useAtomValue(selector);
  return { values, extraInfos };
}

export function useFieldArrayColumnWatch(props: IFieldArrayColWatchParams) {
  const { fieldArrayName, fieldNames, formId: extFormId, ancestors } = props;
  const contextFormId = useContext(FormIdContext);
  const formId = extFormId ?? contextFormId;
  const selector = fieldArrayColAtomValueSelectorFamily({
    formId,
    ancestors,
    fieldArrayName,
    fieldNames,
  });
  const { values, extraInfos } = useAtomValue(selector);
  return { values, extraInfos };
}

export function useIsDirty(options?: IIsDirtyProps) {
  const formId = useContext(FormIdContext);
  const { values: formValues } = useAtomValue(formValuesAtom(formId));
  const { values: initialValues } = useAtomValue(formInitialValuesAtom(formId));
  const updatedFormValues = options?.preCompareUpdateFormValues
    ? options.preCompareUpdateFormValues(cloneDeep(formValues))
    : formValues;
  return !isDeepEqual(initialValues, updatedFormValues);
}

export function useFormValues(params?: { formId?: string }) {
  const { formId: overrideFormId } = params ?? {};
  const defaultFormId = useContext(FormIdContext);
  const formId = overrideFormId ?? defaultFormId;
  const { values: formValues } = useAtomValue(formValuesAtom(formId));
  return formValues;
}

export function useSetFormProps(params?: { formId?: string }) {
  const { formId: overrideFormId } = params ?? {};
  const defaultFormId = useContext(FormIdContext);
  const formId = overrideFormId ?? defaultFormId;
  const setFormProps = useSetAtom(formPropsOverrideAtom(formId));
  return setFormProps;
}

export function useFormValuesAndExtraInfos(params?: { formId?: string }) {
  const { formId: overrideFormId } = params ?? {};
  const defaultFormId = useContext(FormIdContext);
  const formId = overrideFormId ?? defaultFormId;
  const { values, extraInfos } = useAtomValue(formValuesAtom(formId));
  return { values, extraInfos };
}

export function useInitialValues(params?: { formId?: string }) {
  const { formId: overrideFormId } = params ?? {};
  const defaultFormId = useContext(FormIdContext);
  const formId = overrideFormId ?? defaultFormId;
  const { values } = useAtomValue(formInitialValuesAtom(formId));
  return values;
}

export function useFormContext(params?: { formId?: string }) {
  const { formId: overrideFormId } = params ?? {};
  const defaultFormId = useContext(FormIdContext);
  const formId = overrideFormId ?? defaultFormId;

  /**
   * This is helpful for setting multiple fields
   * Please note this does not include field array and it only works for fields without ancestors
   */
  const setFieldValues = useFormTransaction(
    ({ set, get }) =>
      (
        fieldValues: {
          ancestors?: IAncestorInput[];
          name: string;
          value: any;
          extraInfo?: any;
        }[]
      ) => {
        for (const field of fieldValues) {
          const initialValues = get(
            formInitialValuesAtom(formId)
          ) as InitialValues;
          const newAtomData = {} as Partial<IFieldAtomValue>;
          if (field.value !== undefined) {
            newAtomData.data = field.value;
          }
          if (field.extraInfo !== undefined) {
            newAtomData.extraInfo = field.extraInfo;
          }
          const fieldKey: IFormContextFieldInput = {
            type: 'field',
            name: field.name,
            ancestors: field.ancestors ?? [],
          };
          set(
            fieldAtomFamily({
              ancestors: fieldKey.ancestors ?? [],
              name: fieldKey.name,
              type: fieldKey.type,
              formId,
            }),
            (atomValue) => {
              const updatedAtomData = Object.assign({}, atomValue, newAtomData);
              // If field has not been mounted, this part will ensure that the setValue is not overridden by old initial values
              if (initialValues.version > updatedAtomData.initVer) {
                updatedAtomData.initVer = initialValues.version;
              }
              return updatedAtomData;
            }
          );
        }
      },
    []
  );

  const setValue = useFormTransaction(
    ({ set, get, reset }) =>
      (
        key: string | IFormContextFieldInput,
        newValue: { value?: any; extraInfo?: any }
      ) => {
        const initialValues = get(
          formInitialValuesAtom(formId)
        ) as InitialValues;
        const newAtomData = {} as Partial<IFieldAtomValue>;
        if (newValue.value !== undefined) {
          newAtomData.data = newValue.value;
        }
        if (newValue.extraInfo !== undefined) {
          newAtomData.extraInfo = newValue.extraInfo;
        }
        const fieldKey: IFormContextFieldInput =
          typeof key === 'string'
            ? { type: 'field', name: key, ancestors: [] }
            : key;
        // Note that validation will be triggered within the useField hook
        if (fieldKey.type === 'field') {
          set(
            fieldAtomFamily({
              ancestors: fieldKey.ancestors ?? [],
              name: fieldKey.name,
              type: fieldKey.type,
              formId,
            }),
            (atomValue) => {
              const updatedAtomData = Object.assign({}, atomValue, newAtomData);
              // If field has not been mounted, this part will ensure that the setValue is not overridden by old initial values
              if (initialValues.version > updatedAtomData.initVer) {
                updatedAtomData.initVer = initialValues.version;
              }
              return updatedAtomData;
            }
          );
        } else if (fieldKey.type === 'field-array') {
          setFieldArrayDataAndExtraInfo(
            formId,
            {
              ancestors: fieldKey.ancestors ?? [],
              name: fieldKey.name,
            },
            {
              get,
              set,
              reset,
              // New rows (and their nested arrays) belong to the current initial values, so they never re-initialize from them
              initialValuesVersion: get(formInitialValuesAtom(formId)).version,
              dataArr: newValue.value,
              extraInfoArr: newValue.extraInfo,
            }
          );
        }
      },
    [formId]
  );

  const getValue = useFormTransaction(
    ({ get }) =>
      (key: IFormContextFieldInput) => {
        if (key.type === 'field') {
          const fieldAtom = get(
            fieldAtomFamily({
              ancestors: key.ancestors ?? [],
              name: key.name,
              type: key.type,
              formId,
            })
          ) as IFieldAtomValue;
          const initialValuesAtom = get(
            formInitialValuesAtom(formId)
          ) as InitialValues;
          let value = fieldAtom.data;
          let extraInfo = fieldAtom.extraInfo;
          // Using initial value if field has not been mounted/initialized yet
          if (
            !key.ancestors?.length &&
            value === undefined &&
            fieldAtom.initVer < initialValuesAtom.version
          ) {
            value = getPathInObj(initialValuesAtom.values, key.name);
            extraInfo = getPathInObj(initialValuesAtom.extraInfos, key.name);
          }
          return { value, extraInfo };
        } else if (key.type === 'field-array') {
          const { data, extraInfo } = getFieldArrayDataAndExtraInfo(
            formId,
            {
              ancestors: key.ancestors ?? [],
              name: key.name,
            },
            get
          );
          return { value: data, extraInfo };
        }
        return null;
      },
    [formId]
  );

  const getValues = useFormTransaction(
    ({ get }) =>
      () => {
        return getFormValues(formId, get);
      },
    [formId]
  );

  const checkIsDirty = useFormTransaction(
    ({ get }) =>
      (options?: IIsDirtyProps) => {
        const { values } = getFormValues(formId, get);
        const initialValues = get(formInitialValuesAtom(formId))?.values;
        const updatedFormValues = options?.preCompareUpdateFormValues
          ? options.preCompareUpdateFormValues(values)
          : values;
        return !isDeepEqual(initialValues, updatedFormValues);
      },
    [formId]
  );

  const removeFields = useFormTransaction(
    ({ reset }) =>
      (params: IRemoveFieldParams) => {
        for (const fieldName of params.fieldNames) {
          if (typeof fieldName === 'string') {
            reset(
              fieldAtomFamily({
                ancestors: [],
                formId,
                name: fieldName,
                type: 'field',
              })
            );
          } else {
            reset(
              fieldAtomFamily({
                ancestors: fieldName.ancestors ?? [],
                formId,
                name: fieldName.name,
                type: 'field',
              })
            );
          }
        }
      },
    [formId]
  );

  function resetDataAtoms(reset: FormResetter) {
    if (formId) {
      if (combinedFieldAtomValues?.[formId]?.fields) {
        for (const field of Object.values(
          combinedFieldAtomValues[formId]?.fields ?? {}
        )) {
          reset(fieldAtomFamily(field.param));
        }
        combinedFieldAtomValues[formId].fields = {};
      }

      if (combinedFieldAtomValues?.[formId]?.fieldArrays) {
        for (const fieldArray of Object.values(
          combinedFieldAtomValues[formId]?.fieldArrays ?? {}
        )) {
          reset(fieldAtomFamily(fieldArray.param));
        }
        combinedFieldAtomValues[formId].fieldArrays = {};
      }
    }
  }

  const resetInitialValues = useFormTransaction(
    ({ set, get, reset }) =>
      (values?: any, extraInfos?: any) => {
        resetDataAtoms(reset);
        const existingVal = get(formInitialValuesAtom(formId));
        const newValues = values ?? existingVal.values;
        const newExtraInfos = extraInfos ?? existingVal.extraInfos;
        set(
          formInitialValuesAtom(formId),
          Object.assign({}, existingVal, {
            values: newValues,
            extraInfos: newExtraInfos,
            version: (existingVal.version ?? 0) + 1,
          })
        );
        set(formValuesAtom(formId), {
          values: newValues,
          extraInfos: newExtraInfos,
        });
      },
    [formId]
  );

  const runValidation = useFormTransaction(
    ({ get, set }) =>
      () => {
        const { values, extraInfos } = getFormValues(formId, get);
        return validateForm({
          formId,
          get,
          set,
          values,
          extraInfos,
          schema: get(formConfigAtom(formId)).schema,
        });
      },
    [formId]
  );

  const getValuesAndExtraInfo = useFormTransaction(
    ({ get }) =>
      () => {
        return getFormValues(formId, get);
      },
    []
  );

  /** Validates every field and field array with their sync validators, without submitting */
  const validateAllFields = useCallback(
    () => runValidation().errors,
    [runValidation]
  );

  /** Validates every field and field array and waits for async validators */
  const validateAllFieldsAsync = useCallback(async () => {
    const { errors, collector } = runValidation();
    await collector.settled();
    return errors;
  }, [runValidation]);

  return {
    getValue,
    setValue,
    setFieldValues,
    getValues,
    checkIsDirty,
    removeFields,
    resetInitialValues,
    validateAllFields,
    validateAllFieldsAsync,
    getValuesAndExtraInfo,
    ...useFormErrorActions(formId),
  };
}

export function useFieldArray(props: IFieldArrayProps) {
  const {
    name,
    fieldNames,
    validate,
    skipUnregister,
    ancestors,
    defaultValue,
    schema,
  } = props;
  const formId = useContext(FormIdContext);
  // The array schema runs before validate, as part of the same validator
  const arrayValidate = useMemo(
    () => combineValidators(schema, validate),
    [validate]
  );
  const validationRunRef = useRef(0);
  const fieldArrayAtom = fieldAtomFamily({
    name,
    ancestors: ancestors ?? [],
    type: 'field-array',
    formId,
  }) as unknown as FormAtom<IFieldArrayAtomValue>;
  const initialValues = useAtomValue(formInitialValuesAtom(formId));
  const prevFieldArrayValue = useRef<any>(null);
  const [fieldArrayProps, setFieldArrayProps] = useAtom(
    fieldAtomFamily({
      name,
      ancestors: ancestors ?? [],
      type: 'field-array',
      formId,
    }) as unknown as FormAtom<IFieldArrayAtomValue>
  );
  const fieldArrayValueForValidation = useFieldArrayColumnWatch({
    fieldArrayName: name,
    ancestors: ancestors ?? [],
    // undefined means all fields
    fieldNames: arrayValidate ? undefined : [],
  });
  // const otherParams = useMultipleWatch({ names: depFields ?? [] })

  const setFieldArrayValue = useFormTransaction(
    ({ get, set, reset }) =>
      (fieldValues: any[]) => {
        setFieldArrayDataAndExtraInfo(
          formId,
          { name, ancestors: ancestors ?? [] },
          {
            get,
            set,
            reset,
            // New rows (and their nested arrays) belong to the current initial values, so they never re-initialize from them
            initialValuesVersion: get(formInitialValuesAtom(formId)).version,
            dataArr: fieldValues,
          }
        );
      }
  );

  // Validates the rows and the fields in them. Failing fields are marked as touched.
  const runValidateData = useFormTransaction(
    ({ get, set }) =>
      () => {
        const collector = new ValidationCollector();
        const { errors = [] } = getFieldArrayDataAndExtraInfo(
          formId,
          { name, ancestors: ancestors ?? [] },
          get,
          {
            set,
            isValidation: true,
            collector,
          }
        );
        return { errors, collector };
      },
    [name, fieldArrayProps, formId]
  );

  /** Validates with sync validators. Async validators start, and their errors show when they finish. */
  const validateData = useCallback(() => {
    const { errors } = runValidateData();
    return { errors, isValid: !errors.length };
  }, [runValidateData]);

  /** Validates and waits for async validators */
  const validateDataAsync = useCallback(async () => {
    const { errors, collector } = runValidateData();
    await collector.settled();
    return { errors, isValid: !errors.length };
  }, [runValidateData]);

  useEffect(() => {
    if (
      arrayValidate &&
      fieldArrayProps.initVer &&
      !isDeepEqual(
        fieldArrayValueForValidation?.values,
        prevFieldArrayValue.current?.values
      )
    ) {
      prevFieldArrayValue.current = fieldArrayValueForValidation;
      const runId = ++validationRunRef.current;
      const result = runValidator(() =>
        arrayValidate(fieldArrayValueForValidation?.values ?? [])
      );
      const applyError = (error: ValidationResult) => {
        if (runId === validationRunRef.current) {
          setFieldArrayProps((d) =>
            Object.assign({}, d, { error, isValidating: false })
          );
        }
      };
      if (isPromiseLike<ValidationResult>(result)) {
        setFieldArrayProps((d) =>
          d.isValidating ? d : Object.assign({}, d, { isValidating: true })
        );
        result.then(applyError);
      } else {
        applyError(result);
      }
    }
  }, [
    fieldArrayValueForValidation,
    setFieldArrayProps,
    arrayValidate,
    fieldArrayProps.initVer,
  ]);

  const getFieldArrayValue = useFormTransaction(
    ({ get }) =>
      () => {
        return getFieldArrayDataAndExtraInfo(
          formId,
          { name, ancestors: ancestors ?? [] },
          get
        ).data;
      },
    [name, ancestors, formId]
  );

  const clear = useFormTransaction(
    ({ get, reset }) =>
      (index: number) => {
        const fieldArrayAtomValue = get(
          fieldAtomFamily({
            ancestors: ancestors ?? [],
            name,
            type: 'field-array',
            formId,
          })
        ) as IFieldArrayAtomValue;
        let rowIdToClear = fieldArrayAtomValue.rowIds[index];
        if (rowIdToClear !== null) {
          resetFieldArrayRow(
            formId,
            { name, rowId: rowIdToClear, ancestors: ancestors ?? [] },
            get,
            reset
          );
        }
      },
    [name, ancestors, formId]
  );

  /** Removes the row at `index`, or the rows at several indexes */
  const remove = useFormTransaction(
    ({ set, get, reset }) =>
      (index: number | number[]) => {
        const fieldArrayAtomValue = get(
          fieldAtomFamily({
            ancestors: ancestors ?? [],
            name,
            type: 'field-array',
            formId,
          })
        ) as IFieldArrayAtomValue;
        const rowIdsToRemove = (Array.isArray(index) ? index : [index])
          .map((i) => fieldArrayAtomValue.rowIds[i])
          .filter((rowId) => rowId !== undefined);
        if (!rowIdsToRemove.length) {
          return;
        }
        for (const rowId of rowIdsToRemove) {
          resetFieldArrayRow(
            formId,
            { name, rowId, ancestors: ancestors ?? [] },
            get,
            reset
          );
        }
        set(
          fieldAtomFamily({
            ancestors: ancestors ?? [],
            name,
            type: 'field-array',
            formId,
          }),
          (existingValue) =>
            Object.assign({}, existingValue, {
              rowIds: (existingValue as IFieldArrayAtomValue).rowIds.filter(
                (rowId) => !rowIdsToRemove.includes(rowId)
              ),
            })
        );
      },
    [name, ancestors, formId]
  );

  /** Reorders rows. Only the row order changes, so rows keep their ids, values and state. */
  const reorderRows = useFormTransaction(
    ({ set }) =>
      (reorder: (rowIds: number[]) => number[] | null) => {
        set(fieldArrayAtom, (existingValue) => {
          const rowIds = reorder([...existingValue.rowIds]);
          return rowIds
            ? Object.assign({}, existingValue, { rowIds })
            : existingValue;
        });
      },
    [fieldArrayAtom]
  );

  const swap = useCallback(
    (indexA: number, indexB: number) =>
      reorderRows((rowIds) => {
        if (rowIds[indexA] === undefined || rowIds[indexB] === undefined) {
          return null;
        }
        [rowIds[indexA], rowIds[indexB]] = [rowIds[indexB], rowIds[indexA]];
        return rowIds;
      }),
    [reorderRows]
  );

  const move = useCallback(
    (from: number, to: number) =>
      reorderRows((rowIds) => {
        if (rowIds[from] === undefined || to < 0 || to >= rowIds.length) {
          return null;
        }
        const [rowId] = rowIds.splice(from, 1);
        rowIds.splice(to, 0, rowId);
        return rowIds;
      }),
    [reorderRows]
  );

  /** Replaces the values of the row at `index`, keeping its row id */
  const update = useFormTransaction(
    ({ set, get, reset }) =>
      (index: number, row: any, extraInfo?: any) => {
        setFieldArrayDataAndExtraInfo(
          formId,
          { name, ancestors: ancestors ?? [] },
          {
            get,
            set,
            reset,
            // New rows (and their nested arrays) belong to the current initial values, so they never re-initialize from them
            initialValuesVersion: get(formInitialValuesAtom(formId)).version,
            dataArr: [row],
            extraInfoArr: extraInfo === undefined ? undefined : [extraInfo],
            mode: { type: 'update', rowIndex: index },
          }
        );
      },
    [name, ancestors, formId]
  );

  const removeAll = useFormTransaction(
    ({ get, set, reset }) =>
      () => {
        const fieldArrayAtomValue = get(
          fieldAtomFamily({
            name,
            ancestors: ancestors ?? [],
            type: 'field-array',
            formId,
          })
        ) as IFieldArrayAtomValue;
        const rowIds = fieldArrayAtomValue.rowIds;
        for (const rowId of rowIds) {
          resetFieldArrayRow(
            formId,
            { name, rowId, ancestors: ancestors ?? [] },
            get,
            reset
          );
        }
        set(
          fieldAtomFamily({
            name,
            ancestors: ancestors ?? [],
            type: 'field-array',
            formId,
          }),
          Object.assign({}, fieldArrayAtomValue, {
            rowIds: [],
          })
        );
      },
    [name, ancestors, formId]
  );

  const append = useFormTransaction(
    ({ set, get, reset }) =>
      (...rows: any[]) => {
        setFieldArrayDataAndExtraInfo(
          formId,
          { name, ancestors: ancestors ?? [] },
          {
            get,
            set,
            reset,
            // New rows (and their nested arrays) belong to the current initial values, so they never re-initialize from them
            initialValuesVersion: get(formInitialValuesAtom(formId)).version,
            dataArr: rows,
            mode: { type: 'insert' },
          }
        );
      },
    [name, fieldNames, formId]
  );

  const prepend = useFormTransaction(
    ({ set, get, reset }) =>
      (...rows: any[]) => {
        setFieldArrayDataAndExtraInfo(
          formId,
          { name, ancestors: ancestors ?? [] },
          {
            get,
            set,
            reset,
            // New rows (and their nested arrays) belong to the current initial values, so they never re-initialize from them
            initialValuesVersion: get(formInitialValuesAtom(formId)).version,
            dataArr: rows,
            mode: { type: 'insert', rowIndex: 0 },
          }
        );
      },
    [name, ancestors, formId]
  );

  const insert = useFormTransaction(
    ({ set, get, reset }) =>
      (index: number, ...rows: any[]) => {
        setFieldArrayDataAndExtraInfo(
          formId,
          { name, ancestors: ancestors ?? [] },
          {
            get,
            set,
            reset,
            // New rows (and their nested arrays) belong to the current initial values, so they never re-initialize from them
            initialValuesVersion: get(formInitialValuesAtom(formId)).version,
            dataArr: rows,
            mode: { type: 'insert', rowIndex: index },
          }
        );
      },
    [fieldArrayProps.rowIds, name, formId]
  );

  const initializeFieldArrayValue = useFormTransaction(
    ({ set, get, reset }) =>
      () => {
        const initialValues = get(formInitialValuesAtom(formId));
        const objPath = getFullObjectPath(
          {
            name,
            ancestors: ancestors ?? [],
            type: 'field-array',
            formId,
          },
          get
        );
        const initialValue =
          getPathInObj(initialValues.values, objPath) ?? defaultValue;
        const extraInfo = getPathInObj(initialValues.extraInfos, objPath);
        prevFieldArrayValue.current = {
          values: initialValue ?? [],
          extraInfos: extraInfo ?? [],
        };
        set(
          fieldAtomFamily({
            name,
            ancestors: ancestors ?? [],
            type: 'field-array',
            formId,
          }),
          (val) =>
            Object.assign({}, val, {
              validate: arrayValidate,
              fieldNames,
              initVer: initialValues.version,
              skipUnregister,
            } as Partial<IFieldArrayAtomValue>)
        );
        if (Array.isArray(initialValue)) {
          setFieldArrayDataAndExtraInfo(
            formId,
            { name, ancestors: ancestors ?? [] },
            {
              get,
              set,
              reset,
              dataArr: initialValue,
              extraInfoArr: extraInfo,
              initialValuesVersion: initialValues.version,
              skipRecursion: true,
            }
          );
        }
      },
    [name, arrayValidate, fieldNames, ancestors, skipUnregister, formId]
  );

  const resetFieldArray = useFormTransaction(
    ({ reset, get }) =>
      (name: string) => {
        const topAncestor = ancestors?.[0];
        if (topAncestor) {
          const topAncestorVal = get(
            fieldAtomFamily({
              ancestors: [],
              name: topAncestor.name,
              type: 'field-array',
              formId,
            })
          ) as IFieldArrayAtomValue;
          if (topAncestorVal.skipUnregister) {
            // If top field array has skip unregister, then all field arrays/fields below should follow
            return;
          }
        }
        const fieldArrayAtom = fieldAtomFamily({
          ancestors: ancestors ?? [],
          name,
          type: 'field-array',
          formId,
        });
        const value = get(fieldArrayAtom);
        const fieldArrayAtomValue = value as IFieldArrayAtomValue;
        if (!skipUnregister && !initialValues.settings?.skipUnregister) {
          for (const rowId of fieldArrayAtomValue.rowIds) {
            resetFieldArrayRow(
              formId,
              { name, ancestors: ancestors ?? [], rowId },
              get,
              reset
            );
          }
          reset(fieldArrayAtom);
        }
      },
    [skipUnregister, initialValues, formId]
  );

  useEffect(() => {
    if (fieldArrayProps.initVer < initialValues.version) {
      initializeFieldArrayValue();
    }
  }, [initializeFieldArrayValue, initialValues, fieldArrayProps.initVer]);

  useEffect(() => {
    return () => {
      // Ignore async validations that finish after the field array unmounts
      validationRunRef.current++;
      resetFieldArray(name);
    };
  }, [name, resetFieldArray]);

  return {
    append,
    prepend,
    insert,
    remove,
    removeAll,
    clear,
    swap,
    move,
    update,
    /** Replaces all rows (same as setFieldArrayValue) */
    replace: setFieldArrayValue,
    fieldArrayProps,
    validateData,
    validateDataAsync,
    getFieldArrayValue,
    setFieldArrayValue,
    error: fieldArrayProps?.error,
    /** The array's async validator is running */
    isValidating: !!fieldArrayProps?.isValidating,
  };
}

const getFormValues = (formId: string, get: FormGetter) => {
  const initialValues = get(formInitialValuesAtom(formId)) as InitialValues;
  const values: any =
    !initialValues.settings?.skipUnusedInitialValues && initialValues.values
      ? cloneDeep(initialValues.values)
      : {};
  const extraInfos: any =
    !initialValues.settings?.skipUnusedInitialValues && initialValues.extraInfos
      ? cloneDeep(initialValues.extraInfos)
      : {};
  const fieldArrays = combinedFieldAtomValues[formId]
    ? Object.values(combinedFieldAtomValues[formId]?.fieldArrays ?? {})
    : [];
  // Don't preserve initial values for top level field arrays.
  // One problem with preserving initial values here is that removed rows come back.
  for (const fieldArray of fieldArrays) {
    if (!fieldArray.param.ancestors?.length) {
      setPathInObj(values, fieldArray.param.name, undefined);
    }
  }
  const fields = combinedFieldAtomValues[formId]
    ? Object.values(combinedFieldAtomValues[formId]?.fields ?? {})
    : [];
  for (const fieldAtomValue of fields) {
    const ancestors = fieldAtomValue.param.ancestors;
    let pathAncestors: { name: string; index: number }[] = [];
    if (ancestors.length) {
      for (let i = 0; i < ancestors.length; i++) {
        const fieldArray = fieldArrays.find((f) => {
          if (f.param.name === ancestors[i].name) {
            for (let j = 0; j < i; j++) {
              if (
                f.param.ancestors?.[j]?.name !== ancestors[j].name ||
                f.param.ancestors?.[j]?.rowId !== ancestors[j].rowId
              ) {
                return false;
              }
            }
            return true;
          }
          return false;
        });
        if (fieldArray) {
          pathAncestors.push({
            name: fieldArray.param.name,
            index: fieldArray.atomValue.rowIds.findIndex(
              (rid) => ancestors[i].rowId === rid
            ),
          });
        }
      }
    }
    const data = fieldAtomValue.atomValue.data;
    const extraInfo = fieldAtomValue.atomValue.extraInfo;
    if (!isUndefined(data)) {
      setPathInObj(values, fieldAtomValue.param.name, data, pathAncestors);
    }
    if (!isUndefined(extraInfo)) {
      setPathInObj(
        extraInfos,
        fieldAtomValue.param.name,
        extraInfo,
        pathAncestors
      );
    }
  }
  // A mounted field array with no rows is an empty array (not missing), e.g. for schemas that require an array
  for (const fieldArray of fieldArrays) {
    const { atomValue, param } = fieldArray;
    if (!atomValue.initVer || atomValue.rowIds.length) {
      continue;
    }
    let path = '';
    let isRowMounted = true;
    for (let i = 0; i < param.ancestors.length; i++) {
      const parent = fieldArrays.find(
        (f) =>
          f.param.name === param.ancestors[i].name &&
          f.param.ancestors.length === i &&
          f.param.ancestors.every(
            (a, j) =>
              a.name === param.ancestors[j].name &&
              a.rowId === param.ancestors[j].rowId
          )
      );
      const index =
        parent?.atomValue.rowIds.indexOf(param.ancestors[i].rowId) ?? -1;
      if (index === -1) {
        isRowMounted = false;
        break;
      }
      path += `${param.ancestors[i].name}[${index}].`;
    }
    path += param.name;
    if (isRowMounted && getPathInObj(values, path) === undefined) {
      setPathInObj(values, path, []);
    }
  }
  return { values, extraInfos };
};

// Elements attached with useField's `ref`, used to focus the first invalid field
const fieldElements = new Map<string, Map<string, any>>();

function registerFieldElement(formId: string, key: string, element: any) {
  let elements = fieldElements.get(formId);
  if (element) {
    if (!elements) {
      elements = new Map();
      fieldElements.set(formId, elements);
    }
    elements.set(key, element);
  } else if (elements) {
    elements.delete(key);
    if (!elements.size) {
      fieldElements.delete(formId);
    }
  }
}

function focusField(element: any) {
  if (element && typeof element.focus === 'function') {
    element.focus();
    return true;
  }
  return false;
}

/** Focuses the invalid field that comes first on the page (or first in the error list outside the DOM) */
function focusFirstError(formId: string, errors: IFieldError[]) {
  const elements = fieldElements.get(formId);
  if (!elements) {
    return;
  }
  const candidates = errors
    .map((e) => elements.get(fieldKey(e.name, e.ancestors, e.type)))
    .filter(Boolean);
  if (
    candidates.every((el) => typeof el.compareDocumentPosition === 'function')
  ) {
    candidates.sort((a, b) =>
      // 4 = Node.DOCUMENT_POSITION_FOLLOWING
      a.compareDocumentPosition(b) & 4 ? -1 : 1
    );
  }
  for (const el of candidates) {
    if (focusField(el)) {
      return;
    }
  }
}

function pathFromIssue(path: PropertyKey[]) {
  let result = '';
  for (const segment of path) {
    if (typeof segment === 'number') {
      result += `[${segment}]`;
    } else {
      result += result ? `.${String(segment)}` : String(segment);
    }
  }
  return result;
}

interface IMappedSchemaErrors extends ISchemaErrors {
  params: Record<string, IFieldAtomSelectorInput>;
}

/**
 * Maps schema issues onto the form's mounted fields by their full path (e.g. items[0].qty).
 * An issue without a matching field goes to the closest enclosing field array, or else to the form.
 */
function mapSchemaIssues(
  formId: string,
  get: FormGetter,
  issues: ISchemaIssue[]
): IMappedSchemaErrors {
  const byPath = new Map<string, IFieldAtomSelectorInput>();
  const combined = combinedFieldAtomValues[formId];
  for (const { param } of [
    ...Object.values(combined?.fields ?? {}),
    ...Object.values(combined?.fieldArrays ?? {}),
  ]) {
    byPath.set(getFullObjectPath(param, get), param);
  }
  const result: IMappedSchemaErrors = { fields: {}, form: [], params: {} };
  for (const issue of issues) {
    let param = byPath.get(pathFromIssue(issue.path));
    for (let i = issue.path.length - 1; !param && i > 0; i--) {
      const parent = byPath.get(pathFromIssue(issue.path.slice(0, i)));
      if (parent?.type === 'field-array') {
        param = parent;
      }
    }
    if (param) {
      const key = fieldKey(param.name, param.ancestors, param.type);
      if (!result.fields[key]) {
        result.fields[key] = issue.message;
        result.params[key] = param;
      }
    } else if (!result.form.includes(issue.message)) {
      result.form.push(issue.message);
    }
  }
  return result;
}

function setSchemaErrors(
  set: FormSetter,
  formId: string,
  errors: ISchemaErrors
) {
  set(formSchemaErrorsAtom(formId), (current) =>
    isDeepEqual(current, errors)
      ? current
      : { fields: errors.fields, form: errors.form }
  );
}

function isTargeted(
  param: IFieldAtomSelectorInput,
  targets: IFormContextFieldInput[] | undefined
) {
  if (!targets) {
    return true;
  }
  return targets.some((t) => {
    const tAncestors = t.ancestors ?? [];
    const sameAncestors = (count: number) =>
      tAncestors.every(
        (a, i) =>
          i < count &&
          param.ancestors[i]?.name === a.name &&
          param.ancestors[i]?.rowId === a.rowId
      );
    if (
      t.name === param.name &&
      t.type === param.type &&
      tAncestors.length === param.ancestors.length &&
      sameAncestors(tAncestors.length)
    ) {
      return true;
    }
    // Fields and arrays inside a targeted field array
    return (
      t.type === 'field-array' &&
      param.ancestors.length > tAncestors.length &&
      param.ancestors[tAncestors.length].name === t.name &&
      sameAncestors(tAncestors.length)
    );
  });
}

function toTargets(
  formId: string,
  fieldNames: (string | IFormContextFieldInput)[]
): IFormContextFieldInput[] {
  const combinedFieldArrays = Object.values(
    combinedFieldAtomValues[formId]?.fieldArrays ?? {}
  );
  return fieldNames.map((fieldName) => {
    if (typeof fieldName !== 'string') {
      return fieldName;
    }
    const isFieldArray = combinedFieldArrays.some(
      (c) => c.param.name === fieldName && !c.param.ancestors.length
    );
    return {
      name: fieldName,
      ancestors: [],
      type: isFieldArray ? 'field-array' : 'field',
    };
  });
}

interface IFormValidationRun {
  errors: IFieldError[];
  collector: ValidationCollector;
  /** Schema issues that don't belong to a field (filled in when the schema settles) */
  schemaFormErrors: string[];
}

/**
 * Validates every field and field array, or only `targets`, plus the form schema.
 * Failing fields are marked as touched. Async results are added when `collector` settles.
 */
function validateForm(params: {
  formId: string;
  get: FormGetter;
  set: FormSetter;
  values: any;
  extraInfos: any;
  targets?: IFormContextFieldInput[];
  schema?: StandardSchemaV1;
}): IFormValidationRun {
  const { formId, get, set, values, extraInfos, targets, schema } = params;
  const collector = new ValidationCollector();
  const errors: IFieldError[] = [];
  const run: IFormValidationRun = { errors, collector, schemaFormErrors: [] };
  const otherParams = { values, extraInfos };

  if (!targets) {
    for (const { param } of Object.values(
      combinedFieldAtomValues[formId]?.fields ?? {}
    )) {
      const fieldAtom = fieldAtomFamily(param);
      const fieldData = get(fieldAtom) as IFieldAtomValue;
      validateFieldAtom(
        fieldAtom,
        fieldData.validate,
        [fieldData.data, otherParams],
        set,
        collector,
        (error) =>
          errors.push({
            error,
            ancestors: param.ancestors,
            name: param.name,
            type: 'field',
          })
      );
    }
    for (const { param } of Object.values(
      combinedFieldAtomValues[formId]?.fieldArrays ?? {}
    )) {
      // The fields in the rows were validated above
      getFieldArrayDataAndExtraInfo(formId, param, get, {
        isValidation: true,
        set,
        skipFieldCheck: true,
        collector,
        errors,
      });
    }
  } else {
    for (const field of targets) {
      const ancestors = field.ancestors ?? [];
      if (field.type === 'field') {
        const fieldAtom = fieldAtomFamily({
          name: field.name,
          type: 'field',
          ancestors,
          formId,
        });
        const fieldData = get(fieldAtom) as IFieldAtomValue;
        validateFieldAtom(
          fieldAtom,
          fieldData.validate,
          [fieldData.data, otherParams],
          set,
          collector,
          (error) =>
            errors.push({ error, ancestors, name: field.name, type: 'field' })
        );
      } else {
        getFieldArrayDataAndExtraInfo(
          formId,
          { ancestors, name: field.name },
          get,
          { isValidation: true, set, collector, errors }
        );
      }
    }
  }

  if (schema) {
    const applyIssues = (issues: ISchemaIssue[]) => {
      const mapped = mapSchemaIssues(formId, get, issues);
      setSchemaErrors(set, formId, mapped);
      for (const [key, param] of Object.entries(mapped.params)) {
        if (!isTargeted(param, targets)) {
          continue;
        }
        set(fieldAtomFamily(param), (val) =>
          val.touched && val.validated
            ? val
            : Object.assign({}, val, { touched: true, validated: true })
        );
        const hasError = errors.some(
          (e) =>
            fieldKey(e.name, e.ancestors, e.type) ===
            fieldKey(param.name, param.ancestors, param.type)
        );
        if (!hasError) {
          errors.push({
            error: mapped.fields[key],
            ancestors: param.ancestors,
            name: param.name,
            type: param.type,
          });
        }
      }
      if (!targets) {
        run.schemaFormErrors = mapped.form;
      }
    };
    const issues = getSchemaIssues(schema, values);
    if (isPromiseLike<ISchemaIssue[]>(issues)) {
      collector.addPending(Promise.resolve(issues).then(applyIssues));
    } else {
      applyIssues(issues);
    }
  }
  return run;
}

/** setError, clearErrors, setFormErrors and setFocus, shared by useForm and useFormContext */
function useFormErrorActions(formId: string) {
  const setError = useFormTransaction(
    ({ set }) =>
      (key: string | IFormContextFieldInput, error: string) => {
        const field: IFormContextFieldInput =
          typeof key === 'string' ? toTargets(formId, [key])[0] : key;
        set(
          fieldAtomFamily({
            name: field.name,
            ancestors: field.ancestors ?? [],
            type: field.type,
            formId,
          }),
          (val) =>
            Object.assign({}, val, {
              error,
              touched: true,
              validated: true,
              isValidating: false,
            })
        );
      },
    [formId]
  );

  const clearErrors = useFormTransaction(
    ({ set }) =>
      (keys?: (string | IFormContextFieldInput)[]) => {
        const combined = combinedFieldAtomValues[formId];
        const params: IFieldAtomSelectorInput[] = keys
          ? toTargets(formId, keys).map((f) => ({
              name: f.name,
              ancestors: f.ancestors ?? [],
              type: f.type,
              formId,
            }))
          : [
              ...Object.values(combined?.fields ?? {}),
              ...Object.values(combined?.fieldArrays ?? {}),
            ].map((entry) => entry.param);
        for (const param of params) {
          set(fieldAtomFamily(param), (val) =>
            val.error ? Object.assign({}, val, { error: undefined }) : val
          );
        }
        if (!keys) {
          setSchemaErrors(set, formId, emptySchemaErrors);
          set(formSubmitStateAtom(formId), (s) =>
            s.formErrors.length ? { ...s, formErrors: [] } : s
          );
        } else {
          set(formSchemaErrorsAtom(formId), (current) => {
            const fields = { ...current.fields };
            for (const param of params) {
              delete fields[fieldKey(param.name, param.ancestors, param.type)];
            }
            return { ...current, fields };
          });
        }
      },
    [formId]
  );

  const setFormErrors = useFormTransaction(
    ({ set }) =>
      (formErrors: string[]) => {
        set(formSubmitStateAtom(formId), (s) => ({ ...s, formErrors }));
      },
    [formId]
  );

  const setFocus = useCallback(
    (key: string | IFormContextFieldInput) => {
      const field: IFormContextFieldInput =
        typeof key === 'string' ? toTargets(formId, [key])[0] : key;
      focusField(
        fieldElements
          .get(formId)
          ?.get(fieldKey(field.name, field.ancestors, field.type))
      );
    },
    [formId]
  );

  return { setError, clearErrors, setFormErrors, setFocus };
}

type FormStateKey = keyof IFormState;

function readFormState(get: FormGetter, formId: string, key: FormStateKey) {
  switch (key) {
    case 'isValid':
      return get(formIsValidAtom(formId));
    case 'isValidating':
      return get(formIsValidatingAtom(formId));
    case 'isDirty':
      return get(formIsDirtyAtom(formId));
    case 'errors':
      return get(formErrorsAtom(formId)).errors;
    default:
      return get(formSubmitStateAtom(formId))[key];
  }
}

function formStateAtomFor(formId: string, key: FormStateKey) {
  switch (key) {
    case 'isValid':
      return formIsValidAtom(formId);
    case 'isValidating':
      return formIsValidatingAtom(formId);
    case 'isDirty':
      return formIsDirtyAtom(formId);
    case 'errors':
      return formErrorsAtom(formId);
    default:
      return formSubmitStateAtom(formId);
  }
}

const formStateKeys: FormStateKey[] = [
  'isSubmitting',
  'isSubmitted',
  'isSubmitSuccessful',
  'submitCount',
  'isValidating',
  'isValid',
  'isDirty',
  'errors',
  'formErrors',
];

/**
 * The form state, where reading a property subscribes to it. A component re-renders only when a
 * property it actually read changes, so reading `isSubmitting` doesn't re-render on every keystroke.
 */
function useTrackedFormState(formId: string): IFormState {
  const store = useStore();
  const [, forceRender] = useReducer((x: number) => x + 1, 0);
  const tracked = useRef(new Map<FormStateKey, unknown>());

  useEffect(() => {
    const read = (key: FormStateKey) =>
      readFormState((a) => store.get(a), formId, key);
    // Re-renders when a tracked property changed. The stored values are refreshed first, so a property
    // read outside render (e.g. in an event handler) can't keep triggering renders.
    const renderIfChanged = () => {
      let changed = false;
      for (const [key, value] of tracked.current) {
        const latest = read(key);
        if (!Object.is(latest, value)) {
          tracked.current.set(key, latest);
          changed = true;
        }
      }
      if (changed) {
        forceRender();
      }
    };
    const unsubscribes = [
      ...new Set(
        [...tracked.current.keys()].map((key) => formStateAtomFor(formId, key))
      ),
    ].map((a) => store.sub(a, renderIfChanged));
    // Something may have changed between rendering and subscribing
    renderIfChanged();
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  });

  const state = {} as IFormState;
  for (const key of formStateKeys) {
    Object.defineProperty(state, key, {
      enumerable: true,
      get: () => {
        const value = readFormState((a) => store.get(a), formId, key);
        tracked.current.set(key, value);
        return value;
      },
    });
  }
  return state;
}

/**
 * Reads the form's state (isValid, isDirty, isSubmitting, errors, ...) from any component inside the form.
 * Only the properties you read cause re-renders.
 */
export function useFormState(params?: { formId?: string }): IFormState {
  const defaultFormId = useContext(FormIdContext);
  return useTrackedFormState(params?.formId ?? defaultFormId);
}

export function useForm<Values = any>(props: IFormProps<Values>) {
  const {
    initialValues,
    onError,
    onSubmit,
    skipUnregister,
    validate,
    skipUnusedInitialValues,
    schema,
    mode = 'onTouched',
    shouldFocusError = true,
  } = props;
  const formId = useContext(FormIdContext);
  const store = useStore();
  const formState = useTrackedFormState(formId);
  const initValuesVer = useRef(0);
  const isFormMounted = useRef(false);
  const isFirstRender = useRef(true);

  // Fields read the mode while rendering, so set it before they render the first time
  if (isFirstRender.current) {
    isFirstRender.current = false;
    const config = store.get(formConfigAtom(formId));
    if (
      config.mode !== mode ||
      config.shouldFocusError !== shouldFocusError ||
      config.schema !== schema
    ) {
      store.set(formConfigAtom(formId), { mode, shouldFocusError, schema });
    }
  }
  useEffect(() => {
    store.set(formConfigAtom(formId), (config) =>
      config.mode === mode &&
      config.shouldFocusError === shouldFocusError &&
      config.schema === schema
        ? config
        : { mode, shouldFocusError, schema }
    );
  }, [store, formId, mode, shouldFocusError, schema]);

  const getValidateFnFromAtom = useFormTransaction(({ get }) => () => {
    const validationFn = get(
      formPropsOverrideAtom(formId)
    ) as IFormPropsOverrideAtomValue;
    return validationFn?.validate;
  });

  function resetDataAtoms(reset: FormResetter, set: FormSetter) {
    if (formId) {
      if (combinedFieldAtomValues?.[formId]?.fields) {
        for (const field of Object.values(
          combinedFieldAtomValues[formId]?.fields ?? {}
        )) {
          reset(fieldAtomFamily(field.param));
        }
        combinedFieldAtomValues[formId].fields = {};
      }

      if (combinedFieldAtomValues?.[formId]?.fieldArrays) {
        for (const fieldArray of Object.values(
          combinedFieldAtomValues[formId]?.fieldArrays ?? {}
        )) {
          reset(fieldAtomFamily(fieldArray.param));
        }
        combinedFieldAtomValues[formId].fieldArrays = {};
      }
      setSchemaErrors(set, formId, emptySchemaErrors);
      set(formSubmitStateAtom(formId), (s) =>
        s.formErrors.length ? { ...s, formErrors: [] } : s
      );
    }
  }

  const handleReset = useFormTransaction(
    ({ reset, set }) =>
      () => {
        resetDataAtoms(reset, set);
      },
    [formId]
  );

  useEffect(() => {
    isFormMounted.current = true;
    return () => {
      isFormMounted.current = false;
      handleReset();
    };
  }, [handleReset]);

  const updateInitialValues = useFormTransaction(
    ({ set, get, reset }) =>
      (
        values?: any,
        settings?: {
          skipUnregister?: boolean;
          skipUnusedInitialValues?: boolean;
        },
        extraInfos?: any
      ) => {
        resetDataAtoms(reset, set);
        const existingVal = get(formInitialValuesAtom(formId));
        initValuesVer.current = (existingVal.version ?? 0) + 1;
        const newValues = values ?? existingVal.values;
        const newExtraInfos = extraInfos ?? existingVal.extraInfos;
        set(
          formInitialValuesAtom(formId),
          Object.assign({}, existingVal, {
            values: newValues,
            extraInfos: newExtraInfos,
            version: (existingVal?.version ?? 0) + 1,
            settings: {
              skipUnregister:
                settings?.skipUnregister ??
                existingVal.settings?.skipUnregister,
              skipUnusedInitialValues:
                settings?.skipUnusedInitialValues ??
                existingVal.settings?.skipUnusedInitialValues,
            },
          })
        );
        set(formValuesAtom(formId), {
          values: newValues,
          extraInfos: newExtraInfos,
        });
      },
    [formId]
  );

  const resetInitialValues = useCallback(
    (values?: any, extraInfos?: any) => {
      updateInitialValues(values, undefined, extraInfos);
    },
    [updateInitialValues]
  );

  useEffect(() => {
    // DEVNOTE: Version is 0 when initial values are not set
    if (!initValuesVer.current) {
      updateInitialValues(
        initialValues ?? {},
        { skipUnregister, skipUnusedInitialValues },
        undefined
      );
    }
  }, [
    updateInitialValues,
    skipUnregister,
    skipUnusedInitialValues,
    initialValues,
  ]);

  // The form schema runs whenever a value changes, so fields show its errors as the user types
  // (once they're visible according to `mode`) and formState.isValid stays accurate.
  useEffect(() => {
    if (!schema) {
      store.set(transactionAtom, ({ set }) =>
        setSchemaErrors(set, formId, emptySchemaErrors)
      );
      return;
    }
    let runId = 0;
    let scheduled = false;
    let active = true;
    const run = () => {
      scheduled = false;
      if (!active) {
        return;
      }
      const id = ++runId;
      const { values } = getFormValues(formId, (a) => store.get(a));
      const apply = (issues: ISchemaIssue[]) => {
        if (id === runId) {
          store.set(transactionAtom, ({ get, set }) =>
            setSchemaErrors(set, formId, mapSchemaIssues(formId, get, issues))
          );
        }
      };
      const issues = getSchemaIssues(schema, values);
      if (isPromiseLike<ISchemaIssue[]>(issues)) {
        Promise.resolve(issues).then(apply);
      } else {
        apply(issues);
      }
    };
    // Batch the changes of one interaction (e.g. setFieldValues) into a single run
    const schedule = () => {
      if (!scheduled) {
        scheduled = true;
        queueMicrotask(run);
      }
    };
    // Run right away, so formState.isValid is accurate from the first render after mount
    run();
    const unsubscribeFields = store.sub(
      formFieldsVersionAtom(formId),
      schedule
    );
    const unsubscribeInitial = store.sub(
      formInitialValuesAtom(formId),
      schedule
    );
    return () => {
      runId++;
      active = false;
      unsubscribeFields();
      unsubscribeInitial();
    };
  }, [schema, formId, store]);

  const getValuesAndExtraInfo = useFormTransaction(
    ({ get }) =>
      () => {
        return getFormValues(formId, get);
      },
    []
  );

  const runValidation = useFormTransaction(
    ({ get, set }) =>
      (targets?: IFormContextFieldInput[]) => {
        const { values, extraInfos } = getFormValues(formId, get);
        return validateForm({
          formId,
          get,
          set,
          values,
          extraInfos,
          targets,
          schema,
        });
      },
    [formId, schema]
  );

  const setSubmitState = useCallback(
    (update: Partial<IFormSubmitState>) =>
      store.set(formSubmitStateAtom(formId), (s) => ({ ...s, ...update })),
    [store, formId]
  );

  /**
   * Validates the given fields or field arrays with their sync validators and returns the errors.
   * Async validators start, and their errors show when they finish. Use validateFieldsAsync to wait for them.
   */
  const validateFields = useCallback(
    (fieldNames?: (string | IFormContextFieldInput)[]) => {
      if (!fieldNames?.length) {
        return [];
      }
      return runValidation(toTargets(formId, fieldNames)).errors;
    },
    [runValidation, formId]
  );

  /** Validates the given fields or field arrays and waits for async validators */
  const validateFieldsAsync = useCallback(
    async (fieldNames?: (string | IFormContextFieldInput)[]) => {
      if (!fieldNames?.length) {
        return [];
      }
      const { errors, collector } = runValidation(
        toTargets(formId, fieldNames)
      );
      if (collector.hasPending) {
        setSubmitState({ isValidatingSubmit: true });
        await collector.settled();
        setSubmitState({ isValidatingSubmit: false });
      }
      return errors;
    },
    [runValidation, formId, setSubmitState]
  );

  /** Validates every field and field array with their sync validators, without submitting */
  const validateAllFields = useCallback(
    () => runValidation().errors,
    [runValidation]
  );

  /** Validates every field and field array and waits for async validators, without submitting */
  const validateAllFieldsAsync = useCallback(async () => {
    const { errors, collector } = runValidation();
    if (collector.hasPending) {
      setSubmitState({ isValidatingSubmit: true });
      await collector.settled();
      setSubmitState({ isValidatingSubmit: false });
    }
    return errors;
  }, [runValidation, setSubmitState]);

  const handleSubmit = useCallback(
    (e?: React.FormEvent<HTMLFormElement>) => {
      if (e && e.preventDefault) {
        e.preventDefault();
      }
      if (e && e.stopPropagation) {
        e.stopPropagation();
      }
      store.set(formSubmitStateAtom(formId), (s) => ({
        ...s,
        submitCount: s.submitCount + 1,
      }));
      const { values, extraInfos } = getValuesAndExtraInfo();
      const { errors, collector, ...run } = runValidation();
      const formValidate = getValidateFnFromAtom() ?? validate;
      let formErrors: string[] = [];
      if (formValidate) {
        let result: any;
        try {
          result = formValidate(values);
        } catch (err) {
          result = [errorToMessage(err)];
        }
        if (isPromiseLike<string[] | null | undefined>(result)) {
          collector.addPending(
            Promise.resolve(result).then(
              (res) => {
                formErrors = res ?? [];
              },
              (err) => {
                formErrors = [errorToMessage(err)];
              }
            )
          );
        } else {
          formErrors = result ?? [];
        }
      }

      const submitIfValid = () => {
        const allFormErrors = [...formErrors, ...run.schemaFormErrors];
        if (errors.length || allFormErrors.length) {
          setSubmitState({
            isSubmitted: true,
            isSubmitSuccessful: false,
            isValidatingSubmit: false,
            formErrors: allFormErrors,
          });
          if (store.get(formConfigAtom(formId)).shouldFocusError) {
            focusFirstError(formId, errors);
          }
          if (onError) {
            onError(errors, allFormErrors, values);
          }
          return;
        }
        setSubmitState({
          isSubmitting: true,
          isValidatingSubmit: false,
          formErrors: [],
        });
        const finish = (isSuccess: boolean) =>
          setSubmitState({
            isSubmitting: false,
            isSubmitted: true,
            isSubmitSuccessful: isSuccess,
          });
        let res: any;
        try {
          res = onSubmit?.(values, extraInfos);
        } catch (err) {
          finish(false);
          throw err;
        }
        if (res && res.then) {
          return res.then(
            (isSuccess?: boolean) => {
              if (isFormMounted.current) {
                // Assuming isSuccess to be true by default
                if (isSuccess !== false) {
                  // Make initial values same as final values in order to set isDirty as false after submit
                  updateInitialValues(
                    props?.reinitializeOnSubmit
                      ? (initialValues ?? {})
                      : values,
                    { skipUnregister, skipUnusedInitialValues },
                    props?.reinitializeOnSubmit ? {} : extraInfos
                  );
                }
                finish(isSuccess !== false);
              }
              return isSuccess;
            },
            () => {
              if (isFormMounted.current) {
                finish(false);
              }
            }
          );
        }
        finish(true);
        updateInitialValues(
          props?.reinitializeOnSubmit ? (initialValues ?? {}) : values,
          { skipUnregister, skipUnusedInitialValues },
          props?.reinitializeOnSubmit ? {} : extraInfos
        );
        return res;
      };

      if (collector.hasPending) {
        setSubmitState({ isValidatingSubmit: true });
        return collector.settled().then(submitIfValid);
      }
      return submitIfValid();
    },
    [
      runValidation,
      onSubmit,
      onError,
      validate,
      updateInitialValues,
      skipUnregister,
      skipUnusedInitialValues,
      formId,
      store,
      getValuesAndExtraInfo,
      setSubmitState,
    ]
  );

  return {
    handleSubmit,
    formState,
    handleReset,
    resetInitialValues,
    validateFields,
    validateFieldsAsync,
    validateAllFields,
    validateAllFieldsAsync,
    getValues: getValuesAndExtraInfo,
    ...useFormErrorActions(formId),
  };
}

function FormChildren(props: { children: any }) {
  // TODO: Add values to be passed into onSubmit
  return <Fragment>{props.children}</Fragment>;
}

interface FormProviderOptions {
  /**
   * Use this option only if you want the form atoms to live in the store of an existing jotai <Provider>
   * (or the default jotai store if there is no provider) instead of a new store created for this form.
   */
  skipJotaiProvider?: boolean;
  /**
   * @deprecated Use skipJotaiProvider instead. Kept so that react-recoil-form code works without changes.
   */
  skipRecoilRoot?: boolean;
  /**
   * Skip dirty check and real-time observer for form values. This can result in better performance in some cases.
   */
  skipValuesObserver?: boolean;
  /**
   * This only needs to be specified for advanced cases where you want to watch fields outside the current hierarchy.
   * Note that skipJotaiProvider should also be set to true for this use case.
   */
  formId?: string;
}

const FormIdContext = React.createContext('');

export function FormProvider(props: {
  children: any;
  options?: FormProviderOptions;
}) {
  const formId = useRef<string>(props?.options?.formId ?? generateFormId());
  const isGeneratedFormId = useRef(!props?.options?.formId);
  const storeRef = useRef<ReturnType<typeof createStore> | null>(null);
  const removeAtomsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipJotaiProvider =
    props.options?.skipJotaiProvider ?? props.options?.skipRecoilRoot;
  if (!skipJotaiProvider && !storeRef.current) {
    storeRef.current = createStore();
  }

  useEffect(() => {
    const currentFormId = formId.current;
    if (removeAtomsTimeout.current) {
      // Remounted (e.g. strict mode) before the cached atoms were removed
      clearTimeout(removeAtomsTimeout.current);
      removeAtomsTimeout.current = null;
    }
    return () => {
      delete combinedFieldAtomValues[currentFormId];
      if (isGeneratedFormId.current) {
        // Generated form ids are never reused so the cached atoms for this form can be freed
        removeAtomsTimeout.current = setTimeout(() => {
          removeAtomsTimeout.current = null;
          removeFormAtoms(currentFormId);
        }, 0);
      }
    };
  }, []);

  const children = (
    <FormIdContext.Provider value={formId.current}>
      {props.options?.skipValuesObserver ? null : <FormValuesObserver />}
      <FormChildren {...props} />
    </FormIdContext.Provider>
  );

  if (skipJotaiProvider || !storeRef.current) {
    return children;
  }
  return <Provider store={storeRef.current}>{children}</Provider>;
}

export const withFormProvider =
  (Component: any, options?: FormProviderOptions) =>
  ({ ...props }) => (
    <FormProvider options={options}>
      <Component {...props} />
    </FormProvider>
  );
