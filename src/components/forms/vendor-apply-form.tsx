"use client";

import { useActionState } from "react";
import { applyAsVendorAction } from "@/modules/vendors/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

export function VendorApplyForm() {
  const [state, action] = useActionState(applyAsVendorAction, null);
  const err = state?.fieldErrors ?? {};
  if (state?.ok) return <Alert tone="ok">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-4" noValidate>
      {state && !state.ok && state.message ? <Alert tone="bad">{state.message}</Alert> : null}
      <Field label="Name der Marke oder Firma" name="name" error={err.name}><input id="name" name="name" required className="input" /></Field>
      <Field label="Ansprechpartner" name="contactName" error={err.contactName}><input id="contactName" name="contactName" required className="input" /></Field>
      <Field label="E-Mail" name="email" error={err.email}><input id="email" name="email" type="email" required className="input" /></Field>
      <Field label="Telefon (optional)" name="phone"><input id="phone" name="phone" type="tel" className="input" /></Field>
      <Field label="Was stellst du her?" name="description" error={err.description}><textarea id="description" name="description" className="textarea" maxLength={1500} /></Field>
      <Field label="Passwort für deinen Zugang" name="password" error={err.password} hint="Mindestens 10 Zeichen."><input id="password" name="password" type="password" autoComplete="new-password" required className="input" /></Field>
      <SubmitButton className="btn btn-primary w-full" pendingText="Wird gesendet …">Bewerbung absenden</SubmitButton>
    </form>
  );
}
