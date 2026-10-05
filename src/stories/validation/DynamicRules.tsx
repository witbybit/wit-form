import { useCallback, useState } from 'react';
import { useField, useForm, withFormProvider } from 'wit-form';
import { SelectField } from '../components/fields';
import { Button, Card, Example, FormInspector } from '../components/ui';

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

/**
 * `validate` is read once, when the field mounts. When the rule depends on props or
 * state that change, pass a memoized `validateCallback` instead. The latest callback is
 * used the next time the field validates: when its value changes, or on submit.
 */
function AmountField(props: { balance: number }) {
  const { balance } = props;
  const validateCallback = useCallback(
    (value?: number) => {
      if (value === undefined) return 'Required';
      if (value <= 0) return 'Enter an amount above zero';
      if (value > balance)
        return `Exceeds your balance of ${formatter.format(balance)}`;
      return null;
    },
    [balance]
  );

  const { fieldValue, setFieldValue, onBlur, error } = useField<
    number | undefined
  >({ name: 'amount', validateCallback });

  return (
    <div>
      <label
        htmlFor="amount"
        className="mb-1 block text-sm font-medium text-slate-700"
      >
        Amount <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-sm text-slate-500">
          $
        </span>
        <input
          id="amount"
          type="number"
          className={`block w-full rounded-md border-0 py-1.5 pl-6 text-sm shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset ${
            error
              ? 'ring-red-300 focus:ring-red-500'
              : 'ring-slate-300 focus:ring-indigo-600'
          }`}
          value={fieldValue ?? ''}
          onChange={(e) =>
            setFieldValue(
              e.target.value === '' ? undefined : e.target.valueAsNumber
            )
          }
          onBlur={onBlur}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const accounts = [
  { label: 'Savings ••4821', value: 'savings' },
  { label: 'Joint ••1937', value: 'joint' },
];

function TransferForm() {
  // State that lives outside the form, e.g. from props or a data fetch
  const [balance, setBalance] = useState(250);
  const [submitted, setSubmitted] = useState<unknown>();

  const { handleSubmit } = useForm({
    initialValues: { amount: 300 },
    onSubmit: (values) => {
      setSubmitted(values);
      setBalance((b) => b - values.amount);
    },
  });

  return (
    <Example
      title="Transfer money"
      description="The amount starts above your balance, so submitting fails. Add funds and submit again: the same amount is now checked against the new balance."
      aside={<FormInspector submitted={submitted} />}
    >
      <Card>
        <div className="mb-6 flex items-center justify-between rounded-lg bg-slate-50 p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Available balance
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatter.format(balance)}
            </p>
          </div>
          <Button size="sm" onClick={() => setBalance((b) => b + 100)}>
            + Add $100
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <SelectField name="to" label="To" options={accounts} required />
          <AmountField balance={balance} />
          <Button type="submit" variant="primary">
            Send money
          </Button>
        </form>
      </Card>
    </Example>
  );
}

export default withFormProvider(TransferForm);
