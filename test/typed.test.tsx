import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { useMemo } from 'react';
import {
  createFormHooks,
  FormProvider,
  type IAncestorInput,
  type ArrayPath,
  type FieldPath,
  type PathValue,
} from '../src';
import { render, run, unmount } from './render';

afterEach(() => {
  unmount();
});

interface Order {
  customer: { name: string; email?: string };
  note?: string;
  tags: string[];
  items: {
    product: string;
    qty: number;
    options: { label: string; price: number }[];
  }[];
}

const { useForm, useField, useFieldArray, useFormContext, useFieldWatch } =
  createFormHooks<Order>();

describe('type utilities', () => {
  it('computes field paths, array paths and values', () => {
    expectTypeOf<FieldPath<Order>>().toEqualTypeOf<
      | 'customer'
      | 'customer.name'
      | 'customer.email'
      | 'note'
      | 'tags'
      | 'items'
    >();
    expectTypeOf<ArrayPath<Order>>().toEqualTypeOf<'items'>();
    expectTypeOf<PathValue<Order, 'customer.name'>>().toEqualTypeOf<string>();
    expectTypeOf<PathValue<Order, 'tags'>>().toEqualTypeOf<string[]>();
  });
});

describe('createFormHooks', () => {
  it('types names, values and rows, and works at runtime', async () => {
    let fieldArray: any;
    let ctx: any;
    let watched: any;

    function Option(props: { itemRowId: number; rowId: number }) {
      const price = useField({
        name: 'price',
        ancestors: [
          { name: 'items', rowId: props.itemRowId },
          { name: 'options', rowId: props.rowId },
        ],
      });
      expectTypeOf(price.fieldValue).toEqualTypeOf<number | undefined>();
      return null;
    }

    // Ancestors built with useMemo need `as const` to keep their literal names
    function MemoItem(props: { rowId: number }) {
      const ancestors = useMemo(
        () => [{ name: 'items', rowId: props.rowId }] as const,
        [props.rowId]
      );
      const product = useField({ name: 'product', ancestors });
      expectTypeOf(product.fieldValue).toEqualTypeOf<string | undefined>();
      return null;
    }
    void MemoItem;

    // With plain string names, the row falls back to any instead of failing
    function LooseItem(props: { ancestors: IAncestorInput[] }) {
      const anything = useField({
        name: 'whatever',
        ancestors: props.ancestors,
      });
      expectTypeOf(anything.fieldValue).toBeAny();
      return null;
    }
    void LooseItem;

    function Item(props: { rowId: number }) {
      const qty = useField({
        name: 'qty',
        ancestors: [{ name: 'items', rowId: props.rowId }],
      });
      expectTypeOf(qty.fieldValue).toEqualTypeOf<number | undefined>();
      // @ts-expect-error 'price' is a field of options rows, not of items rows
      useField({ name: 'price', ancestors: [{ name: 'items', rowId: 1 }] });
      const options = useFieldArray({
        name: 'options',
        ancestors: [{ name: 'items', rowId: props.rowId }],
        fieldNames: ['label', 'price'],
      });
      return (
        <>
          {options.fieldArrayProps.rowIds.map((rowId) => (
            <Option key={rowId} itemRowId={props.rowId} rowId={rowId} />
          ))}
        </>
      );
    }

    function Form() {
      useForm({
        initialValues: { customer: { name: 'Jane' } },
        onSubmit: (values) => {
          expectTypeOf(values).toEqualTypeOf<Order>();
        },
      });
      const name = useField({ name: 'customer.name' });
      expectTypeOf(name.fieldValue).toEqualTypeOf<string | undefined>();
      expectTypeOf(name.setFieldValue).parameter(0).toEqualTypeOf<string>();
      // @ts-expect-error a typo in a field name is a compile error
      useField({ name: 'customer.nmae' });
      fieldArray = useFieldArray({
        name: 'items',
        fieldNames: [
          'product',
          'qty',
          { name: 'options', type: 'field-array', fieldNames: ['label'] },
        ],
      });
      // @ts-expect-error 'tags' holds strings, so it can't be a field array
      void (() => useFieldArray({ name: 'tags', fieldNames: [] }));
      const typedCtx = useFormContext();
      // @ts-expect-error the value must match the field's type
      void (() => typedCtx.setValue('customer.name', { value: 3 }));
      ctx = typedCtx;
      watched = useFieldWatch({ fieldNames: ['customer.name'] }).values;
      return (
        <>
          {fieldArray.fieldArrayProps.rowIds.map((rowId: number) => (
            <Item key={rowId} rowId={rowId} />
          ))}
        </>
      );
    }

    await render(
      <FormProvider>
        <Form />
      </FormProvider>
    );

    await run(() =>
      fieldArray.append({ product: 'Pen', qty: 2, options: [{ label: 'Red' }] })
    );
    await run(() => ctx.setValue('customer.name', { value: 'Ann' }));
    expect(watched.customer.name).toBe('Ann');
    expect(ctx.getValues().values).toEqual({
      customer: { name: 'Ann' },
      items: [{ product: 'Pen', qty: 2, options: [{ label: 'Red' }] }],
    });
  });
});
