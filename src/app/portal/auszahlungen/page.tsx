import { requireVendorUser } from "@/modules/auth/session";
import { vendorPayoutSummary } from "@/modules/payouts/service";
import { formatCents } from "@/lib/money";
import { Stat } from "@/components/ui/stat";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function PortalPayouts() {
  const user = await requireVendorUser();
  const s = await vendorPayoutSummary(user.vendorId);
  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-3xl font-semibold">Auszahlungen</h1><p className="text-ink-2">Dein Anteil aus bezahlten Verkäufen, gesammelt ausgezahlt.</p></div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Stat label="Offen" value={formatCents(s.openCents)} hint={`${s.open.length} Positionen noch nicht in einer Auszahlung`} />
        <Stat label="Bereits ausgezahlt" value={formatCents(s.paidCents)} />
      </div>
      <section className="card">
        <div className="p-4 border-b border-line"><h2 className="font-semibold">Auszahlungen</h2></div>
        {s.payouts.length === 0 ? <p className="p-4 text-sm text-ink-2">Noch keine Auszahlung erstellt.</p> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Erstellt</th><th>Positionen</th><th>Betrag</th><th>Status</th><th>Referenz</th><th>Ausgezahlt am</th></tr></thead>
            <tbody>{s.payouts.map((p) => <tr key={p.id}><td>{p.createdAt.toLocaleDateString("de-DE")}</td><td>{p._count.items}</td><td className="font-semibold">{formatCents(p.totalCents)}</td><td><StatusBadge status={p.status} kind="payout" /></td><td>{p.reference || "–"}</td><td>{p.paidAt?.toLocaleDateString("de-DE") ?? "–"}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>
      <section className="card">
        <div className="p-4 border-b border-line"><h2 className="font-semibold">Offene Positionen</h2></div>
        {s.open.length === 0 ? <p className="p-4 text-sm text-ink-2">Keine offenen Positionen.</p> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Bezahlt</th><th>Bestellung</th><th>Produkt</th><th>Menge</th><th>Dein Anteil</th></tr></thead>
            <tbody>{s.open.map((i) => <tr key={i.id}><td>{i.order.paidAt?.toLocaleDateString("de-DE")}</td><td>{i.order.number}</td><td>{i.title}</td><td>{i.quantity}</td><td>{formatCents(i.vendorNetCents)}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
