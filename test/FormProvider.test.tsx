import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { afterEach, describe, expect, it } from 'vitest';
import { formInitialValuesAtom } from '../src/atoms';
import { FormProvider, useField, useFieldArray, useForm } from '../src';
import { container, render, run, unmount } from './render';

afterEach(() => {
  unmount();
});

describe('it', () => {
  it('renders without crashing', async () => {
    await render(
      <FormProvider>
        <div></div>
      </FormProvider>
    );
  });

  it('reconciles a mounted field array when initial values reset to an explicit empty array', async () => {
    const formId = 'field-array-empty-reset';
    const initialValues = {
      items: [{ name: 'first' }, { name: 'second' }],
    };
    let bumpInitialValues: (values: any) => void = () => {};
    let getFieldArrayValue: () => any[] = () => [];

    function FieldArrayRow(props: { rowId: number }) {
      const { fieldValue } = useField({
        ancestors: [{ name: 'items', rowId: props.rowId }],
        name: 'name',
      });

      return <div data-testid="field-array-row">{fieldValue}</div>;
    }

    function InitialValuesUpdater() {
      const setInitialValues = useSetAtom(formInitialValuesAtom(formId));

      useEffect(() => {
        bumpInitialValues = (values: any) => {
          setInitialValues((current) => ({
            ...current,
            values,
            version: current.version + 1,
          }));
        };
      }, [setInitialValues]);

      return null;
    }

    function Form() {
      useForm({
        initialValues,
        onSubmit: () => undefined,
        skipUnregister: true,
      });
      const fieldArray = useFieldArray({
        fieldNames: ['name'],
        name: 'items',
      });
      getFieldArrayValue = fieldArray.getFieldArrayValue;

      return (
        <>
          <InitialValuesUpdater />
          {fieldArray.fieldArrayProps.rowIds.map((rowId) => (
            <FieldArrayRow key={rowId} rowId={rowId} />
          ))}
        </>
      );
    }

    await render(
      <FormProvider options={{ formId }}>
        <Form />
      </FormProvider>
    );

    expect(
      container.querySelectorAll('[data-testid="field-array-row"]')
    ).toHaveLength(2);
    expect(getFieldArrayValue()).toEqual([
      { name: 'first' },
      { name: 'second' },
    ]);

    // This targets the mounted reinitialization path: an explicit [] must still
    // reconcile rowIds instead of preserving stale row data.
    await run(() => bumpInitialValues({ items: [] }));

    expect(
      container.querySelectorAll('[data-testid="field-array-row"]')
    ).toHaveLength(0);
    expect(getFieldArrayValue()).toEqual([]);
  });
});
