"use client";

import { useActionState } from "react";
import { updateVendorProfileAction, changePasswordAction } from "@/modules/vendors/actions";
import { imageUrl } from "@/modules/media/url";
import { BRAND } from "@/lib/brand";
import { formatIban } from "@/lib/text";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { ImagePicker } from "./image-picker";

type VendorData = { name: string; description: string; phone: string; addressLine: string; postalCode: string; city: string; website: string; payoutHolder: string; payoutIban: string; logoPath: string | null; commissionPercent: number; email: string };

export function VendorSettingsForm({ vendor }: { vendor: VendorData }) {
  const [state, action] = useActionState(updateVendorProfileAction, null);
  const err = state?.fieldErrors ?? {};
  return (
    <form action={action} encType="multipart/form-data" className="space-y-6">
      {state?.ok ? <Alert tone="ok">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="bad">{state.message}</Alert> : null}
      <div className="card p-5 md:p-6 space-y-4">
        <h2 className="font-semibold text-lg">So erscheinst du im Shop</h2>
        <Field label="Name deiner Marke oder Werkstatt" name="name" error={err.name}><input id="name" name="name" className="input" defaultValue={vendor.name} required /></Field>
        <Field label="Woher kommst du?" name="city" hint="Steht bei jedem Produkt hinter „aus“, zum Beispiel „Viersen“ oder „Wegberg“."><input id="city" name="city" className="input" defaultValue={vendor.city} /></Field>
        <Field label="Über dich und deine Arbeit" name="description" hint="Erscheint auf deiner Seite und bei jedem Produkt. Wer bist du, wo arbeitest du, wie entsteht es?"><textarea id="description" name="description" className="textarea" defaultValue={vendor.description} maxLength={3000} /></Field>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-md border border-line bg-surface-2 overflow-hidden shrink-0 img-surface">
            {vendor.logoPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl(vendor.logoPath)} alt="" className="w-full h-full object-cover" />
            ) : null}
          </div>
          <div><span className="label">Foto von dir oder deiner Werkstatt (quadratisch)</span><ImagePicker name="logo" multiple={false} label="Foto auswählen" /></div>
        </div>
        <Field label="Website oder Instagram (optional)" name="website"><input id="website" name="website" type="url" className="input" defaultValue={vendor.website} placeholder="https://" /></Field>
      </div>
      <div className="card p-5 md:p-6 space-y-4">
        <h2 className="font-semibold text-lg">So erreichen wir dich</h2>
        <p className="text-sm text-ink-2">Deine Anmelde-Adresse: <strong>{vendor.email}</strong>. Zum Ändern schreib uns an <a href={`mailto:${BRAND.supportEmail}`} className="underline">{BRAND.supportEmail}</a>.</p>
        <Field label="Telefon" name="phone"><input id="phone" name="phone" type="tel" className="input" defaultValue={vendor.phone} /></Field>
        <Field label="Straße und Hausnummer" name="addressLine"><input id="addressLine" name="addressLine" className="input" defaultValue={vendor.addressLine} /></Field>
        <Field label="PLZ" name="postalCode"><input id="postalCode" name="postalCode" className="input max-w-[160px]" defaultValue={vendor.postalCode} /></Field>
      </div>
      <div className="card p-5 md:p-6 space-y-4" id="bank">
        <h2 className="font-semibold text-lg">Wohin das Geld geht</h2>
        <p className="text-sm text-ink-2 num">{Math.round(100 - vendor.commissionPercent)} % jedes Verkaufs kommen zu dir, gesammelt überwiesen. Ohne Bankverbindung können wir nicht überweisen.</p>
        <Field label="Kontoinhaber" name="payoutHolder"><input id="payoutHolder" name="payoutHolder" className="input" defaultValue={vendor.payoutHolder} /></Field>
        <Field label="IBAN" name="payoutIban" error={err.payoutIban} hint="Leerzeichen sind erlaubt."><input id="payoutIban" name="payoutIban" className="input num" defaultValue={formatIban(vendor.payoutIban)} placeholder="DE00 0000 0000 0000 0000 00" /></Field>
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
