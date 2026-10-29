import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getOrderWithItems, markOrderPaid } from "@/modules/orders/service";
import { getPaymentProvider } from "@/modules/payments";
import { clearCart } from "@/modules/cart/service";
import { formatCents } from "@/lib/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { Alert } from "@/components/ui/alert";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Bestellung" };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  let order = await getOrderWithItems(id);
  if (!order) notFound();

  if (order.status === "PENDING" && order.paymentProvider === "stripe") {
    try {
      const check = await getPaymentProvider("stripe").verifyReturn(order, sp);
      if (check.paid) {
        await markOrderPaid(order.id, check.ref);
        order = (await getOrderWithItems(id))!;
      }
    } catch {
      // Webhook bleibt die verlässliche Quelle; hier nur ein Komfort-Abgleich.
    }
  }
  if (order.status === "PAID") await clearCart();

  const byVendor = new Map<string, typeof order.items>();
  for (const item of order.items) {
    const list = byVendor.get(item.vendor.name) ?? [];
    list.push(item);
    byVendor.set(item.vendor.name, list);
  }

  return (
    <div className="container-x py-10 max-w-3xl">
      {order.status === "PAID" ? (
        <>
          <p className="text-xs uppercase tracking-[0.15em] text-ok font-semibold">Vielen Dank</p>
          <h1 className="font-display text-3xl md:text-4xl font-semibold mt-1">Deine Bestellung ist eingegangen.</h1>
          <p className="text-ink-2 mt-3">Bestellnummer <strong>{order.number}</strong>. Eine Bestätigung geht an {order.email}. Wir melden uns, sobald das Paket unterwegs ist.</p>
        </>
      ) : order.status === "PENDING" ? (
        <>
          <h1 className="font-display text-3xl font-semibold">Zahlung noch offen</h1>
          <div className="mt-4"><Alert tone="warn">Wir haben noch keine Zahlungsbestätigung erhalten. Falls du gerade bezahlt hast, lade diese Seite in einer Minute neu.</Alert></div>
        </>
      ) : (
        <>
          <h1 className="font-display text-3xl font-semibold">Bestellung {order.number}</h1>
          <div className="mt-4"><StatusBadge status={order.status} kind="order" /></div>
        </>
      )}

      <div className="card mt-8 divide-y divide-line">
        {[...byVendor.entries()].map(([vendorName, items]) => (
          <div key={vendorName} className="p-5">
            <p className="text-xs uppercase tracking-wide text-ink-3 mb-2">Von {vendorName}</p>
            <ul className="space-y-2 text-sm">
              {items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4">
                  <span>{i.quantity} × {i.title}</span>
                  <span>{formatCents(i.lineTotalCents)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <dl className="p-5 text-sm space-y-1">
          <div className="flex justify-between"><dt className="text-ink-2">Zwischensumme</dt><dd>{formatCents(order.subtotalCents)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-2">Versand</dt><dd>{order.shippingCents === 0 ? "kostenlos" : formatCents(order.shippingCents)}</dd></div>
          <div className="flex justify-between font-semibold text-base pt-2"><dt>Gesamt</dt><dd>{formatCents(order.totalCents)}</dd></div>
        </dl>
        <div className="p-5 text-sm">
          <p className="font-semibold">Lieferadresse</p>
          <p className="text-ink-2">{order.name}<br />{order.addressLine}<br />{order.postalCode} {order.city}</p>
        </div>
      </div>
      <p className="text-sm text-ink-3 mt-6">Fragen zur Bestellung? Schreib an {BRAND.supportEmail} und nenne die Bestellnummer.</p>
      <Link href="/produkte" className="btn btn-secondary mt-6">Weiter stöbern</Link>
    </div>
  );
}
