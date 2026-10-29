import Link from "next/link";
import { requireVendorUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { vendorPayoutSummary } from "@/modules/payouts/service";
import { getSetting } from "@/lib/settings";
import { formatCents } from "@/lib/money";
import { Stat } from "@/components/ui/stat";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function PortalPayouts() {
  const user = await requireVendorUser();
  const [s, vendor, schedule] = await Promise.all([vendorPayoutSummary(user.vendorId), db.vendor.findUniqueOrThrow({ where: { id: user.vendorId } }), getSetting("payout_schedule")]);
  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-3xl font-semibold">Auszahlungen</h1><p className="text-ink-2">Dein Anteil aus bezahlten Verkäufen, gesammelt überwiesen, {schedule}.</p></div>
      {!vendor.payoutIban ? <Alert tone="warn">Damit wir dir {s.openCents > 0 ? formatCents(s.openCents) : "dein Geld"} überweisen können, fehlt deine Bankverbindung. <Link href="/portal/einstellungen#bank" className="underline font-semibold">Jetzt eintragen</Link></Alert> : null}
      <div className="grid sm:grid-cols-2 gap-3">
        <Stat label="Nächste Auszahlung" value={formatCents(s.openCents)} hint={`${s.open.length} ${s.open.length === 1 ? "Verkauf" : "Verkäufe"} noch nicht überwiesen · ${schedule}`} />
        <Stat label="Bereits überwiesen" value={formatCents(s.paidCents)} />
      </div>
      <section className="card">
        <div className="p-4 border-b border-line"><h2 className="font-semibold">Bisherige Überweisungen</h2></div>
        {s.payouts.length === 0 ? <p className="p-4 text-sm text-ink-2">Noch keine. Die erste kommt {schedule}, sobald Verkäufe da sind.</p> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Erstellt</th><th>Verkäufe</th><th>Betrag</th><th>Stand</th><th>Verwendungszweck</th><th className="nowrap">Überwiesen am</th></tr></thead>
            <tbody>{s.payouts.map((p) => <tr key={p.id}><td className="nowrap">{p.createdAt.toLocaleDateString("de-DE")}</td><td>{p._count.items}</td><td className="font-semibold nowrap">{formatCents(p.totalCents)}</td><td><StatusBadge status={p.status} kind="payout" /></td><td>{p.reference || "–"}</td><td className="nowrap">{p.paidAt?.toLocaleDateString("de-DE") ?? "–"}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>
      <section className="card">
        <div className="p-4 border-b border-line"><h2 className="font-semibold">Noch nicht überwiesene Verkäufe</h2></div>
        {s.open.length === 0 ? <p className="p-4 text-sm text-ink-2">Keine offenen Verkäufe.</p> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th className="nowrap">Bezahlt am</th><th className="nowrap">Bestellung</th><th>Produkt</th><th>Stück</th><th className="nowrap">Kommt zu dir</th></tr></thead>
            <tbody>{s.open.map((i) => <tr key={i.id}><td className="nowrap">{i.order.paidAt?.toLocaleDateString("de-DE")}</td><td className="nowrap">{i.order.number}</td><td>{i.title}</td><td>{i.quantity}</td><td className="nowrap">{formatCents(i.vendorNetCents)}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
