import { act, memo, useMemo } from 'react';
import * as v from 'valibot';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  FormProvider,
  useField,
  useFieldArray,
  useForm,
  useFormContext,
  useFormState,
  type ValidationMode,
} from '../src';
import { container, render, run, unmount } from './render';

afterEach(() => {
  unmount();
});

const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

type Api = { [key: string]: any };

function Input(props: {
  name: string;
  api: Api;
  ancestors?: { name: string; rowId: number }[];
  validate?: any;
  schema?: any;
  debounceValidation?: number;
}) {
  const field = useField({
    name: props.name,
    ancestors: props.ancestors,
    validate: props.validate,
    schema: props.schema,
    debounceValidation: props.debounceValidation,
  });
  const key = [
    ...(props.ancestors ?? []).map((a) => `${a.name}-${a.rowId}`),
    props.name,
  ].join('.');
  props.api[key] = field;
  return (
    <input
      data-field={key}
      ref={field.ref}
      value={field.fieldValue ?? ''}
      onChange={(e) => field.setFieldValue(e.target.value)}
      onBlur={field.onBlur}
    />
  );
}

describe('async validation', () => {
  it('validates asynchronously, shows isValidating and ignores stale results', async () => {
    const api: Api = {};
    const pending: {
      value: string;
      d: ReturnType<typeof deferred<string | null>>;
    }[] = [];
    const validate = (value?: string) => {
      const d = deferred<string | null>();
      pending.push({ value: value ?? '', d });
      return d.promise;
    };
    function Form() {
      useForm({ onSubmit: () => undefined });
      return <Input name="username" validate={validate} api={api} />;
    }
    await render(
      <FormProvider>
        <Form />
      </FormProvider>
    );
    await run(() => api.username.onBlur());
    await run(() => api.username.setFieldValue('taken'));
    expect(api.username.isValidating).toBe(true);
    await run(() => api.username.setFieldValue('free'));
    // The newer validation finishes first
    await run(() => pending[pending.length - 1].d.resolve(null));
    expect(api.username.isValidating).toBe(false);
    expect(api.username.error).toBeUndefined();
    // The stale "taken" result arrives late and is ignored
    await run(() =>
      pending.find((p) => p.value === 'taken')!.d.resolve('Taken')
    );
    expect(api.username.error).toBeUndefined();
  });

  it('debounces validation while typing', async () => {
    const api: Api = {};
    const validate = vi.fn((value?: string) =>
      value === 'bad' ? 'Bad value' : null
    );
    function Form() {
      useForm({ onSubmit: () => undefined });
      return (
        <Input name="q" validate={validate} debounceValidation={30} api={api} />
      );
    }
    await render(
      <FormProvider>
        <Form />
      </FormProvider>
    );
    await wait(50);
    validate.mockClear();
    await run(() => api.q.onBlur());
    await run(() => api.q.setFieldValue('b'));
    await run(() => api.q.setFieldValue('ba'));
    await run(() => api.q.setFieldValue('bad'));
    expect(validate).not.toHaveBeenCalled();
    expect(api.q.isValidating).toBe(true);
    await wait(50);
    expect(validate).toHaveBeenCalledTimes(1);
    expect(validate).toHaveBeenCalledWith('bad', expect.anything());
    expect(api.q.error).toBe('Bad value');
    expect(api.q.isValidating).toBe(false);
  });

  it('waits for async field, array and form validators on submit', async () => {
    const api: Api = {};
    const onSubmit = vi.fn();
    const onError = vi.fn();
    let form: any;
    let state: any;
    const isTaken = async (value?: string) => {
      await new Promise((r) => setTimeout(r, 10));
      return value === 'admin' ? 'Taken' : null;
    };
    function Form() {
      form = useForm({
        initialValues: { username: 'admin', tags: [{ label: 'a' }] },
        onSubmit,
        onError,
        validate: async (values: any) =>
          values.username === 'root' ? ['No root'] : [],
      });
      state = form.formState;
      // Read so the test can check it
      void state.isValidating;
      const { fieldArrayProps } = useFieldArray({
        name: 'tags',
        fieldNames: ['label'],
        validate: async (rows: any[]) =>
          rows.length > 1 ? 'At most one tag' : null,
      });
      return (
        <>
          <Input name="username" validate={isTaken} api={api} />
          {fieldArrayProps.rowIds.map((rowId) => (
            <Input
              key={rowId}
              name="label"
              ancestors={[{ name: 'tags', rowId }]}
              api={api}
            />
          ))}
        </>
      );
    }
    await render(
      <FormProvider>
        <Form />
      </FormProvider>
    );
    await wait(20);

    let submitPromise: any;
    await act(async () => {
      submitPromise = form.handleSubmit();
    });
    expect(submitPromise).toBeInstanceOf(Promise);
    expect(state.isValidating).toBe(true);
    await act(async () => {
      await submitPromise;
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onError.mock.calls[0][0]).toEqual([
      { error: 'Taken', ancestors: [], name: 'username', type: 'field' },
    ]);
    expect(api.username.error).toBe('Taken');
    expect(state.isValidating).toBe(false);

    await run(() => api.username.setFieldValue('root'));
    await wait(20);
    await act(async () => {
      await form.handleSubmit();
    });
    expect(onError.mock.calls[1][1]).toEqual(['No root']);
    expect(form.formState.formErrors).toEqual(['No root']);

    await run(() => api.username.setFieldValue('jane'));
    await wait(20);
    await act(async () => {
      await form.handleSubmit();
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({
      username: 'jane',
      tags: [{ label: 'a' }],
    });
  });

  it('keeps submit synchronous when every validator is sync', async () => {
    const onSubmit = vi.fn(() => 'done');
    let form: any;
    function Form() {
      form = useForm({ onSubmit });
      return <Input name="a" validate={() => null} api={{}} />;
    }
    await render(
      <FormProvider>
        <Form />
      </FormProvider>
    );
    let result: any;
    await act(async () => {
      result = form.handleSubmit();
    });
    expect(result).toBe('done');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('treats a rejected or throwing validator as an error', async () => {
    const api: Api = {};
    let form: any;
    function Form() {
      form = useForm({ onSubmit: () => undefined });
      return (
        <>
          <Input
            name="a"
            validate={async () => {
              throw new Error('Network error');
            }}
            api={api}
          />
          <Input
            name="b"
            validate={() => {
              throw new Error('Boom');
            }}
            api={api}
          />
        </>
      );
    }
    await render(
      <FormProvider>
        <Form />
      </FormProvider>
    );
    let errors: any;
    await act(async () => {
      errors = await form.validateAllFieldsAsync();
    });
    expect(errors.map((e: any) => e.error).sort()).toEqual([
      'Boom',
      'Network error',
    ]);
    expect(api.a.error).toBe('Network error');
  });
});

describe('schema validation (Standard Schema)', () => {
  it('validates a field with a Zod or Valibot schema', async () => {
    const api: Api = {};
    let form: any;
    function Form() {
      form = useForm({ onSubmit: () => undefined });
      return (
        <>
          <Input name="email" schema={z.email('Enter an email')} api={api} />
          <Input
            name="age"
            schema={v.pipe(v.string(), v.minLength(2, 'Too short'))}
            validate={(value: string) => (value === '00' ? 'Not zero' : null)}
            api={api}
          />
        </>
      );
    }
    await render(
      <FormProvider>
        <Form />
      </FormProvider>
    );
    await run(() => api.email.setFieldValue('nope'));
    await run(() => api.age.setFieldValue('1'));
    const errors = await run(() => form.validateAllFields());
    expect(errors.map((e: any) => [e.name, e.error])).toEqual([
      ['email', 'Enter an email'],
      ['age', 'Too short'],
    ]);
    // validate runs after the schema passes
    await run(() => api.age.setFieldValue('00'));
    expect(api.age.error).toBe('Not zero');
    await run(() => api.email.setFieldValue('a@b.co'));
    expect(api.email.error).toBeUndefined();
  });

  it('maps form schema issues to fields, field array rows and the form', async () => {
    const api: Api = {};
    const onSubmit = vi.fn();
    const onError = vi.fn();
    let form: any;
    const schema = z
      .object({
        name: z.string().min(1, 'Name is required'),
        address: z.object({ city: z.string().min(1, 'City is required') }),
        items: z
          .array(z.object({ qty: z.coerce.number().min(1, 'At least 1') }))
          .min(1, 'Add an item'),
        password: z.string(),
        confirm: z.string(),
      })
      .refine((values) => values.password === values.confirm, {
        message: 'Passwords do not match',
      });
    function Form() {
      form = useForm({
        initialValues: {
          name: '',
          address: { city: '' },
          items: [{ qty: '0' }, { qty: '2' }],
          password: 'a',
          confirm: 'b',
        },
        schema,
        onSubmit,
        onError,
      });
      const { fieldArrayProps } = useFieldArray({
        name: 'items',
        fieldNames: ['qty'],
      });
      return (
        <>
          <Input name="name" api={api} />
          <Input name="address.city" api={api} />
          <Input name="password" api={api} />
          <Input name="confirm" api={api} />
          {fieldArrayProps.rowIds.map((rowId) => (
            <Input
              key={rowId}
              name="qty"
              ancestors={[{ name: 'items', rowId }]}
              api={api}
            />
          ))}
        </>
      );
    }
    await render(
      <FormProvider>
        <Form />
      </FormProvider>
    );
    // Errors exist before submit but aren't shown until the field is touched
    expect(form.formState.isValid).toBe(false);
    expect(api.name.error).toBeUndefined();

    await run(() => form.handleSubmit());
    expect(onSubmit).not.toHaveBeenCalled();
    const [fieldErrors, formErrors] = onError.mock.calls[0];
    const rowIds = Object.keys(api)
      .filter((k) => k.startsWith('items-'))
      .map((k) => Number(k.split('.')[0].replace('items-', '')));
    expect(fieldErrors).toEqual(
      expect.arrayContaining([
        {
          error: 'Name is required',
          name: 'name',
          ancestors: [],
          type: 'field',
        },
        {
          error: 'City is required',
          name: 'address.city',
          ancestors: [],
          type: 'field',
        },
        {
          error: 'At least 1',
          name: 'qty',
          ancestors: [{ name: 'items', rowId: rowIds[0] }],
          type: 'field',
        },
      ])
    );
    expect(fieldErrors).toHaveLength(3);
    expect(formErrors).toEqual(['Passwords do not match']);
    expect(api.name.error).toBe('Name is required');
    expect(api[`items-${rowIds[0]}.qty`].error).toBe('At least 1');
    expect(api[`items-${rowIds[1]}.qty`].error).toBeUndefined();

    // Errors update as the user fixes them
    await run(() => api.name.setFieldValue('Jane'));
    expect(api.name.error).toBeUndefined();

    await run(() => {
      api['address.city'].setFieldValue('Paris');
      api[`items-${rowIds[0]}.qty`].setFieldValue('3');
      api.confirm.setFieldValue('a');
    });
    expect(form.formState.isValid).toBe(true);
    await run(() => form.handleSubmit());
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('supports async schemas and array-level issues', async () => {
    const onError = vi.fn();
    let form: any;
    let fa: any;
    const schema = z.object({
      items: z
        .array(z.object({ qty: z.string() }))
        .refine(async (rows) => rows.length > 0, 'Add an item'),
    });
    function Form() {
      form = useForm({ schema, onSubmit: () => undefined, onError });
      fa = useFieldArray({ name: 'items', fieldNames: ['qty'] });
      return null;
    }
    await render(
      <FormProvider>
        <Form />
      </FormProvider>
    );
    await act(async () => {
      await form.handleSubmit();
    });
    expect(onError.mock.calls[0][0]).toEqual([
      {
        error: 'Add an item',
        name: 'items',
        ancestors: [],
        type: 'field-array',
      },
    ]);
    void fa;
  });

  it('validates a field array with an array schema', async () => {
    let fa: any;
    function Form() {
      useForm({ onSubmit: () => undefined });
      fa = useFieldArray({
        name: 'people',
        fieldNames: ['name'],
        schema: z.array(z.object({ name: z.any() })).min(1, 'Add a person'),
      });
      return null;
    }
    await render(
      <FormProvider>
        <Form />
      </FormProvider>
    );
    await run(() => fa.validateData());
    expect(fa.error).toBe('Add a person');
    await run(() => fa.append({ name: 'Jane' }));
    expect(fa.error).toBeUndefined();
  });
});

describe('form state', () => {
  it('tracks submit flags, validity, dirtiness and errors', async () => {
    const api: Api = {};
    let renders = 0;
    let state: any;
    let form: any;
    let submitResult = true;
    function SubmitButton() {
      renders++;
      const formState = useFormState();
      // Reads only isSubmitting, so typing must not re-render this component
      void formState.isSubmitting;
      return null;
    }
    function Status() {
      state = useFormState();
      void [state.isValid, state.isDirty, state.errors, state.submitCount];
      void [state.isSubmitted, state.isSubmitSuccessful];
      return null;
    }
    function Form() {
      form = useForm({
        initialValues: { name: 'Jane' },
        onSubmit: async () => submitResult,
      });
      return (
        <>
          <Input
            name="name"
            validate={(value?: string) => (!value ? 'Required' : null)}
            api={api}
          />
          <SubmitButton />
          <Status />
        </>
      );
    }
    await render(
      <FormProvider>
        <Form />
      </FormProvider>
    );
    expect(state.isValid).toBe(true);
    expect(state.isDirty).toBe(false);
    expect(state.isSubmitted).toBe(false);
    const rendersBefore = renders;

    await run(() => api.name.setFieldValue('Janet'));
    expect(state.isDirty).toBe(true);
    expect(api.name.isDirty).toBe(true);
    await run(() => api.name.setFieldValue('Jane'));
    expect(api.name.isDirty).toBe(false);
    await run(() => api.name.setFieldValue(''));
    expect(state.isValid).toBe(false);
    expect(state.errors).toEqual([
      { error: 'Required', name: 'name', ancestors: [], type: 'field' },
    ]);
    expect(renders).toBe(rendersBefore);

    await act(async () => {
      await form.handleSubmit();
    });
    expect(state.submitCount).toBe(1);
    expect(state.isSubmitted).toBe(true);
    expect(state.isSubmitSuccessful).toBe(false);

    await run(() => api.name.setFieldValue('Ann'));
    submitResult = false;
    await act(async () => {
      await form.handleSubmit();
    });
    expect(state.submitCount).toBe(2);
    expect(state.isSubmitSuccessful).toBe(false);
    submitResult = true;
    await act(async () => {
      await form.handleSubmit();
    });
    expect(state.isSubmitSuccessful).toBe(true);
    // The submitted values became the initial values
    expect(state.isDirty).toBe(false);
  });

  it('sets and clears errors, including server errors', async () => {
    const api: Api = {};
    let ctx: any;
    let form: any;
    function Form() {
      form = useForm({
        onSubmit: async () => {
          ctx.setError('email', 'Already registered');
          ctx.setFormErrors(['Could not save']);
          return false;
        },
      });
      ctx = useFormContext();
      return <Input name="email" api={api} />;
    }
    await render(
      <FormProvider>
        <Form />
      </FormProvider>
    );
    await act(async () => {
      await form.handleSubmit();
    });
    expect(api.email.error).toBe('Already registered');
    expect(form.formState.formErrors).toEqual(['Could not save']);
    expect(form.formState.isValid).toBe(false);
    await run(() => ctx.clearErrors(['email']));
    expect(api.email.error).toBeUndefined();
    await run(() => ctx.setError('email', 'Again'));
    await run(() => ctx.clearErrors());
    expect(api.email.error).toBeUndefined();
    expect(form.formState.formErrors).toEqual([]);
  });

  it('focuses the first invalid field on a failed submit', async () => {
    const api: Api = {};
    let form: any;
    const required = (value?: string) => (!value ? 'Required' : null);
    function Form() {
      form = useForm({ initialValues: { a: 'ok' }, onSubmit: () => undefined });
      return (
        <>
          <Input name="a" validate={required} api={api} />
          <Input name="b" validate={required} api={api} />
          <Input name="c" validate={required} api={api} />
        </>
      );
    }
    await render(
      <FormProvider>
        <Form />
      </FormProvider>
    );
    document.body.appendChild(container);
    await run(() => form.handleSubmit());
    expect(document.activeElement).toBe(
      container.querySelector('[data-field="b"]')
    );
    container.remove();
  });

  it.each<[ValidationMode, boolean, boolean]>([
    ['onTouched', false, false],
    ['onChange', true, true],
    ['onSubmit', false, false],
  ])(
    'shows errors according to mode %s',
    async (mode, visibleAfterChange, visibleAfterBlur) => {
      const api: Api = {};
      let form: any;
      function Form() {
        form = useForm({ onSubmit: () => undefined, mode });
        return (
          <Input
            name="a"
            validate={(value?: string) => (value === 'x' ? 'No x' : null)}
            api={api}
          />
        );
      }
      await render(
        <FormProvider>
          <Form />
        </FormProvider>
      );
      await run(() => api.a.setFieldValue('x'));
      expect(api.a.error !== undefined).toBe(visibleAfterChange);
      await run(() => api.a.onBlur());
      expect(api.a.error !== undefined).toBe(
        mode === 'onTouched' ? true : visibleAfterBlur
      );
      await run(() => form.handleSubmit());
      expect(api.a.error).toBe('No x');
    }
  );
});

describe('field array operations', () => {
  it('prepends, swaps, moves, updates, replaces and removes rows', async () => {
    let fa: any;
    let rowRenders: { [rowId: number]: number } = {};
    const Row = memo(function Row(props: { rowId: number }) {
      rowRenders[props.rowId] = (rowRenders[props.rowId] ?? 0) + 1;
      const ancestors = useMemo(
        () => [{ name: 'items', rowId: props.rowId }],
        [props.rowId]
      );
      useField({ name: 'name', ancestors });
      return null;
    });
    function Form() {
      useForm({
        initialValues: { items: [{ name: 'b' }, { name: 'c' }] },
        onSubmit: () => undefined,
      });
      fa = useFieldArray({ name: 'items', fieldNames: ['name'] });
      return (
        <>
          {fa.fieldArrayProps.rowIds.map((rowId: number) => (
            <Row key={rowId} rowId={rowId} />
          ))}
        </>
      );
    }
    await render(
      <FormProvider>
        <Form />
      </FormProvider>
    );
    const names = () => fa.getFieldArrayValue().map((r: any) => r.name);

    await run(() => fa.prepend({ name: 'a' }));
    expect(names()).toEqual(['a', 'b', 'c']);

    const idsBefore = [...fa.fieldArrayProps.rowIds];
    rowRenders = {};
    await run(() => fa.swap(0, 2));
    expect(names()).toEqual(['c', 'b', 'a']);
    // Rows keep their ids and values, so memoized rows don't re-render
    expect(fa.fieldArrayProps.rowIds).toEqual([
      idsBefore[2],
      idsBefore[1],
      idsBefore[0],
    ]);
    expect(rowRenders).toEqual({});

    await run(() => fa.move(0, 2));
    expect(names()).toEqual(['b', 'a', 'c']);

    await run(() => fa.update(1, { name: 'A' }));
    expect(names()).toEqual(['b', 'A', 'c']);
    expect(fa.fieldArrayProps.rowIds[1]).toBe(idsBefore[0]);

    await run(() => fa.remove([0, 2]));
    expect(names()).toEqual(['A']);

    await run(() => fa.replace([{ name: 'x' }, { name: 'y' }]));
    expect(names()).toEqual(['x', 'y']);
  });
});

describe('field array schema errors', () => {
  it('returns the form schema error of a field array as its error', async () => {
    let fa: any;
    function Form() {
      useForm({
        schema: z.object({ items: z.array(z.any()).min(1, 'Add an item') }),
        onSubmit: () => undefined,
      });
      fa = useFieldArray({ name: 'items', fieldNames: ['name'] });
      return null;
    }
    await render(
      <FormProvider>
        <Form />
      </FormProvider>
    );
    expect(fa.error).toBe('Add an item');
    await run(() => fa.append({ name: 'a' }));
    expect(fa.error).toBeUndefined();
  });
});

describe('nested field arrays', () => {
  it('fills nested rows of new rows from data, or from the nested defaultValue', async () => {
    let fa: any;
    let ctx: any;
    function Lessons(props: { rowId: number }) {
      const ancestors = useMemo(
        () => [{ name: 'sections', rowId: props.rowId }],
        [props.rowId]
      );
      const lessons = useFieldArray({
        name: 'lessons',
        fieldNames: ['title'],
        ancestors,
        defaultValue: [{ title: 'Default lesson' }],
      });
      return (
        <>
          {lessons.fieldArrayProps.rowIds.map((rowId) => (
            <Input
              key={rowId}
              name="title"
              ancestors={[...ancestors, { name: 'lessons', rowId }]}
              api={{}}
            />
          ))}
        </>
      );
    }
    function Form() {
      useForm({
        initialValues: {
          sections: [{ title: 'Old', lessons: [{ title: 'Old lesson' }] }],
        },
        onSubmit: () => undefined,
      });
      ctx = useFormContext();
      fa = useFieldArray({
        name: 'sections',
        fieldNames: [
          'title',
          { name: 'lessons', type: 'field-array', fieldNames: ['title'] },
        ],
      });
      return (
        <>
          {fa.fieldArrayProps.rowIds.map((rowId: number) => (
            <Lessons key={rowId} rowId={rowId} />
          ))}
        </>
      );
    }
    await render(
      <FormProvider>
        <Form />
      </FormProvider>
    );
    // Inserted at index 0, where the initial values have "Old lesson": it must not be copied
    await run(() => fa.prepend({ title: 'New' }));
    await run(() =>
      fa.append({ title: 'With data', lessons: [{ title: 'Given' }] })
    );
    expect(ctx.getValues().values.sections).toEqual([
      { title: 'New', lessons: [{ title: 'Default lesson' }] },
      { title: 'Old', lessons: [{ title: 'Old lesson' }] },
      { title: 'With data', lessons: [{ title: 'Given' }] },
    ]);
  });
});

describe('form schema with empty nested fields', () => {
  it('reports the error on the empty field, not on its missing parent object', async () => {
    const onError = vi.fn();
    let form: any;
    function Form() {
      form = useForm({
        schema: z.object({
          contact: z.object({ email: z.email('Enter an email') }),
        }),
        onSubmit: () => undefined,
        onError,
      });
      return <Input name="contact.email" api={{}} />;
    }
    await render(
      <FormProvider>
        <Form />
      </FormProvider>
    );
    await run(() => form.handleSubmit());
    expect(onError.mock.calls[0][0]).toEqual([
      {
        error: 'Enter an email',
        name: 'contact.email',
        ancestors: [],
        type: 'field',
      },
    ]);
    expect(onError.mock.calls[0][1]).toEqual([]);
    // The submitted values aren't changed
    expect(form.getValues().values).toEqual({});
  });
});
