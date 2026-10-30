import { getAllSettings } from "@/lib/settings";
import { paymentsMode } from "@/modules/payments";
import { SettingsForm } from "@/components/forms/settings-form";
import { Alert } from "@/components/ui/alert";
import { db } from "@/lib/db";
import { requireAdmin } from "@/modules/auth/session";
import { adminRemoveAction } from "@/modules/auth/admin-users-actions";
import { AdminInviteForm } from "@/components/forms/admin-team-form";

export default async function AdminSettings() {
  const [s, me, admins] = await Promise.all([getAllSettings(), requireAdmin(), db.user.findMany({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" }, select: { id: true, email: true, name: true, createdAt: true } })]);
  const mode = paymentsMode();
  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="font-display text-3xl font-semibold">Einstellungen</h1></div>
      <Alert tone={mode === "stripe" ? "ok" : "warn"}>{mode === "stripe" ? "Echte Zahlungen über Stripe sind eingeschaltet." : "Echte Zahlungen sind noch aus. Kunden sehen eine Testkasse ohne Geldfluss. Zum Einschalten bitte an die Technik wenden (Stripe-Zugang hinterlegen)."}</Alert>
      <SettingsForm settings={s} />
      <section className="card p-5 md:p-6 space-y-4">
        <div><h2 className="font-semibold text-lg">Team</h2><p className="text-sm text-ink-2">Wer die Verwaltung bedienen darf. Jeder hier sieht alles: Bestellungen, Bankverbindungen, Auszahlungen.</p></div>
        <ul className="divide-y divide-line text-sm">
          {admins.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="font-semibold">{a.name}</span><span className="text-ink-2 break-all">{a.email}</span>
              {a.id === me.id ? <span className="badge badge-muted">du</span> : admins.length > 1 ? <form action={adminRemoveAction} className="ml-auto"><input type="hidden" name="userId" value={a.id} /><button className="btn btn-ghost btn-sm text-bad" type="submit">Zugang entfernen</button></form> : null}
            </li>
          ))}
        </ul>
        <AdminInviteForm />
      </section>
    </div>
  );
}
