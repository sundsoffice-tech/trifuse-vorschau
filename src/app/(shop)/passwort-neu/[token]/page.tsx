import type { Metadata } from "next";
import Link from "next/link";
import { findValidReset } from "@/modules/auth/reset";
import { SetPasswordForm } from "@/components/forms/password-forms";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Neues Passwort" };

export default async function NewPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const reset = await findValidReset(token);
  return (
    <div className="container-x py-12 max-w-md">
      <h1 className="font-display text-3xl font-semibold">Neues Passwort</h1>
      {reset ? (
        <>
          <p className="text-ink-2 mt-1">Für den Zugang {reset.user.email}.</p>
          <div className="card p-6 mt-6"><SetPasswordForm token={token} /></div>
        </>
      ) : (
        <div className="mt-6 space-y-4">
          <Alert tone="warn">Dieser Link ist abgelaufen oder schon benutzt.</Alert>
          <Link href="/passwort-vergessen" className="btn btn-primary">Neuen Link anfordern</Link>
        </div>
      )}
    </div>
  );
}
