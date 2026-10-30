"use client";

import { useActionState } from "react";
import { saveSettingsAction } from "@/modules/settings-actions";
import { centsToEuroInput } from "@/lib/money";
import { formatIban } from "@/lib/text";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

export function SettingsForm({ settings }: { settings: { commissionPercent: number; shippingFlatCents: number; freeShippingFromCents: number; payoutSchedule: string; payoutDebtorName: string; payoutDebtorIban: string; payoutDebtorBic: string } }) {
  const [state, action] = useActionState(saveSettingsAction, null);
  const err = state?.fieldErrors ?? {};
  return (
    <form action={action} className="card p-5 md:p-6 space-y-4" noValidate>
      {state?.ok ? <Alert tone="ok">{state.message}</Alert> : null}
      <Field label="Unser Anteil für neue Macher in %" name="commissionPercent" error={err.commissionPercent} hint="Bestehende Macher behalten ihren Satz; er steht bei jedem Macher einzeln."><input id="commissionPercent" name="commissionPercent" inputMode="decimal" className="input num" defaultValue={String(settings.commissionPercent)} /></Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Versandpauschale in Euro" name="shippingFlat" error={err.shippingFlat}><input id="shippingFlat" name="shippingFlat" inputMode="decimal" className="input num" defaultValue={centsToEuroInput(settings.shippingFlatCents)} /></Field>
        <Field label="Versandkostenfrei ab Euro" name="freeShippingFrom" error={err.freeShippingFrom}><input id="freeShippingFrom" name="freeShippingFrom" inputMode="decimal" className="input num" defaultValue={centsToEuroInput(settings.freeShippingFromCents)} /></Field>
      </div>
      <Field label="Auszahlungstermin, so steht er bei den Machern" name="payoutSchedule" error={err.payoutSchedule} hint="Zum Beispiel „jeweils zum 15. des Folgemonats“."><input id="payoutSchedule" name="payoutSchedule" className="input" defaultValue={settings.payoutSchedule} maxLength={120} /></Field>
      <fieldset className="border-t border-line pt-4 space-y-4">
        <legend className="font-semibold">Unser Konto für die Auszahlungen</legend>
        <p className="text-sm text-ink-2">Steht als Auftraggeber in der SEPA-Sammeldatei, die du unter Auszahlungen herunterlädst und im Online-Banking hochlädst.</p>
        <Field label="Kontoinhaber" name="payoutDebtorName" error={err.payoutDebtorName}><input id="payoutDebtorName" name="payoutDebtorName" className="input" defaultValue={settings.payoutDebtorName} maxLength={70} /></Field>
        <div className="grid sm:grid-cols-[2fr_1fr] gap-4">
          <Field label="IBAN" name="payoutDebtorIban" error={err.payoutDebtorIban}><input id="payoutDebtorIban" name="payoutDebtorIban" className="input num" defaultValue={formatIban(settings.payoutDebtorIban)} /></Field>
          <Field label="BIC (optional)" name="payoutDebtorBic" error={err.payoutDebtorBic}><input id="payoutDebtorBic" name="payoutDebtorBic" className="input num" defaultValue={settings.payoutDebtorBic} maxLength={11} /></Field>
        </div>
      </fieldset>
      <SubmitButton pendingText="Speichert …">Speichern</SubmitButton>
    </form>
  );
}
