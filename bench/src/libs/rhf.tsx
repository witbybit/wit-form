// React Hook Form's recommended path: native, uncontrolled inputs with register
import { memo } from 'react';
import { useFieldArray, useForm, type UseFormRegister } from 'react-hook-form';
import { quarters, tick, type Line, type Quarter } from '../shared';
import { Total, type Values } from './rhf-shared';

function Cell(props: {
  index: number;
  quarter: Quarter;
  register: UseFormRegister<Values>;
}) {
  tick();
  return (
    <td>
      <input
        data-cell={`${props.index}-${props.quarter}`}
        {...props.register(`lines.${props.index}.${props.quarter}`)}
      />
    </td>
  );
}

const Row = memo(function Row(props: {
  index: number;
  register: UseFormRegister<Values>;
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
          register={props.register}
        />
      ))}
    </tr>
  );
});

export function App(props: { rows: Line[] }) {
  tick();
  const { register, control } = useForm<Values>({
    defaultValues: { lines: props.rows },
  });
  const { fields } = useFieldArray({ control, name: 'lines' });
  return (
    <table>
      <tbody>
        {fields.map((field, index) => (
          <Row key={field.id} index={index} register={register} />
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
