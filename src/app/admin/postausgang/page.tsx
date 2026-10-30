import Link from "next/link";
import { db } from "@/lib/db";
import { mailMode } from "@/modules/mail/transport";
import { adminRequeueMailAction, adminDeliverMailsAction } from "@/modules/mail/actions";
import { Alert } from "@/components/ui/alert";
import type { MailStatus } from "@prisma/client";

const tabs: { value: MailStatus | "ALL"; label: string }[] = [{ value: "ALL", label: "Alle" }, { value: "QUEUED", label: "Wartet" }, { value: "SENT", label: "Gesendet" }, { value: "FAILED", label: "Fehlgeschlagen" }];
const statusText: Record<MailStatus, { text: string; cls: string }> = {
  QUEUED: { text: "Wartet", cls: "badge-warn" },
  SENDING: { text: "Wird gesendet", cls: "badge-warn" },
  SENT: { text: "Gesendet", cls: "badge-ok" },
  FAILED: { text: "Fehlgeschlagen", cls: "badge-bad" },
};
const templateText: Record<string, string> = {
  "order-confirmation": "Bestellbestätigung",
  "vendor-sale": "Verkaufsmeldung",
  "application-received": "Bewerbung eingegangen",
  "application-team": "Bewerbung ans Team",
  "vendor-welcome": "Willkommen",
  "password-reset": "Passwort vergessen",
  "product-approved": "Produkt freigegeben",
  "product-rejected": "Produkt abgelehnt",
  "payout-paid": "Auszahlung überwiesen",
  "refund-confirmation": "Erstattung",
  "admin-invite": "Team-Zugang",
};

export default async function AdminOutbox({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = (tabs.find((t) => t.value === sp.status)?.value ?? "ALL") as MailStatus | "ALL";
  const [mails, counts] = await Promise.all([
    db.mailOutbox.findMany({ where: status === "ALL" ? {} : { status }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.mailOutbox.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const count = (s: MailStatus) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const mode = mailMode();
  return (
    <div className="space-y-6 min-w-0">
      <div><h1 className="font-display text-3xl font-semibold">Postausgang</h1><p className="text-ink-2">Jede Mail wird erst gespeichert, dann zugestellt. Hier siehst du, was raus ist und was hängt.</p></div>
      {mode === "off" ? <Alert tone="warn">Der Versand ist aus (MAIL_MODE=off oder SMTP_HOST fehlt). Mails sammeln sich hier, bis der Versand eingerichtet ist.</Alert> : null}
      {mode === "file" ? <Alert tone="info">Entwicklungsmodus: Mails werden nicht verschickt, sondern als Dateien unter data/mails abgelegt.</Alert> : null}
      {count("FAILED") > 0 ? <Alert tone="bad">{count("FAILED")} {count("FAILED") === 1 ? "Mail ist" : "Mails sind"} nach fünf Versuchen liegen geblieben. Fehler steht an der Mail; „Erneut senden“ versucht es noch einmal.</Alert> : null}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => <Link key={t.value} href={`/admin/postausgang?status=${t.value}`} className="chip !min-h-[40px]" aria-current={status === t.value ? "true" : undefined}>{t.label}{t.value !== "ALL" ? ` (${count(t.value)})` : ""}</Link>)}
        {count("QUEUED") > 0 && mode !== "off" ? <form action={adminDeliverMailsAction} className="ml-auto"><button className="btn btn-secondary btn-sm" type="submit">Wartende jetzt senden</button></form> : null}
      </div>
      {mails.length === 0 ? <p className="text-sm text-ink-2">Keine Mails in dieser Ansicht.</p> : (
        <div className="card table-wrap"><table className="table">
          <thead><tr><th>Erstellt</th><th>An</th><th>Betreff</th><th>Art</th><th>Stand</th><th></th></tr></thead>
          <tbody>
            {mails.map((m) => (
              <tr key={m.id}>
                <td className="nowrap">{m.createdAt.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="break-all">{m.to}</td>
                <td>
                  <details><summary className="details-summary !min-h-0 text-left">{m.subject}</summary><pre className="mt-2 text-xs whitespace-pre-wrap font-sans text-ink-2 max-w-prose">{m.text}</pre></details>
                </td>
                <td className="nowrap">{templateText[m.template] ?? m.template}</td>
                <td><span className={`badge ${statusText[m.status].cls}`}>{statusText[m.status].text}</span>{m.lastError ? <span className="block text-xs text-bad mt-1 max-w-[18rem]">{m.lastError}</span> : null}{m.sentAt ? <span className="block text-xs text-ink-2 num">{m.sentAt.toLocaleTimeString("de-DE", { timeStyle: "short" })}</span> : null}</td>
                <td>{m.status === "FAILED" ? <form action={adminRequeueMailAction}><input type="hidden" name="mailId" value={m.id} /><button className="btn btn-secondary btn-sm" type="submit">Erneut senden</button></form> : null}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
