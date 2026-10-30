import Link from "next/link";
import { db } from "@/lib/db";
import { openPayoutsOverview } from "@/modules/payouts/service";
import { createPayoutDraftAction } from "@/modules/payouts/actions";
import { getSetting } from "@/lib/settings";
import { formatCents } from "@/lib/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatIban } from "@/lib/text";
import { isValidIban } from "@/lib/iban";

export default async function AdminPayouts() {
  const [open, payouts, schedule, debtorIban] = await Promise.all([openPayoutsOverview(), db.payout.findMany({ orderBy: { createdAt: "desc" }, include: { vendor: { select: { name: true, payoutIban: true } } }, take: 100 }), getSetting("payout_schedule"), getSetting("payout_debtor_iban")]);
  const sepaReady = payouts.filter((p) => p.status === "DRAFT" && p.totalCents > 0 && isValidIban(p.vendor.payoutIban) && !p.sepaExportedAt);
  const sepaSum = sepaReady.reduce((s, p) => s + p.totalCents, 0);
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const thisFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastTo = new Date(now.getFullYear(), now.getMonth(), 0);
  const monthName = (d: Date) => d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-3xl font-semibold">Auszahlungen</h1><p className="text-ink-2">Jeder bezahlte Verkauf gehört einem Macher. Hier bündelst du sie zu Auszahlungen und hakst sie nach der Überweisung ab. Den Machern ist zugesagt: {schedule}.</p></div>
      <section className="card">
        <div className="p-4 border-b border-line"><h2 className="font-semibold">Offenes Guthaben je Macher</h2></div>
        {open.length === 0 ? <p className="p-4 text-sm text-ink-2">Nichts offen. Alle bezahlten Verkäufe und Rückbuchungen stecken in Auszahlungen.</p> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Macher</th><th>Verkäufe</th><th className="nowrap">Verkaufspreise</th><th className="nowrap">Unser Anteil</th><th className="nowrap">Zu überweisen</th><th>Bankverbindung</th><th></th></tr></thead>
            <tbody>
              {open.map((o) => {
                const hasBank = Boolean(o.vendor.payoutIban);
                return (
                  <tr key={o.vendor.id}>
                    <td><Link href={`/admin/haendler/${o.vendor.id}`} className="text-accent-text font-semibold">{o.vendor.name}</Link></td>
                    <td>{o.count}{o.reversalCount > 0 ? <span className="block text-xs text-bad">{o.reversalCount} {o.reversalCount === 1 ? "Rückbuchung" : "Rückbuchungen"} ({formatCents(o.reversalCents)})</span> : null}</td><td className="nowrap">{formatCents(o.grossCents)}</td><td className="nowrap text-ink-2">{formatCents(o.commissionCents)}</td>
                    <td className={`nowrap font-semibold ${o.openCents < 0 ? "text-bad" : ""}`}>{formatCents(o.openCents)}</td>
                    <td className="text-sm"><span className="num whitespace-nowrap">{hasBank ? formatIban(o.vendor.payoutIban) : null}</span>{!hasBank ? <span className="badge badge-warn">fehlt</span> : null}</td>
                    <td>
                      {o.openCents < 0 ? (
                        <p className="text-xs text-ink-2 max-w-[18rem]">Negativer Saldo. Wird mit den nächsten Verkäufen verrechnet, keine Überweisung.</p>
                      ) : o.openCents === 0 ? (
                        <form action={createPayoutDraftAction}><input type="hidden" name="vendorId" value={o.vendor.id} /><button className="btn btn-secondary btn-sm" type="submit">Verrechnen</button><p className="hint">Verkäufe und Rückbuchungen heben sich auf, kein Geldfluss.</p></form>
                      ) : hasBank ? (
                        <form action={createPayoutDraftAction}><input type="hidden" name="vendorId" value={o.vendor.id} /><button className="btn btn-primary btn-sm" type="submit">Auszahlung erstellen</button></form>
                      ) : (
                        <p className="text-xs text-ink-2 max-w-[18rem]">Erst möglich, wenn die Bankverbindung da ist. <Link href={`/admin/haendler/${o.vendor.id}`} className="underline">Beim Macher eintragen</Link> oder ihn bitten, sie im Macherbereich zu hinterlegen.</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </section>
      <section className="card p-4 space-y-4">
        <div>
          <h2 className="font-semibold">Überweisen per Sammeldatei</h2>
          <p className="text-sm text-ink-2 mt-1">Eine SEPA-Datei für alle Entwürfe mit Bankverbindung, zum Hochladen im Online-Banking. Danach jede Auszahlung hier als überwiesen markieren; der Verwendungszweck ist derselbe.</p>
          {!isValidIban(debtorIban) ? <p className="text-sm text-bad mt-2">Unser Konto fehlt noch: <Link href="/admin/einstellungen" className="underline">unter Einstellungen eintragen</Link>.</p> : sepaReady.length === 0 ? <p className="text-sm text-ink-2 mt-2">Kein neuer Entwurf zum Überweisen. <a href="/api/admin/auszahlungen/sepa?erneut=1" className="underline">Schon exportierte noch einmal in eine Datei</a>.</p> : (
            <a href="/api/admin/auszahlungen/sepa" className="btn btn-primary mt-3">SEPA-Datei für {sepaReady.length} {sepaReady.length === 1 ? "Auszahlung" : "Auszahlungen"} ({formatCents(sepaSum)})</a>
          )}
        </div>
        <div className="border-t border-line pt-4">
          <h2 className="font-semibold">Für die Buchhaltung</h2>
          <p className="text-sm text-ink-2 mt-1">Jede Position mit Provision und Macheranteil, und jede Auszahlung, als CSV für Excel oder das Buchhaltungsprogramm.</p>
          <div className="flex flex-wrap gap-2 mt-3 text-sm">
            <a href={`/api/admin/auszahlungen/export?art=positionen&von=${iso(lastFrom)}&bis=${iso(lastTo)}`} className="btn btn-secondary btn-sm">Positionen {monthName(lastFrom)}</a>
            <a href={`/api/admin/auszahlungen/export?art=positionen&von=${iso(thisFrom)}&bis=${iso(now)}`} className="btn btn-secondary btn-sm">Positionen {monthName(thisFrom)}</a>
            <a href={`/api/admin/auszahlungen/export?art=auszahlungen&von=${iso(lastFrom)}&bis=${iso(lastTo)}`} className="btn btn-secondary btn-sm">Auszahlungen {monthName(lastFrom)}</a>
            <a href={`/api/admin/auszahlungen/export?art=auszahlungen&von=${iso(thisFrom)}&bis=${iso(now)}`} className="btn btn-secondary btn-sm">Auszahlungen {monthName(thisFrom)}</a>
            <a href={`/api/admin/auszahlungen/export?art=positionen&von=2020-01-01&bis=${iso(now)}`} className="btn btn-ghost btn-sm">Alle Positionen</a>
          </div>
        </div>
      </section>
      <section className="card">
        <div className="p-4 border-b border-line"><h2 className="font-semibold">Bisherige Auszahlungen</h2></div>
        {payouts.length === 0 ? <p className="p-4 text-sm text-ink-2">Noch keine Auszahlung erstellt.</p> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Erstellt</th><th>Macher</th><th>Verkäufe</th><th>Betrag</th><th>Stand</th><th>Verwendungszweck</th></tr></thead>
            <tbody>{payouts.map((p) => <tr key={p.id}><td className="nowrap"><Link href={`/admin/auszahlungen/${p.id}`} className="text-accent-text font-semibold">{p.createdAt.toLocaleDateString("de-DE")}</Link></td><td>{p.vendor.name}</td><td>{p.itemCount}</td><td className="font-semibold nowrap">{formatCents(p.totalCents)}</td><td>{p.status === "PAID" && p.totalCents === 0 ? <span className="badge badge-muted">Verrechnet</span> : <StatusBadge status={p.status} kind="payout" />}</td><td>{p.reference || "–"}{p.sepaExportedAt ? <span className="block text-xs text-ink-2">in SEPA-Datei vom {p.sepaExportedAt.toLocaleDateString("de-DE")}</span> : null}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
