import Link from "next/link";
import { db } from "@/lib/db";
import { openPayoutsOverview } from "@/modules/payouts/service";
import { createPayoutDraftAction } from "@/modules/payouts/actions";
import { formatCents } from "@/lib/money";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function AdminPayouts() {
  const [open, payouts] = await Promise.all([openPayoutsOverview(), db.payout.findMany({ orderBy: { createdAt: "desc" }, include: { vendor: { select: { name: true } } }, take: 100 })]);
  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-3xl font-semibold">Auszahlungen</h1><p className="text-ink-2">Jede bezahlte Position ist einem Händler zugeordnet. Hier bündelst du sie zu Auszahlungen und markierst sie nach der Überweisung als bezahlt.</p></div>
      <section className="card">
        <div className="p-4 border-b border-line"><h2 className="font-semibold">Offene Guthaben je Händler</h2></div>
        {open.length === 0 ? <p className="p-4 text-sm text-ink-2">Nichts offen. Alle bezahlten Positionen stecken in Auszahlungen.</p> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Händler</th><th>Positionen</th><th>Brutto</th><th>Provision</th><th>Auszuzahlen</th><th>Bankverbindung</th><th></th></tr></thead>
            <tbody>
              {open.map((o) => (
                <tr key={o.vendor.id}>
                  <td><Link href={`/admin/haendler/${o.vendor.id}`} className="text-accent font-semibold">{o.vendor.name}</Link></td>
                  <td>{o.count}</td><td>{formatCents(o.grossCents)}</td><td className="text-ink-3">{formatCents(o.commissionCents)}</td>
                  <td className="font-semibold">{formatCents(o.openCents)}</td>
                  <td className="text-xs">{o.vendor.payoutIban ? <span className="font-mono">{o.vendor.payoutIban}</span> : <span className="badge badge-warn">fehlt</span>}</td>
                  <td><form action={createPayoutDraftAction}><input type="hidden" name="vendorId" value={o.vendor.id} /><button className="btn btn-primary btn-sm" type="submit">Auszahlung erstellen</button></form></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>
      <section className="card">
        <div className="p-4 border-b border-line"><h2 className="font-semibold">Alle Auszahlungen</h2></div>
        {payouts.length === 0 ? <p className="p-4 text-sm text-ink-2">Noch keine Auszahlung erstellt.</p> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Erstellt</th><th>Händler</th><th>Positionen</th><th>Betrag</th><th>Status</th><th>Referenz</th></tr></thead>
            <tbody>{payouts.map((p) => <tr key={p.id}><td><Link href={`/admin/auszahlungen/${p.id}`} className="text-accent">{p.createdAt.toLocaleDateString("de-DE")}</Link></td><td>{p.vendor.name}</td><td>{p.itemCount}</td><td className="font-semibold">{formatCents(p.totalCents)}</td><td><StatusBadge status={p.status} kind="payout" /></td><td>{p.reference || "–"}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
