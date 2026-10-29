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
      <Field label="Name deiner Marke oder Werkstatt" name="name" error={err.name}><input id="name" name="name" required className="input" /></Field>
      <Field label="Dein Name" name="contactName" error={err.contactName}><input id="contactName" name="contactName" required className="input" /></Field>
      <Field label="E-Mail" name="email" error={err.email}><input id="email" name="email" type="email" required className="input" /></Field>
      <Field label="Ort" name="city" error={err.city} hint="Steht später bei deinen Produkten, zum Beispiel „aus Viersen“."><input id="city" name="city" className="input" /></Field>
      <Field label="Wo können wir deine Arbeit sehen? (optional)" name="website" hint="Website, Instagram oder ein anderer Link."><input id="website" name="website" type="url" className="input" placeholder="https://" /></Field>
      <Field label="Was machst du?" name="description" error={err.description}><textarea id="description" name="description" className="textarea" maxLength={1500} /></Field>
      <SubmitButton className="btn btn-primary w-full" pendingText="Wird gesendet …">Bewerbung absenden</SubmitButton>
    </form>
  );
}
