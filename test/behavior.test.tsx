import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FormProvider,
  useField,
  useFieldArray,
  useFieldArrayColumnWatch,
  useFieldWatch,
  useForm,
  useFormContext,
  useFormValues,
  useIsDirty,
} from '../src';

const flushEffects = () => new Promise((resolve) => setTimeout(resolve, 0));

let container: HTMLDivElement;

async function render(element: React.ReactElement) {
  container = document.createElement('div');
  await act(async () => {
    ReactDOM.render(element, container);
    await flushEffects();
  });
}

async function run(fn: () => any) {
  let result: any;
  await act(async () => {
    result = fn();
    await flushEffects();
    await flushEffects();
  });
  return result;
}

afterEach(() => {
  if (container) {
    ReactDOM.unmountComponentAtNode(container);
  }
});

const renderCounts: { [name: string]: number } = {};

function TextField(props: {
  name: string;
  ancestors?: { name: string; rowId: number }[];
  required?: boolean;
  defaultValue?: any;
  api?: { [key: string]: any };
}) {
  const key = [
    ...(props.ancestors ?? []).map((a) => `${a.name}-${a.rowId}`),
    props.name,
  ].join('.');
  renderCounts[key] = (renderCounts[key] ?? 0) + 1;
  const { fieldValue, setFieldValue, error, onBlur } = useField({
    name: props.name,
    ancestors: props.ancestors,
    defaultValue: props.defaultValue,
    validate: (value) => (props.required && !value ? 'Required' : null),
  });
  if (props.api) {
    props.api[key] = setFieldValue;
  }
  return (
    <div data-field={key}>
      <span className="value">{fieldValue ?? ''}</span>
      <span className="error">{error ?? ''}</span>
      <button className="blur" onClick={onBlur} />
    </div>
  );
}

function text(selector: string) {
  return container.querySelector(selector)?.textContent;
}

