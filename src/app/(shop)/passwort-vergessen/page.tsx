import type { Metadata } from "next";
import Link from "next/link";
import { RequestResetForm } from "@/components/forms/password-forms";

export const metadata: Metadata = { title: "Passwort vergessen" };

export default function ForgotPasswordPage() {
  return (
    <div className="container-x py-12 max-w-md">
      <h1 className="font-display text-3xl font-semibold">Passwort vergessen</h1>
      <p className="text-ink-2 mt-1">Wir schicken dir einen Link, mit dem du ein neues festlegst.</p>
      <div className="card p-6 mt-6"><RequestResetForm /></div>
      <p className="text-sm text-ink-2 mt-4"><Link href="/login" className="text-accent-text font-semibold underline">Zurück zur Anmeldung</Link></p>
    </div>
  );
}
