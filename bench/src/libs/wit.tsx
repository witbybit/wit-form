// Mirrors the docs' Render Performance example and the Performance guide
import { memo, useMemo } from 'react';
import {
  FormProvider,
  useField,
  useFieldArray,
  useFieldArrayColumnWatch,
  useForm,
} from 'wit-form';
import { quarters, sum, tick, type Line, type Quarter } from '../shared';

function Cell(props: { rowId: number; index: number; quarter: Quarter }) {
  tick();
  const ancestors = useMemo(
    () => [{ name: 'lines', rowId: props.rowId }],
    [props.rowId]
  );
  const { fieldValue, setFieldValue } = useField<string>({
    name: props.quarter,
    ancestors,
  });
  return (
    <td>
      <input
        data-cell={`${props.index}-${props.quarter}`}
        value={fieldValue ?? ''}
        onChange={(e) => setFieldValue(e.target.value)}
      />
    </td>
  );
}

const Row = memo(function Row(props: { rowId: number; index: number }) {
  tick();
  return (
    <tr>
      <td>{props.index + 1}</td>
      {quarters.map((quarter) => (
        <Cell
          key={quarter}
          rowId={props.rowId}
          index={props.index}
          quarter={quarter}
        />
      ))}
    </tr>
  );
});

function Total(props: { quarter: Quarter }) {
  tick();
  const { values } = useFieldArrayColumnWatch({
    fieldArrayName: 'lines',
    fieldNames: [props.quarter],
  });
  return (
    <td data-total={props.quarter}>
      {sum(values.map((row: Line) => row[props.quarter]))}
    </td>
  );
}

function Table(props: { rows: Line[] }) {
  tick();
  const initialValues = useMemo(() => ({ lines: props.rows }), [props.rows]);
  useForm({ initialValues, onSubmit: () => {} });
  const { fieldArrayProps } = useFieldArray({
    name: 'lines',
    fieldNames: ['name', ...quarters],
  });
  return (
    <table>
      <tbody>
        {fieldArrayProps.rowIds.map((rowId, index) => (
          <Row key={rowId} rowId={rowId} index={index} />
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td>Total</td>
          {quarters.map((quarter) => (
            <Total key={quarter} quarter={quarter} />
          ))}
        </tr>
      </tfoot>
    </table>
  );
}

export function App(props: { rows: Line[] }) {
  return (
    <FormProvider options={{ skipValuesObserver: true }}>
      <Table rows={props.rows} />
    </FormProvider>
  );
}
