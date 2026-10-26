// TanStack Form with form.Field per cell and selector subscriptions, as its docs recommend
import { useForm, useStore } from '@tanstack/react-form';
import { memo } from 'react';
import { quarters, sum, tick, type Line, type Quarter } from '../shared';

function useBudgetForm(rows: Line[]) {
  return useForm({ defaultValues: { lines: rows } });
}
type Form = ReturnType<typeof useBudgetForm>;

function Cell(props: { form: Form; index: number; quarter: Quarter }) {
  tick();
  return (
    <td>
      <props.form.Field name={`lines[${props.index}].${props.quarter}`}>
        {(field) => {
          tick();
          return (
            <input
              data-cell={`${props.index}-${props.quarter}`}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
          );
        }}
      </props.form.Field>
    </td>
  );
}

const Row = memo(function Row(props: { form: Form; index: number }) {
  tick();
  return (
    <tr>
      <td>{props.index + 1}</td>
      {quarters.map((quarter) => (
        <Cell
          key={quarter}
          form={props.form}
          index={props.index}
          quarter={quarter}
        />
      ))}
    </tr>
  );
});

/** The selector returns a number, so the total re-renders only when its column's sum changes */
function Total(props: { form: Form; quarter: Quarter }) {
  tick();
  const total = useStore(props.form.store, (state) =>
    sum(state.values.lines.map((line) => line[props.quarter]))
  );
  return <td data-total={props.quarter}>{total}</td>;
}

export function App(props: { rows: Line[] }) {
  tick();
  const form = useBudgetForm(props.rows);
  // Subscribe to the row count only, not to the values
  const count = useStore(form.store, (state) => state.values.lines.length);
  return (
    <table>
      <tbody>
        {Array.from({ length: count }, (_, index) => (
          <Row key={index} form={form} index={index} />
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td>Total</td>
          {quarters.map((quarter) => (
            <Total key={quarter} form={form} quarter={quarter} />
          ))}
        </tr>
      </tfoot>
    </table>
  );
}
