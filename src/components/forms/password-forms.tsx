"use client";

import { useActionState } from "react";
import { requestPasswordResetAction, setNewPasswordAction } from "@/modules/auth/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

export function RequestResetForm() {
  const [state, action] = useActionState(requestPasswordResetAction, null);
  if (state?.ok) return <Alert tone="ok">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-4">
      {state && !state.ok ? <Alert tone="bad">{state.message}</Alert> : null}
      <Field label="E-Mail deines Zugangs" name="email"><input id="email" name="email" type="email" autoComplete="username" required className="input" /></Field>
      <SubmitButton className="btn btn-primary w-full" pendingText="Einen Moment …">Link schicken</SubmitButton>
    </form>
  );
}

export function SetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(setNewPasswordAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state && !state.ok ? <Alert tone="bad">{state.message}</Alert> : null}
      <Field label="Neues Passwort" name="password" hint="Mindestens 10 Zeichen." error={state?.fieldErrors?.password}><input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} className="input" /></Field>
      <Field label="Noch einmal" name="confirm" error={state?.fieldErrors?.confirm}><input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} className="input" /></Field>
      <SubmitButton className="btn btn-primary w-full" pendingText="Wird gespeichert …">Passwort festlegen und anmelden</SubmitButton>
    </form>
  );
}
