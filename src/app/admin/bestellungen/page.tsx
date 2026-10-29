import Link from "next/link";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { StatusBadge } from "@/components/ui/status-badge";
import type { OrderStatus } from "@prisma/client";

const tabs: { value: OrderStatus | "ALL"; label: string }[] = [{ value: "PAID", label: "Bezahlt" }, { value: "PENDING", label: "Zahlung offen" }, { value: "REFUNDED", label: "Erstattet" }, { value: "CANCELLED", label: "Storniert" }, { value: "ALL", label: "Alle" }];

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = (tabs.find((t) => t.value === sp.status)?.value ?? "PAID") as OrderStatus | "ALL";
  const orders = await db.order.findMany({ where: status === "ALL" ? {} : { status }, orderBy: { createdAt: "desc" }, take: 200, include: { items: { select: { fulfillment: true, vendor: { select: { name: true } } } } } });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Bestellungen</h1>
      <div className="flex flex-wrap gap-2">{tabs.map((t) => <Link key={t.value} href={`/admin/bestellungen?status=${t.value}`} className="chip !min-h-[40px]" aria-current={status === t.value ? "true" : undefined}>{t.label}</Link>)}</div>
      <div className="card table-wrap"><table className="table">
        <thead><tr><th>Nummer</th><th>Datum</th><th>Kunde</th><th>Macher</th><th>Versand</th><th>Summe</th><th>Stand</th></tr></thead>
        <tbody>
          {orders.map((o) => {
            const vendors = [...new Set(o.items.map((i) => i.vendor.name))];
            const shipped = o.items.filter((i) => i.fulfillment === "SHIPPED" || i.fulfillment === "DELIVERED").length;
            return (
              <tr key={o.id}>
                <td className="nowrap"><Link href={`/admin/bestellungen/${o.id}`} className="text-accent-text font-semibold">{o.number}</Link></td>
                <td className="nowrap">{o.createdAt.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}</td>
                <td>{o.name}<span className="block text-xs text-ink-2">{o.postalCode} {o.city}</span></td>
                <td>{vendors.join(", ")}</td>
                <td className="nowrap">{o.status === "PAID" ? <span className={`badge ${shipped === o.items.length ? "badge-ok" : "badge-warn"}`}>{shipped} von {o.items.length} verschickt</span> : "–"}</td>
                <td className="nowrap">{formatCents(o.totalCents)}</td>
                <td><StatusBadge status={o.status} kind="order" /></td>
              </tr>
            );
          })}
          {orders.length === 0 ? <tr><td colSpan={7} className="text-ink-2">Keine Bestellungen in dieser Ansicht.</td></tr> : null}
        </tbody>
      </table></div>
    </div>
  );
}
