import Link from "next/link";
import { db } from "@/lib/db";
import { expireStaleOrders, daysAgo } from "@/modules/orders/service";
import { openPayoutsOverview } from "@/modules/payouts/service";
import { formatCents } from "@/lib/money";
import { paymentsMode } from "@/modules/payments";
import { plural } from "@/lib/text";
import { Stat } from "@/components/ui/stat";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function AdminHome() {
  await expireStaleOrders();
  const since = daysAgo(30);
  const [pendingProducts, pendingVendors, paid30, orders30, openPayouts, recent, items30] = await Promise.all([
    db.product.count({ where: { status: "PENDING" } }),
    db.vendor.count({ where: { status: "PENDING" } }),
    db.order.aggregate({ where: { status: "PAID", paidAt: { gte: since } }, _sum: { totalCents: true, shippingCents: true, subtotalCents: true } }),
    db.order.count({ where: { status: "PAID", paidAt: { gte: since } } }),
    openPayoutsOverview(),
    db.order.findMany({ where: { status: { not: "CANCELLED" } }, orderBy: { createdAt: "desc" }, take: 8, include: { _count: { select: { items: true } } } }),
    db.orderItem.aggregate({ where: { order: { status: "PAID", paidAt: { gte: since } } }, _sum: { commissionCents: true, vendorNetCents: true } }),
  ]);
  const openTotal = openPayouts.reduce((s, p) => s + p.openCents, 0);
  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-3xl font-semibold">Übersicht</h1><p className="text-ink-2">Die letzten 30 Tage.</p></div>
      {paymentsMode() === "test" ? <Alert tone="warn">Echte Zahlungen sind noch aus: Bestellungen werden ohne Geldfluss als bezahlt markiert. Zum Einschalten bitte an die Technik wenden (Stripe-Zugang hinterlegen).</Alert> : null}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Umsatz" value={formatCents(paid30._sum.totalCents ?? 0)} hint={`${plural(orders30, "bezahlte Bestellung", "bezahlte Bestellungen")} · davon Versand ${formatCents(paid30._sum.shippingCents ?? 0)}`} />
        <Stat label="Unser Anteil" value={formatCents(items30._sum.commissionCents ?? 0)} hint={`an die Macher: ${formatCents(items30._sum.vendorNetCents ?? 0)}`} />
        <Stat label="Noch an Macher zu zahlen" value={formatCents(openTotal)} hint={plural(openPayouts.length, "Macher mit offenem Guthaben", "Macher mit offenem Guthaben")} />
        <Stat label="Zu prüfen" value={String(pendingProducts + pendingVendors)} hint={`${plural(pendingProducts, "Produkt", "Produkte")} · ${plural(pendingVendors, "Bewerbung", "Bewerbungen")}`} />
      </div>
      <div className="flex flex-wrap gap-3">
        {pendingProducts ? <Link href="/admin/produkte?status=PENDING" className="btn btn-primary">{plural(pendingProducts, "Produkt freigeben", "Produkte freigeben")}</Link> : null}
        {pendingVendors ? <Link href="/admin/haendler?status=PENDING" className="btn btn-secondary">{plural(pendingVendors, "Bewerbung prüfen", "Bewerbungen prüfen")}</Link> : null}
        <Link href="/admin/produkte/neu" className="btn btn-secondary">Produkt anlegen</Link>
        <Link href="/admin/haendler/neu" className="btn btn-secondary">Macher anlegen</Link>
      </div>
      <section className="card">
        <div className="p-4 border-b border-line flex justify-between"><h2 className="font-semibold">Letzte Bestellungen</h2><Link href="/admin/bestellungen" className="text-sm text-accent-text font-semibold">Alle</Link></div>
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Nummer</th><th>Datum</th><th>Kunde</th><th>Artikel</th><th>Summe</th><th>Stand</th></tr></thead>
          <tbody>{recent.map((o) => <tr key={o.id}><td className="nowrap"><Link href={`/admin/bestellungen/${o.id}`} className="text-accent-text font-semibold">{o.number}</Link></td><td className="nowrap">{o.createdAt.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}</td><td>{o.name}</td><td>{o._count.items}</td><td className="nowrap">{formatCents(o.totalCents)}</td><td><StatusBadge status={o.status} kind="order" /></td></tr>)}</tbody>
        </table></div>
        {recent.length === 0 ? <p className="p-4 text-sm text-ink-2">Noch keine Bestellungen.</p> : null}
      </section>
    </div>
  );
}
