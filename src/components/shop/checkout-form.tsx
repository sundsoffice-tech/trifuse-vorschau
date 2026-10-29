"use client";

import { useActionState } from "react";
import Link from "next/link";
import { checkoutAction } from "@/modules/orders/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

export function CheckoutForm({ testMode }: { testMode: boolean }) {
  const [state, action] = useActionState(checkoutAction, null);
  const err = state?.fieldErrors ?? {};
  return (
    <form action={action} className="card p-5 md:p-7 space-y-6" noValidate>
      {state && !state.ok && state.message ? <Alert tone="bad">{state.message}</Alert> : null}
      <section className="space-y-4">
        <h2 className="font-semibold text-lg">Kontakt</h2>
        <Field label="E-Mail-Adresse" name="email" error={err.email} hint="Dorthin schicken wir die Bestellbestätigung und die Versandnachricht.">
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </Field>
      </section>
      <section className="space-y-4">
        <h2 className="font-semibold text-lg">Lieferadresse</h2>
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
        <Field label="Grußkarte (optional)" name="note" hint="Liegt dem Paket bei. Keine Rechnung im Paket.">
          <textarea id="note" name="note" className="textarea !min-h-[80px]" maxLength={500} />
        </Field>
        <Field label="Hinweis an uns (optional)" name="deliveryNote" hint="Zum Beispiel: beim Nachbarn abgeben. Kommt nicht auf die Karte.">
          <input id="deliveryNote" name="deliveryNote" className="input" maxLength={300} />
        </Field>
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold text-lg">Bezahlen</h2>
        <p className="text-sm text-ink-2">{testMode ? "Testbetrieb: Die Zahlung wird nur simuliert, es fließt kein Geld." : "Nach dem Klick bezahlst du sicher bei unserem Zahlungsdienst Stripe, mit Karte und den dort angebotenen Zahlarten. Danach kommst du hierher zurück."}</p>
        <SubmitButton className="btn btn-primary w-full md:w-auto" pendingText="Bestellung wird angelegt …">Zahlungspflichtig bestellen</SubmitButton>
        <p className="text-xs text-ink-2">Mit der Bestellung akzeptierst du unsere <Link href="/agb" className="underline" target="_blank">AGB</Link> und hast die <Link href="/widerruf" className="underline" target="_blank">Widerrufsbelehrung</Link> gelesen.</p>
      </section>
    </form>
  );
}
