import React, { type ReactElement, type ReactNode } from 'react';
import { useField } from './FormProvider';
import { type IAncestorInput, type Validator } from './types';
import type { StandardSchemaV1 } from './validation';

export interface IFieldRenderProps {
  value: any;
  onChange: (data: any, extraInfo?: any) => void;
  onBlur: () => void;
  error: string | null | undefined;
  touched: boolean | undefined;
  extraInfo: any | undefined;
  /** An async validator is running */
  isValidating: boolean;
  /** The value differs from the field's initial value */
  isDirty: boolean;
  /** Attach to the input so the form can focus it when a submit fails */
  ref: (element: any) => void;
}

type RenderProps = (props: IFieldRenderProps) => ReactNode;

export interface IFieldComponentProps {
  children?: RenderProps | ReactElement;
  name: string;
  required?: boolean;
  defaultValue?: any;
  handleChange?: (value?: any) => void;
  ancestors?: IAncestorInput[];
  validate?: Validator;
  validateCallback?: Validator;
  schema?: StandardSchemaV1;
  debounceValidation?: number;
  skipUnregister?: boolean;
  depFields?: (
    string | { name: string; ancestors?: { name: string; rowId: number }[] }
  )[];
}

export const Field = (props: IFieldComponentProps) => {
  const {
    children,
    name,
    required,
    handleChange,
    defaultValue,
    ancestors,
    validate,
    depFields,
    validateCallback,
    schema,
    debounceValidation,
    skipUnregister,
  } = props;
  const {
    fieldValue,
    setFieldValue,
    error,
    onBlur,
    touched,
    extraInfo,
    isValidating,
    isDirty,
    ref,
  } = useField({
    name,
    ancestors,
    defaultValue,
    depFields,
    validateCallback,
    schema,
    debounceValidation,
    skipUnregister,
    validate: validate
      ? validate
      : (value) => {
          if (required && !value) {
            return 'Required';
          }
          return null;
        },
  });

  const fieldProps = {
    value: fieldValue ?? '',
    onChange: (e: any) => {
      const val = e?.target?.value;
      setFieldValue(val);
      handleChange?.(val);
    },
    onBlur,
    error,
    touched,
    extraInfo,
  };

  if (typeof children === 'function') {
    return (
      <>
        {children({
          value: fieldValue ?? '',
          onChange: setFieldValue,
          onBlur,
          error,
          touched,
          extraInfo,
          isValidating,
          isDirty,
          ref,
        })}
      </>
    );
  } else {
    const childrenWithProps = React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child, fieldProps);
      }
      return child;
    });
    return <>{childrenWithProps}</>;
  }
};
