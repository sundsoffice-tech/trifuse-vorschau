"use client";

import { useActionState } from "react";
import { adminInviteAction } from "@/modules/auth/admin-users-actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

export function AdminInviteForm() {
  const [state, action] = useActionState(adminInviteAction, null);
  const err = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3" noValidate>
      {state?.ok ? <Alert tone="ok">{state.message}</Alert> : null}
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Name" name="name" error={err.name}><input id="name" name="name" className="input" /></Field>
        <Field label="E-Mail" name="email" error={err.email}><input id="email" name="email" type="email" className="input" /></Field>
      </div>
      <SubmitButton className="btn btn-secondary" pendingText="Legt an …">Zugang anlegen und Mail schicken</SubmitButton>
    </form>
  );
}
