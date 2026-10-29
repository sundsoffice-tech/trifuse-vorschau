import Link from "next/link";
import { requireVendorUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { vendorPayoutSummary } from "@/modules/payouts/service";
import { formatCents } from "@/lib/money";
import { Stat } from "@/components/ui/stat";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function PortalHome() {
  const user = await requireVendorUser();
  const vendor = await db.vendor.findUniqueOrThrow({ where: { id: user.vendorId } });
  const [counts, sold, payout, latest] = await Promise.all([
    db.product.groupBy({ by: ["status"], where: { vendorId: vendor.id }, _count: { _all: true } }),
    db.orderItem.aggregate({ where: { vendorId: vendor.id, order: { status: "PAID" } }, _sum: { lineTotalCents: true, vendorNetCents: true, quantity: true } }),
    vendorPayoutSummary(vendor.id),
    db.orderItem.findMany({ where: { vendorId: vendor.id, order: { status: "PAID" } }, include: { order: { select: { number: true, paidAt: true } } }, orderBy: { order: { paidAt: "desc" } }, take: 5 }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Hallo {user.name.split(" ")[0]}</h1>
        <p className="text-ink-2">Dein Überblick bei {vendor.name}.</p>
      </div>
      {vendor.status === "PENDING" ? <Alert tone="warn">Deine Bewerbung wird noch geprüft. Du kannst dich schon umsehen, aber noch keine Produkte veröffentlichen.</Alert> : null}
      {vendor.status === "ACTIVE" && !vendor.payoutIban ? <Alert tone="info">Hinterlege unter <Link href="/portal/einstellungen" className="underline">Einstellungen</Link> deine Bankverbindung, damit wir auszahlen können.</Alert> : null}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Live" value={String(count("ACTIVE"))} hint={count("PENDING") ? `${count("PENDING")} warten auf Freigabe` : undefined} />
        <Stat label="Verkaufte Stück" value={String(sold._sum.quantity ?? 0)} />
        <Stat label="Umsatz brutto" value={formatCents(sold._sum.lineTotalCents ?? 0)} hint={`Dein Anteil: ${formatCents(sold._sum.vendorNetCents ?? 0)}`} />
        <Stat label="Offen zur Auszahlung" value={formatCents(payout.openCents)} hint={`Provision ${vendor.commissionPercent} %`} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/portal/produkte/neu" className="btn btn-primary">Neues Produkt</Link>
        <Link href="/portal/produkte" className="btn btn-secondary">Produkte verwalten</Link>
      </div>
      <section className="card">
        <div className="p-4 border-b border-line flex items-center justify-between"><h2 className="font-semibold">Letzte Verkäufe</h2><Link href="/portal/bestellungen" className="text-sm text-accent">Alle</Link></div>
        {latest.length ? (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Bestellung</th><th>Produkt</th><th>Menge</th><th>Dein Anteil</th><th>Status</th></tr></thead>
            <tbody>{latest.map((i) => <tr key={i.id}><td>{i.order.number}</td><td>{i.title}</td><td>{i.quantity}</td><td>{formatCents(i.vendorNetCents)}</td><td><StatusBadge status={i.fulfillment} /></td></tr>)}</tbody>
          </table></div>
        ) : <p className="p-4 text-sm text-ink-2">Noch keine Verkäufe.</p>}
      </section>
    </div>
  );
}
