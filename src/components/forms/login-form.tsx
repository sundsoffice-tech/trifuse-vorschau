"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/modules/auth/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

export function LoginForm({ weiter }: { weiter: string }) {
  const [state, action] = useActionState(loginAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="weiter" value={weiter} />
      {state && !state.ok ? <Alert tone="bad">{state.message}</Alert> : null}
      <Field label="E-Mail" name="email"><input id="email" name="email" type="email" autoComplete="username" required className="input" /></Field>
      <Field label="Passwort" name="password"><input id="password" name="password" type="password" autoComplete="current-password" required className="input" /></Field>
      <SubmitButton className="btn btn-primary w-full" pendingText="Anmeldung läuft …">Anmelden</SubmitButton>
      <p className="text-sm text-center"><Link href="/passwort-vergessen" className="link-44 inline-flex items-center text-ink-2 underline">Passwort vergessen?</Link></p>
    </form>
  );
}
