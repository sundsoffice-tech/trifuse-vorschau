import Link from "next/link";
import { db } from "@/lib/db";
import { openPayoutsOverview } from "@/modules/payouts/service";
import { createPayoutDraftAction } from "@/modules/payouts/actions";
import { getSetting } from "@/lib/settings";
import { formatCents } from "@/lib/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatIban } from "@/lib/text";

export default async function AdminPayouts() {
  const [open, payouts, schedule] = await Promise.all([openPayoutsOverview(), db.payout.findMany({ orderBy: { createdAt: "desc" }, include: { vendor: { select: { name: true } } }, take: 100 }), getSetting("payout_schedule")]);
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
      <section className="card">
        <div className="p-4 border-b border-line"><h2 className="font-semibold">Bisherige Auszahlungen</h2></div>
        {payouts.length === 0 ? <p className="p-4 text-sm text-ink-2">Noch keine Auszahlung erstellt.</p> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Erstellt</th><th>Macher</th><th>Verkäufe</th><th>Betrag</th><th>Stand</th><th>Verwendungszweck</th></tr></thead>
            <tbody>{payouts.map((p) => <tr key={p.id}><td className="nowrap"><Link href={`/admin/auszahlungen/${p.id}`} className="text-accent-text font-semibold">{p.createdAt.toLocaleDateString("de-DE")}</Link></td><td>{p.vendor.name}</td><td>{p.itemCount}</td><td className="font-semibold nowrap">{formatCents(p.totalCents)}</td><td>{p.status === "PAID" && p.totalCents === 0 ? <span className="badge badge-muted">Verrechnet</span> : <StatusBadge status={p.status} kind="payout" />}</td><td>{p.reference || "–"}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
