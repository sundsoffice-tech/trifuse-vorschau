"use client";

import { useActionState } from "react";
import { updateVendorProfileAction, changePasswordAction } from "@/modules/vendors/actions";
import { imageUrl } from "@/modules/media/url";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

type VendorData = { name: string; description: string; phone: string; addressLine: string; postalCode: string; city: string; payoutHolder: string; payoutIban: string; logoPath: string | null; commissionPercent: number; email: string };

export function VendorSettingsForm({ vendor }: { vendor: VendorData }) {
  const [state, action] = useActionState(updateVendorProfileAction, null);
  const err = state?.fieldErrors ?? {};
  return (
    <form action={action} encType="multipart/form-data" className="space-y-6">
      {state?.ok ? <Alert tone="ok">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="bad">{state.message}</Alert> : null}
      <div className="card p-5 md:p-6 space-y-4">
        <h2 className="font-semibold text-lg">Marke</h2>
        <Field label="Name" name="name" error={err.name}><input id="name" name="name" className="input" defaultValue={vendor.name} required /></Field>
        <Field label="Über die Marke" name="description" hint="Erscheint auf deiner Markenseite und bei jedem Produkt."><textarea id="description" name="description" className="textarea" defaultValue={vendor.description} maxLength={3000} /></Field>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-surface-2 overflow-hidden">
            {vendor.logoPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl(vendor.logoPath)} alt="" className="w-full h-full object-cover" />
            ) : null}
          </div>
          <Field label="Logo (quadratisch, optional)" name="logo"><input id="logo" name="logo" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" /></Field>
        </div>
      </div>
      <div className="card p-5 md:p-6 space-y-4">
        <h2 className="font-semibold text-lg">Kontakt</h2>
        <p className="text-sm text-ink-2">Login-E-Mail: {vendor.email}</p>
        <Field label="Telefon" name="phone"><input id="phone" name="phone" className="input" defaultValue={vendor.phone} /></Field>
        <Field label="Straße und Hausnummer" name="addressLine"><input id="addressLine" name="addressLine" className="input" defaultValue={vendor.addressLine} /></Field>
        <div className="grid grid-cols-[120px_1fr] gap-4">
          <Field label="PLZ" name="postalCode"><input id="postalCode" name="postalCode" className="input" defaultValue={vendor.postalCode} /></Field>
          <Field label="Ort" name="city"><input id="city" name="city" className="input" defaultValue={vendor.city} /></Field>
        </div>
      </div>
      <div className="card p-5 md:p-6 space-y-4">
        <h2 className="font-semibold text-lg">Auszahlung</h2>
        <p className="text-sm text-ink-2">Provision des Marktplatzes: {vendor.commissionPercent} % je verkaufter Position. Dein Anteil wird gesammelt überwiesen.</p>
        <Field label="Kontoinhaber" name="payoutHolder"><input id="payoutHolder" name="payoutHolder" className="input" defaultValue={vendor.payoutHolder} /></Field>
        <Field label="IBAN" name="payoutIban"><input id="payoutIban" name="payoutIban" className="input font-mono" defaultValue={vendor.payoutIban} /></Field>
      </div>
      <SubmitButton pendingText="Speichert …">Speichern</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, null);
  const err = state?.fieldErrors ?? {};
  return (
    <form action={action} className="card p-5 md:p-6 space-y-4">
      <h2 className="font-semibold text-lg">Passwort ändern</h2>
      {state?.ok ? <Alert tone="ok">{state.message}</Alert> : null}
      <Field label="Aktuelles Passwort" name="current" error={err.current}><input id="current" name="current" type="password" autoComplete="current-password" className="input" required /></Field>
      <Field label="Neues Passwort" name="next" error={err.next} hint="Mindestens 10 Zeichen."><input id="next" name="next" type="password" autoComplete="new-password" className="input" required /></Field>
      <SubmitButton className="btn btn-secondary" pendingText="Speichert …">Passwort ändern</SubmitButton>
    </form>
  );
}
