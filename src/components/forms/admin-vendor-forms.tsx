"use client";

import { useActionState } from "react";
import type { Vendor } from "@prisma/client";
import { adminCreateVendorAction, adminUpdateVendorAction, adminResetVendorPasswordAction, adminCreateAccessAction } from "@/modules/vendors/admin-actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

export function AdminVendorCreateForm() {
  const [state, action] = useActionState(adminCreateVendorAction, null);
  const err = state?.fieldErrors ?? {};
  return (
    <form action={action} className="card p-5 md:p-6 space-y-4" noValidate>
      {state?.ok ? <Alert tone="ok"><span className="break-all">{state.message}</span></Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="bad">{state.message}</Alert> : null}
      <Field label="Name der Marke oder Werkstatt" name="name" error={err.name}><input id="name" name="name" className="input" required /></Field>
      <Field label="Name der Person" name="contactName"><input id="contactName" name="contactName" className="input" /></Field>
      <Field label="E-Mail für die Anmeldung" name="email" error={err.email}><input id="email" name="email" type="email" className="input" required /></Field>
      <Field label="Ort" name="city"><input id="city" name="city" className="input" /></Field>
      <Field label="Telefon" name="phone"><input id="phone" name="phone" className="input" /></Field>
      <Field label="Kurzbeschreibung" name="description"><textarea id="description" name="description" className="textarea" /></Field>
      <SubmitButton pendingText="Legt an …">Macher anlegen</SubmitButton>
    </form>
  );
}

export function AdminVendorEditForm({ vendor }: { vendor: Vendor }) {
  const [state, action] = useActionState(adminUpdateVendorAction, null);
  const err = state?.fieldErrors ?? {};
  return (
    <form action={action} className="card p-5 md:p-6 space-y-4" noValidate>
      <input type="hidden" name="vendorId" value={vendor.id} />
      <h2 className="font-semibold text-lg">Stand und Konditionen</h2>
      {state?.ok ? <Alert tone="ok">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="bad">{state.message}</Alert> : null}
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Stand" name="status">
          <select id="status" name="status" className="select" defaultValue={vendor.status}>
            <option value="PENDING">Bewerbung offen</option><option value="ACTIVE">Aktiv</option><option value="PAUSED">Pausiert</option>
          </select>
        </Field>
        <Field label="Unser Anteil in %" name="commissionPercent" error={err.commissionPercent}><input id="commissionPercent" name="commissionPercent" inputMode="decimal" className="input num" defaultValue={String(vendor.commissionPercent)} /></Field>
        <div><span className="label">Freigabe</span><label className="flex items-center gap-2 min-h-[44px] text-sm"><input type="checkbox" name="autoApprove" value="1" defaultChecked={vendor.autoApprove} className="w-5 h-5" /> darf selbst in den Shop stellen</label></div>
      </div>
      <Field label="Name" name="name" error={err.name}><input id="name" name="name" className="input" defaultValue={vendor.name} /></Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Ort" name="city"><input id="city" name="city" className="input" defaultValue={vendor.city} /></Field>
        <Field label="Website oder Instagram" name="website"><input id="website" name="website" className="input" defaultValue={vendor.website} /></Field>
      </div>
      <Field label="Beschreibung" name="description"><textarea id="description" name="description" className="textarea" defaultValue={vendor.description} /></Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Kontakt-E-Mail" name="email"><input id="email" name="email" type="email" className="input" defaultValue={vendor.email} /></Field>
        <Field label="Telefon" name="phone"><input id="phone" name="phone" className="input" defaultValue={vendor.phone} /></Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Kontoinhaber" name="payoutHolder"><input id="payoutHolder" name="payoutHolder" className="input" defaultValue={vendor.payoutHolder} /></Field>
        <Field label="IBAN" name="payoutIban"><input id="payoutIban" name="payoutIban" className="input num" defaultValue={vendor.payoutIban} /></Field>
      </div>
      <Field label="Interne Notiz zur Auszahlung" name="payoutNote" hint="Sieht nur das Team."><textarea id="payoutNote" name="payoutNote" className="textarea !min-h-[70px]" defaultValue={vendor.payoutNote} /></Field>
      <SubmitButton pendingText="Speichert …">Speichern</SubmitButton>
    </form>
  );
}

export function AdminCreateAccessForm({ vendorId, email }: { vendorId: string; email: string }) {
  const [state, action] = useActionState(adminCreateAccessAction, null);
  return (
    <form action={action} className="space-y-2 text-sm">
      <input type="hidden" name="vendorId" value={vendorId} />
      <p>Noch kein Zugang. Beim Anlegen entsteht ein Startpasswort für {email}, das du dem Macher mit der Zusage schickst.</p>
      <SubmitButton className="btn btn-primary btn-sm" pendingText="…">Zugang anlegen</SubmitButton>
      {state?.message ? <p className={`break-all ${state.ok ? "text-ok" : "text-bad"}`}>{state.message}</p> : null}
    </form>
  );
}

export function AdminResetPasswordForm({ user }: { user: { id: string; email: string; name: string } }) {
  const [state, action] = useActionState(adminResetVendorPasswordAction, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3 text-sm">
      <input type="hidden" name="userId" value={user.id} />
      <span className="flex-1 min-w-[200px]">{user.name} <span className="text-ink-2">{user.email}</span></span>
      <SubmitButton className="btn btn-secondary btn-sm" pendingText="…">Neues Passwort erzeugen</SubmitButton>
      {state?.message ? <p className={`w-full break-all ${state.ok ? "text-ok" : "text-bad"}`}>{state.message}</p> : null}
    </form>
  );
}
