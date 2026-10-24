import { useMemo } from 'react';
import { useWatch, type Control } from 'react-hook-form';
import { sum, tick, type Line, type Quarter } from '../shared';

export type Values = { lines: Line[] };

/**
 * Watches exactly one column by listing its paths, so editing q2 re-renders only the q2 total.
 * This is the tightest subscription React Hook Form offers; watching 'lines' would wake all four totals.
 */
export function Total(props: {
  control: Control<Values>;
  quarter: Quarter;
  count: number;
}) {
  tick();
  const names = useMemo(
    () =>
      Array.from(
        { length: props.count },
        (_, i) => `lines.${i}.${props.quarter}` as const
      ),
    [props.count, props.quarter]
  );
  const values = useWatch({ control: props.control, name: names }) as string[];
  return <td data-total={props.quarter}>{sum(values)}</td>;
}
