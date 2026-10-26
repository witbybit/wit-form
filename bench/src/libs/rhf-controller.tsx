// React Hook Form with controlled inputs (useController), the path for custom inputs and UI kits
import { memo } from 'react';
import {
  useController,
  useFieldArray,
  useForm,
  type Control,
} from 'react-hook-form';
import { quarters, tick, type Line, type Quarter } from '../shared';
import { Total, type Values } from './rhf-shared';

function Cell(props: {
  index: number;
  quarter: Quarter;
  control: Control<Values>;
}) {
  tick();
  const { field } = useController({
    control: props.control,
    name: `lines.${props.index}.${props.quarter}`,
  });
  return (
    <td>
      <input
        data-cell={`${props.index}-${props.quarter}`}
        name={field.name}
        ref={field.ref}
        value={field.value}
        onChange={field.onChange}
        onBlur={field.onBlur}
      />
    </td>
  );
}

const Row = memo(function Row(props: {
  index: number;
  control: Control<Values>;
}) {
  tick();
  return (
    <tr>
      <td>{props.index + 1}</td>
      {quarters.map((quarter) => (
        <Cell
          key={quarter}
          index={props.index}
          quarter={quarter}
          control={props.control}
        />
      ))}
    </tr>
  );
});

export function App(props: { rows: Line[] }) {
  tick();
  const { control } = useForm<Values>({ defaultValues: { lines: props.rows } });
  const { fields } = useFieldArray({ control, name: 'lines' });
  return (
    <table>
      <tbody>
        {fields.map((field, index) => (
          <Row key={field.id} index={index} control={control} />
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td>Total</td>
          {quarters.map((quarter) => (
            <Total
              key={quarter}
              control={control}
              quarter={quarter}
              count={fields.length}
            />
          ))}
        </tr>
      </tfoot>
    </table>
  );
}
