"use client";

import { useActionState } from "react";
import Link from "next/link";
import { checkoutAction } from "@/modules/orders/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

export function CheckoutForm() {
  const [state, action] = useActionState(checkoutAction, null);
  const err = state?.fieldErrors ?? {};
  return (
    <form action={action} className="card p-5 md:p-7 space-y-5" noValidate>
      <h2 className="font-semibold text-lg">Lieferadresse</h2>
      {state && !state.ok && state.message ? <Alert tone="bad">{state.message}</Alert> : null}
      <Field label="E-Mail-Adresse" name="email" error={err.email} hint="Dorthin schicken wir die Bestellbestätigung.">
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </Field>
      <Field label="Vor- und Nachname" name="name" error={err.name}>
        <input id="name" name="name" autoComplete="name" required className="input" />
      </Field>
      <Field label="Straße und Hausnummer" name="addressLine" error={err.addressLine}>
        <input id="addressLine" name="addressLine" autoComplete="street-address" required className="input" />
      </Field>
      <div className="grid grid-cols-[120px_1fr] gap-4">
        <Field label="PLZ" name="postalCode" error={err.postalCode}>
          <input id="postalCode" name="postalCode" inputMode="numeric" autoComplete="postal-code" required className="input" />
        </Field>
        <Field label="Ort" name="city" error={err.city}>
          <input id="city" name="city" autoComplete="address-level2" required className="input" />
        </Field>
      </div>
      <Field label="Anmerkung zur Bestellung (optional)" name="note">
        <textarea id="note" name="note" className="textarea !min-h-[80px]" maxLength={500} />
      </Field>
      <div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="agb" value="1" className="mt-1 w-5 h-5" />
          <span>Ich habe die <Link href="/agb" className="underline" target="_blank">AGB</Link> und die <Link href="/widerruf" className="underline" target="_blank">Widerrufsbelehrung</Link> gelesen und akzeptiere sie.</span>
        </label>
        {err.agb ? <p className="error">{err.agb}</p> : null}
      </div>
      <SubmitButton className="btn btn-primary w-full md:w-auto" pendingText="Bestellung wird angelegt …">Kostenpflichtig bestellen und bezahlen</SubmitButton>
    </form>
  );
}