describe('fields', () => {
  it('initializes, updates, validates and submits field values', async () => {
    const onSubmit = vi.fn();
    const onError = vi.fn();
    const setters: { [key: string]: any } = {};
    let form: ReturnType<typeof useForm> = null as any;
    let formValues: any;
    let isDirty: boolean = false;

    function Observer() {
      formValues = useFormValues();
      isDirty = useIsDirty();
      return null;
    }

    function Form() {
      form = useForm({
        initialValues: { first: 'John', nested: { last: 'Doe' } },
        onSubmit,
        onError,
      });
      return (
        <>
          <TextField name="first" required api={setters} />
          <TextField name="nested.last" required api={setters} />
          <TextField name="email" required api={setters} />
          <Observer />
        </>
      );
    }

    await render(
      <FormProvider>
        <Form />
      </FormProvider>
    );

    expect(text('[data-field="first"] .value')).toBe('John');
    expect(text('[data-field="nested.last"] .value')).toBe('Doe');
    expect(formValues).toEqual({ first: 'John', nested: { last: 'Doe' } });
    expect(isDirty).toBe(false);

    await run(() => form.handleSubmit());
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toEqual([
      { error: 'Required', ancestors: [], name: 'email', type: 'field' },
    ]);
    expect(text('[data-field="email"] .error')).toBe('Required');

    const firstRenders = renderCounts['first'];
    await run(() => setters['email']('john@example.com'));
    expect(text('[data-field="email"] .value')).toBe('john@example.com');
    expect(text('[data-field="email"] .error')).toBe('');
    // Changing one field should not render the other fields
    expect(renderCounts['first']).toBe(firstRenders);
    expect(formValues).toEqual({
      first: 'John',
      nested: { last: 'Doe' },
      email: 'john@example.com',
    });
    expect(isDirty).toBe(true);

    await run(() => form.handleSubmit());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({
      first: 'John',
      nested: { last: 'Doe' },
      email: 'john@example.com',
    });
    // Initial values are updated after submit so form is no longer dirty
    expect(isDirty).toBe(false);
  });

  it('supports form context helpers', async () => {
    let ctx: ReturnType<typeof useFormContext> = null as any;
    let watched: any;

    function Watcher() {
      watched = useFieldWatch({ fieldNames: ['a', 'b'] }).values;
      return null;
    }

    function Form() {
      useForm({ initialValues: { a: 1, b: 2 }, onSubmit: () => undefined });
      ctx = useFormContext();
      return (
        <>
          <TextField name="a" />
          <TextField name="b" />
          <Watcher />
        </>
      );
    }

    await render(
      <FormProvider>
        <Form />
      </FormProvider>
    );

    expect(watched).toEqual({ a: 1, b: 2 });
    await run(() => ctx.setValue('a', { value: 10 }));
    expect(text('[data-field="a"] .value')).toBe('10');
    expect(ctx.getValue({ name: 'a', type: 'field' })).toEqual({
      value: 10,
      extraInfo: undefined,
    });
    expect(watched).toEqual({ a: 10, b: 2 });

    await run(() =>
      ctx.setFieldValues([
        { name: 'a', value: 100 },
        { name: 'b', value: 200, extraInfo: 'info' },
      ])
    );
    expect(ctx.getValues()).toEqual({
      values: { a: 100, b: 200 },
      extraInfos: { b: 'info' },
    });
    expect(ctx.checkIsDirty()).toBe(true);

    await run(() => ctx.resetInitialValues({ a: 'x', b: 'y' }));
    expect(text('[data-field="a"] .value')).toBe('x');
    expect(text('[data-field="b"] .value')).toBe('y');
    expect(ctx.checkIsDirty()).toBe(false);
    expect(watched).toEqual({ a: 'x', b: 'y' });
  });

  it('removes values of unmounted fields unless skipUnregister is set', async () => {
    let ctx: ReturnType<typeof useFormContext> = null as any;
    let setShow: (show: boolean) => void = () => {};

    function Form(props: { skipUnregister?: boolean }) {
      const [show, _setShow] = React.useState(true);
      setShow = _setShow;
      useForm({
        onSubmit: () => undefined,
        skipUnregister: props.skipUnregister,
      });
      ctx = useFormContext();
      return show ? <TextField name="temp" /> : null;
    }

    for (const skipUnregister of [false, true]) {
      await render(
        <FormProvider>
          <Form skipUnregister={skipUnregister} />
        </FormProvider>
      );
      await run(() => ctx.setValue('temp', { value: 'hello' }));
      expect(ctx.getValues().values).toEqual({ temp: 'hello' });
      await run(() => setShow(false));
      expect(ctx.getValues().values).toEqual(
        skipUnregister ? { temp: 'hello' } : {}
      );
      ReactDOM.unmountComponentAtNode(container);
    }
  });
});

