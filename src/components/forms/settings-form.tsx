"use client";

import { useActionState } from "react";
import { saveSettingsAction } from "@/modules/settings-actions";
import { centsToEuroInput } from "@/lib/money";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

export function SettingsForm({ settings }: { settings: { commissionPercent: number; shippingFlatCents: number; freeShippingFromCents: number } }) {
  const [state, action] = useActionState(saveSettingsAction, null);
  const err = state?.fieldErrors ?? {};
  return (
    <form action={action} className="card p-5 md:p-6 space-y-4" noValidate>
      {state?.ok ? <Alert tone="ok">{state.message}</Alert> : null}
      <Field label="Standard-Provision für neue Händler in %" name="commissionPercent" error={err.commissionPercent}><input id="commissionPercent" name="commissionPercent" inputMode="decimal" className="input" defaultValue={String(settings.commissionPercent)} /></Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Versandpauschale in Euro" name="shippingFlat" error={err.shippingFlat}><input id="shippingFlat" name="shippingFlat" inputMode="decimal" className="input" defaultValue={centsToEuroInput(settings.shippingFlatCents)} /></Field>
        <Field label="Versandkostenfrei ab Euro" name="freeShippingFrom" error={err.freeShippingFrom}><input id="freeShippingFrom" name="freeShippingFrom" inputMode="decimal" className="input" defaultValue={centsToEuroInput(settings.freeShippingFromCents)} /></Field>
      </div>
      <SubmitButton pendingText="Speichert …">Speichern</SubmitButton>
    </form>
  );
}
