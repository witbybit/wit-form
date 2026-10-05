import { useMemo, useState } from 'react';
import { Provider as JotaiProvider } from 'jotai';
import {
  FormProvider,
  useFieldArray,
  useFormContext,
  useFormValues,
  useForm,
} from 'wit-form';
import { NumberField, SelectField, TextField } from '../components/fields';
import { Alert, Button, Card, Example } from '../components/ui';

const FORM_ID = 'checkout';

const products: Record<string, { label: string; price: number }> = {
  tee: { label: 'Logo T-shirt', price: 25 },
  mug: { label: 'Coffee mug', price: 12 },
  cap: { label: 'Baseball cap', price: 20 },
};

const productOptions = Object.entries(products).map(([value, p]) => ({
  value,
  label: `${p.label} ($${p.price})`,
}));

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const validateQty = (value?: number) =>
  value !== undefined && value < 1 ? 'At least 1' : null;

function CartLine(props: { rowId: number; onRemove: () => void }) {
  const ancestors = useMemo(
    () => [{ name: 'items', rowId: props.rowId }],
    [props.rowId]
  );
  return (
    <div className="flex items-start gap-2">
      <SelectField
        className="flex-1"
        name="product"
        label="Product"
        hideLabel
        options={productOptions}
        ancestors={ancestors}
        required
      />
      <NumberField
        className="w-20"
        name="qty"
        label="Quantity"
        hideLabel
        min={1}
        defaultValue={1}
        ancestors={ancestors}
        validate={validateQty}
      />
      <Button
        size="sm"
        variant="ghost"
        className="mt-1"
        onClick={props.onRemove}
      >
        Remove
      </Button>
    </div>
  );
}

function CartLines() {
  const { fieldArrayProps, append, remove } = useFieldArray({
    name: 'items',
    fieldNames: ['product', 'qty'],
  });
  return (
    <div className="space-y-2">
      {fieldArrayProps.rowIds.map((rowId, index) => (
        <CartLine key={rowId} rowId={rowId} onRemove={() => remove(index)} />
      ))}
      <Button size="sm" onClick={() => append({ qty: 1 })}>
        + Add item
      </Button>
    </div>
  );
}

function CheckoutForm(props: { onPlaced: (values: unknown) => void }) {
  const { handleSubmit } = useForm({
    initialValues: { items: [{ product: 'tee', qty: 2 }] },
    onSubmit: (values) => props.onPlaced(values),
  });
  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <section className="space-y-3">
        <h3 className="font-semibold">Cart</h3>
        <CartLines />
      </section>
      <section className="space-y-3">
        <h3 className="font-semibold">Contact</h3>
        <TextField name="email" label="Email" type="email" required />
        <TextField name="coupon" label="Coupon code" hint="Try SAVE10" />
      </section>
      <Button type="submit" variant="primary">
        Place order
      </Button>
    </form>
  );
}

/**
 * Rendered outside the checkout FormProvider. It reaches the form through its formId,
 * which works because both share the same Jotai store.
 */
function OrderSummary() {
  const values = useFormValues({ formId: FORM_ID });
  const { setValue } = useFormContext({ formId: FORM_ID });

  const items: { product?: string; qty?: number }[] = values.items ?? [];
  const subtotal = items.reduce(
    (sum, item) =>
      sum + (products[item.product ?? '']?.price ?? 0) * (item.qty ?? 0),
    0
  );
  const discount =
    values.coupon?.toUpperCase() === 'SAVE10' ? subtotal * 0.1 : 0;

  return (
    <Card className="space-y-4 text-sm">
      <h3 className="font-semibold">Order summary</h3>
      <ul className="space-y-1">
        {items
          .filter((item) => item.product)
          .map((item, index) => (
            <li key={index} className="flex justify-between">
              <span>
                {products[item.product!].label} × {item.qty ?? 0}
              </span>
              <span className="tabular-nums">
                {money.format(products[item.product!].price * (item.qty ?? 0))}
              </span>
            </li>
          ))}
      </ul>
      <dl className="space-y-1 border-t border-slate-200 pt-3">
        <div className="flex justify-between">
          <dt className="text-slate-500">Subtotal</dt>
          <dd className="tabular-nums">{money.format(subtotal)}</dd>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <dt>SAVE10</dt>
            <dd className="tabular-nums">−{money.format(discount)}</dd>
          </div>
        )}
        <div className="flex justify-between font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{money.format(subtotal - discount)}</dd>
        </div>
      </dl>
      {!discount && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setValue('coupon', { value: 'SAVE10' })}
        >
          Apply SAVE10 from here
        </Button>
      )}
    </Card>
  );
}

export default function OutsideProvider() {
  const [placed, setPlaced] = useState<unknown>();
  return (
    // One Jotai store shared by the form and the summary
    <JotaiProvider>
      <Example
        title="Checkout"
        description="The order summary lives outside the form's FormProvider, in a different part of the page. It reads and updates the form through its formId."
        aside={<OrderSummary />}
      >
        <Card className="space-y-4">
          {placed !== undefined && (
            <Alert tone="success" title="Order placed">
              <pre className="whitespace-pre-wrap text-xs">
                {JSON.stringify(placed, null, 2)}
              </pre>
            </Alert>
          )}
          {/* skipJotaiProvider keeps the form's atoms in the surrounding store */}
          <FormProvider options={{ formId: FORM_ID, skipJotaiProvider: true }}>
            <CheckoutForm onPlaced={setPlaced} />
          </FormProvider>
        </Card>
      </Example>
    </JotaiProvider>
  );
}