describe('field arrays', () => {
  it('appends, inserts, removes and validates rows', async () => {
    let fa: ReturnType<typeof useFieldArray> = null as any;
    let form: ReturnType<typeof useForm> = null as any;
    let column: any;
    let formValues: any;
    const onSubmit = vi.fn();
    const onError = vi.fn();

    function Column() {
      column = useFieldArrayColumnWatch({
        fieldArrayName: 'items',
        fieldNames: ['qty'],
      }).values;
      formValues = useFormValues();
      return null;
    }

    function Form() {
      form = useForm({
        initialValues: { items: [{ name: 'a', qty: 1 }] },
        onSubmit,
        onError,
      });
      fa = useFieldArray({ name: 'items', fieldNames: ['name', 'qty'] });
      return (
        <>
          {fa.fieldArrayProps.rowIds.map((rowId) => (
            <div key={rowId} className="row">
              <TextField
                name="name"
                required
                ancestors={[{ name: 'items', rowId }]}
              />
              <TextField name="qty" ancestors={[{ name: 'items', rowId }]} />
            </div>
          ))}
          <Column />
        </>
      );
    }

    await render(
      <FormProvider>
        <Form />
      </FormProvider>
    );

    expect(container.querySelectorAll('.row')).toHaveLength(1);
    expect(fa.getFieldArrayValue()).toEqual([{ name: 'a', qty: 1 }]);
    expect(column).toEqual([{ qty: 1 }]);

    await run(() => fa.append({ name: 'c', qty: 3 }));
    await run(() => fa.insert(1, { name: 'b', qty: 2 }));
    expect(fa.getFieldArrayValue()).toEqual([
      { name: 'a', qty: 1 },
      { name: 'b', qty: 2 },
      { name: 'c', qty: 3 },
    ]);
    expect(column).toEqual([{ qty: 1 }, { qty: 2 }, { qty: 3 }]);
    expect(formValues).toEqual({
      items: [
        { name: 'a', qty: 1 },
        { name: 'b', qty: 2 },
        { name: 'c', qty: 3 },
      ],
    });

    await run(() => fa.remove(0));
    expect(container.querySelectorAll('.row')).toHaveLength(2);
    expect(fa.getFieldArrayValue()).toEqual([
      { name: 'b', qty: 2 },
      { name: 'c', qty: 3 },
    ]);

    await run(() => fa.clear(0));
    expect(fa.getFieldArrayValue()).toEqual([
      { name: undefined, qty: undefined },
      { name: 'c', qty: 3 },
    ]);

    await run(() => form.handleSubmit());
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onError.mock.calls[0][0]).toHaveLength(1);
    expect(onError.mock.calls[0][0][0]).toMatchObject({
      error: 'Required',
      name: 'name',
      type: 'field',
    });

    await run(() => fa.setFieldArrayValue([{ name: 'z', qty: 9 }]));
    expect(container.querySelectorAll('.row')).toHaveLength(1);
    expect(fa.getFieldArrayValue()).toEqual([{ name: 'z', qty: 9 }]);

    await run(() => form.handleSubmit());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({
      items: [{ name: 'z', qty: 9 }],
    });

    await run(() => fa.removeAll());
    expect(container.querySelectorAll('.row')).toHaveLength(0);
    expect(form.getValues().values.items).toBeUndefined();
  });

  // Note: setting nested values only works for rows whose nested field arrays are already mounted
  it('supports nested field arrays and setting field arrays from context', async () => {
    let ctx: ReturnType<typeof useFormContext> = null as any;
    const fieldNames = [
      'title',
      {
        name: 'tasks',
        type: 'field-array' as const,
        fieldNames: ['label'],
      },
    ];

    function Tasks(props: { rowId: number }) {
      const ancestors = React.useMemo(
        () => [{ name: 'sections', rowId: props.rowId }],
        [props.rowId]
      );
      const fa = useFieldArray({
        name: 'tasks',
        fieldNames: ['label'],
        ancestors,
      });
      return (
        <>
          {fa.fieldArrayProps.rowIds.map((rowId) => (
            <TextField
              key={rowId}
              name="label"
              ancestors={[...ancestors, { name: 'tasks', rowId }]}
            />
          ))}
        </>
      );
    }

    function Form() {
      useForm({
        initialValues: {
          sections: [
            { title: 's1', tasks: [{ label: 't1' }, { label: 't2' }] },
          ],
        },
        onSubmit: () => undefined,
      });
      ctx = useFormContext();
      const fa = useFieldArray({ name: 'sections', fieldNames });
      return (
        <>
          {fa.fieldArrayProps.rowIds.map((rowId) => (
            <div key={rowId}>
              <TextField
                name="title"
                ancestors={[{ name: 'sections', rowId }]}
              />
              <Tasks rowId={rowId} />
            </div>
          ))}
        </>
      );
    }

    await render(
      <FormProvider>
        <Form />
      </FormProvider>
    );

    expect(container.querySelectorAll('[data-field$=".label"]')).toHaveLength(
      2
    );

    await run(() =>
      ctx.setValue(
        { name: 'sections', type: 'field-array' },
        {
          value: [
            {
              title: 'n1',
              tasks: [{ label: 'x' }, { label: 'y' }, { label: 'z' }],
            },
          ],
        }
      )
    );
    expect(
      ctx.getValue({ name: 'sections', type: 'field-array' })?.value
    ).toEqual([
      { title: 'n1', tasks: [{ label: 'x' }, { label: 'y' }, { label: 'z' }] },
    ]);
    expect(ctx.getValues().values).toEqual({
      sections: [
        {
          title: 'n1',
          tasks: [{ label: 'x' }, { label: 'y' }, { label: 'z' }],
        },
      ],
    });
    expect(container.querySelectorAll('[data-field$=".label"]')).toHaveLength(
      3
    );
  });
});
