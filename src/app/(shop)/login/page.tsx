import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth/session";
import { LoginForm } from "@/components/forms/login-form";

export const metadata: Metadata = { title: "Anmelden" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ weiter?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/portal");
  const { weiter } = await searchParams;
  return (
    <div className="container-x py-12 max-w-md">
      <h1 className="font-display text-3xl font-semibold">Anmelden</h1>
      <p className="text-ink-2 mt-1">Für Macher und das Team von trifuse.store. Zum Einkaufen brauchst du kein Konto.</p>
      <div className="card p-6 mt-6"><LoginForm weiter={weiter ?? ""} /></div>
      <p className="text-sm text-ink-2 mt-4">Du machst selbst etwas und willst es hier verkaufen? <Link href="/verkaufen" className="text-accent-text font-semibold underline">Jetzt bewerben</Link></p>
    </div>
  );
}
