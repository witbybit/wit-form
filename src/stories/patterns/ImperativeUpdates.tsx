import { useState } from 'react';
import { useForm, useFormContext, withFormProvider } from 'wit-form';
import { TextField } from '../components/fields';
import { Button, Card, Example, FormInspector, sleep } from '../components/ui';

// A fake postal code lookup
const postalCodes: Record<string, { city: string; state: string }> = {
  '10001': { city: 'New York', state: 'NY' },
  '94103': { city: 'San Francisco', state: 'CA' },
  '60601': { city: 'Chicago', state: 'IL' },
};

const savedAddress = {
  street: '1 Infinite Loop',
  zip: '95014',
  city: 'Cupertino',
  state: 'CA',
};

const addressFields = ['street', 'zip', 'city', 'state'] as const;

/**
 * Any component inside the FormProvider can read and write the form with useFormContext,
 * without being one of the fields.
 */
function AddressFields(props: { prefix: 'billing' | 'shipping' }) {
  const { setValue } = useFormContext();
  const [lookingUp, setLookingUp] = useState(false);

  const lookupZip = async (zip: string) => {
    const match = postalCodes[zip];
    if (!match) return;
    setLookingUp(true);
    await sleep(400);
    // Setting a field re-validates it, so a "Required" error clears
    setValue(`${props.prefix}.city`, { value: match.city });
    setValue(`${props.prefix}.state`, { value: match.state });
    setLookingUp(false);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-6">
      <TextField
        className="sm:col-span-6"
        name={`${props.prefix}.street`}
        label="Street address"
        required
      />
      <TextField
        className="sm:col-span-2"
        name={`${props.prefix}.zip`}
        label="ZIP code"
        required
        hint={lookingUp ? 'Looking up…' : 'Try 10001, 94103 or 60601'}
        onValueChange={(zip) => zip.length === 5 && lookupZip(zip)}
      />
      <TextField
        className="sm:col-span-2"
        name={`${props.prefix}.city`}
        label="City"
        required
      />
      <TextField
        className="sm:col-span-2"
        name={`${props.prefix}.state`}
        label="State"
        required
      />
    </div>
  );
}

function BillingActions() {
  const { setFieldValues } = useFormContext();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        onClick={() =>
          // Set several fields in one go
          setFieldValues(
            addressFields.map((field) => ({
              name: `billing.${field}`,
              value: savedAddress[field],
            }))
          )
        }
      >
        Use saved address
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() =>
          setFieldValues(
            addressFields.map((field) => ({
              name: `billing.${field}`,
              value: '',
            }))
          )
        }
      >
        Clear
      </Button>
    </div>
  );
}

function ShippingActions() {
  const { getValue, setFieldValues } = useFormContext();
  const copyFromBilling = () =>
    setFieldValues(
      addressFields.map((field) => ({
        name: `shipping.${field}`,
        value: getValue({ name: `billing.${field}`, type: 'field' })?.value,
      }))
    );
  return (
    <Button size="sm" onClick={copyFromBilling}>
      Copy from billing
    </Button>
  );
}

function AddressForm() {
  const [submitted, setSubmitted] = useState<unknown>();
  const { handleSubmit } = useForm({
    onSubmit: (values) => setSubmitted(values),
  });

  return (
    <Example
      title="Billing and shipping"
      description="Fill fields from code: load a saved address, look up a city from a ZIP code, copy one address into another, or clear one."
      aside={<FormInspector submitted={submitted} />}
    >
      <Card>
        <form onSubmit={handleSubmit} className="space-y-8" noValidate>
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Billing address</h3>
              <BillingActions />
            </div>
            <AddressFields prefix="billing" />
          </section>
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Shipping address</h3>
              <ShippingActions />
            </div>
            <AddressFields prefix="shipping" />
          </section>
          <Button type="submit" variant="primary">
            Continue to payment
          </Button>
        </form>
      </Card>
    </Example>
  );
}

export default withFormProvider(AddressForm);
