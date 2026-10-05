import { useMemo, useState } from 'react';
import {
  useFieldArray,
  useFieldArrayColumnWatch,
  useFieldWatch,
  useForm,
  withFormProvider,
  type IAncestorInput,
} from 'wit-form';
import { NumberField, TextField } from '../components/fields';
import { Button, Card, Example, FormInspector } from '../components/ui';

interface LineItem {
  description?: string;
  quantity?: number;
  price?: number;
}

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const lineTotal = (item: LineItem) => (item.quantity ?? 0) * (item.price ?? 0);

// Field array validators get every row. Define them outside the component (or memoize them).
const validateItems = (rows: LineItem[]) =>
  rows.length === 0 ? 'Add at least one line item' : null;

const validatePositive = (value?: number) =>
  value !== undefined && value <= 0 ? 'Must be above 0' : null;

/** Watches the two fields of one row, so it re-renders only when that row changes */
function RowAmount(props: { ancestors: IAncestorInput[] }) {
  const { values } = useFieldWatch({
    fieldNames: [
      { name: 'quantity', ancestors: props.ancestors },
      { name: 'price', ancestors: props.ancestors },
    ],
  });
  return (
    <span className="tabular-nums">{money.format(lineTotal(values))}</span>
  );
}

/** Watches the quantity and price columns of every row */
function Totals() {
  const { values: rows } = useFieldArrayColumnWatch({
    fieldArrayName: 'items',
    fieldNames: ['quantity', 'price'],
  });
  const subtotal = rows.reduce(
    (sum: number, row: LineItem) => sum + lineTotal(row),
    0
  );
  const tax = subtotal * 0.08;
  return (
    <dl className="ml-auto w-64 space-y-1 text-sm">
      <div className="flex justify-between">
        <dt className="text-slate-500">Subtotal</dt>
        <dd className="tabular-nums">{money.format(subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-slate-500">Tax (8%)</dt>
        <dd className="tabular-nums">{money.format(tax)}</dd>
      </div>
      <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
        <dt>Total</dt>
        <dd className="tabular-nums">{money.format(subtotal + tax)}</dd>
      </div>
    </dl>
  );
}

function LineItemRow(props: {
  rowId: number;
  index: number;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  // Fields inside a row pass the row as an ancestor. Memoize it so it keeps its identity.
  const ancestors = useMemo(
    () => [{ name: 'items', rowId: props.rowId }],
    [props.rowId]
  );
  return (
    <tr className="align-top">
      <td className="py-2 pr-2">
        <TextField
          name="description"
          label={`Description, row ${props.index + 1}`}
          hideLabel
          ancestors={ancestors}
          required
          placeholder="What did you deliver?"
        />
      </td>
      <td className="w-24 py-2 pr-2">
        <NumberField
          name="quantity"
          label={`Quantity, row ${props.index + 1}`}
          hideLabel
          ancestors={ancestors}
          defaultValue={1}
          required
          validate={validatePositive}
        />
      </td>
      <td className="w-32 py-2 pr-2">
        <NumberField
          name="price"
          label={`Unit price, row ${props.index + 1}`}
          hideLabel
          prefix="$"
          ancestors={ancestors}
          required
          validate={validatePositive}
        />
      </td>
      <td className="w-28 py-3.5 pr-2 text-right text-sm">
        <RowAmount ancestors={ancestors} />
      </td>
      <td className="w-36 py-2 text-right">
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={props.onDuplicate}>
            Duplicate
          </Button>
          <Button size="sm" variant="ghost" onClick={props.onRemove}>
            Remove
          </Button>
        </div>
      </td>
    </tr>
  );
}

function InvoiceForm() {
  const [submitted, setSubmitted] = useState<unknown>();

  const { handleSubmit, handleReset } = useForm({
    initialValues: {
      client: 'Acme Corp',
      items: [
        { description: 'Design system audit', quantity: 1, price: 1800 },
        { description: 'Component workshop (hours)', quantity: 6, price: 150 },
      ],
    },
    onSubmit: (values) => setSubmitted(values),
  });

  const { fieldArrayProps, append, insert, remove, getFieldArrayValue, error } =
    useFieldArray({
      name: 'items',
      fieldNames: ['description', 'quantity', 'price'],
      validate: validateItems,
    });

  return (
    <Example
      title="Invoice"
      description="Add, duplicate and remove line items. Row amounts and the total update as you type, and each one re-renders only when the values it watches change."
      aside={<FormInspector submitted={submitted} />}
    >
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <TextField name="client" label="Bill to" required />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="pb-1 font-medium">Description</th>
                  <th className="pb-1 font-medium">Qty</th>
                  <th className="pb-1 font-medium">Unit price</th>
                  <th className="pb-1 pr-2 text-right font-medium">Amount</th>
                  <th className="pb-1">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Always key rows by rowId, never by index */}
                {fieldArrayProps.rowIds.map((rowId, index) => (
                  <LineItemRow
                    key={rowId}
                    rowId={rowId}
                    index={index}
                    onDuplicate={() =>
                      insert(index + 1, getFieldArrayValue()[index])
                    }
                    onRemove={() => remove(index)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-start justify-between gap-4">
            <Button size="sm" onClick={() => append({ quantity: 1 })}>
              + Add line item
            </Button>
            <Totals />
          </div>

          <div className="flex gap-3 border-t border-slate-200 pt-4">
            <Button type="submit" variant="primary">
              Send invoice
            </Button>
            <Button variant="ghost" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </form>
      </Card>
    </Example>
  );
}

export default withFormProvider(InvoiceForm);
