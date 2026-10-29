import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getOrderWithItems } from "@/modules/orders/service";
import { formatCents } from "@/lib/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { Alert } from "@/components/ui/alert";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Bestellung" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderWithItems(id);
  if (!order) notFound();

  const byVendor = new Map<string, typeof order.items>();
  for (const item of order.items) {
    const list = byVendor.get(item.vendor.name) ?? [];
    list.push(item);
    byVendor.set(item.vendor.name, list);
  }
  const shareTotal = order.items.reduce((s, i) => s + i.vendorNetCents, 0);

  return (
    <div className="container-x py-10 max-w-3xl">
      {order.status === "PAID" ? (
        <>
          <h1 className="font-display text-3xl md:text-4xl font-semibold">Danke, deine Bestellung ist eingegangen.</h1>
          <p className="text-ink-2 mt-3 num">Bestellnummer <strong className="text-ink">{order.number}</strong>. Eine Bestätigung geht an {order.email}. Wir melden uns, sobald das Paket unterwegs ist, in der Regel in 2 bis 4 Werktagen.</p>
          <p className="mt-3 num text-accent-text font-semibold">{formatCents(shareTotal)} deiner Bestellung gehen an {byVendor.size === 1 ? [...byVendor.keys()][0] : `${byVendor.size} Macher`}.</p>
        </>
      ) : order.status === "PENDING" ? (
        <>
          <h1 className="font-display text-3xl font-semibold">Zahlung noch offen</h1>
          <div className="mt-4"><Alert tone="warn">Wir haben noch keine Zahlungsbestätigung. Falls du gerade bezahlt hast, lade diese Seite in einer Minute neu.</Alert></div>
        </>
      ) : (
        <>
          <h1 className="font-display text-3xl font-semibold num">Bestellung {order.number}</h1>
          <div className="mt-4"><StatusBadge status={order.status} kind="order" /></div>
        </>
      )}

      <div className="card mt-8 divide-y divide-line">
        {[...byVendor.entries()].map(([vendorName, items]) => (
          <div key={vendorName} className="p-5">
            <p className="font-semibold">{vendorName}<span className="text-ink-2 font-normal num"> · {formatCents(items.reduce((s, i) => s + i.vendorNetCents, 0))} gehen an {vendorName}</span></p>
            <ul className="space-y-2 text-sm mt-2 num">
              {items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4">
                  <span>{i.quantity} × {i.title}</span>
                  <span>{formatCents(i.lineTotalCents)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <dl className="p-5 text-sm space-y-1 num">
          <div className="flex justify-between"><dt className="text-ink-2">Zwischensumme</dt><dd>{formatCents(order.subtotalCents)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-2">Versand, ein Paket</dt><dd>{order.shippingCents === 0 ? "kostenlos" : formatCents(order.shippingCents)}</dd></div>
          <div className="flex justify-between font-semibold text-base pt-2"><dt>Gesamt</dt><dd>{formatCents(order.totalCents)}</dd></div>
        </dl>
        <div className="p-5 text-sm">
          <p className="font-semibold">Lieferadresse</p>
          <p className="text-ink-2">{order.name}<br />{order.addressLine}<br />{order.postalCode} {order.city}</p>
          {order.note ? <p className="text-ink-2 mt-2">Grußkarte: „{order.note}“</p> : null}
          {order.deliveryNote ? <p className="text-ink-2 mt-1">Dein Hinweis an uns: „{order.deliveryNote}“</p> : null}
        </div>
      </div>
      <p className="text-sm text-ink-2 mt-6">Fragen zur Bestellung? Schreib an <a href={`mailto:${BRAND.supportEmail}`} className="underline">{BRAND.supportEmail}</a> und nenne die Bestellnummer.</p>
      <Link href="/produkte" className="btn btn-secondary mt-6">Weiter stöbern</Link>
    </div>
  );
}
