import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderWithItems } from "@/modules/orders/service";
import { adminSetFulfillmentAction, adminCancelOrderAction, adminMarkPaidAction, adminRefundOrderAction } from "@/modules/orders/actions";
import { formatCents } from "@/lib/money";
import { StatusBadge } from "@/components/ui/status-badge";

function nextStep(f: string): { value: string; label: string } | null {
  if (f === "NEW") return { value: "PACKED", label: "Gepackt melden" };
  if (f === "PACKED") return { value: "SHIPPED", label: "Verschickt melden" };
  if (f === "SHIPPED") return { value: "DELIVERED", label: "Zugestellt melden" };
  return null;
}

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const order = await getOrderWithItems((await params).id);
  if (!order) notFound();
  const commission = order.items.reduce((s, i) => s + i.commissionCents, 0);
  const vendorNet = order.items.reduce((s, i) => s + i.vendorNetCents, 0);
  const paymentText = order.paymentProvider === "test" ? "Testzahlung, kein Geld geflossen" : order.paymentProvider === "stripe" ? "Stripe" : "noch keine";
  return (
    <div className="space-y-6 max-w-5xl min-w-0">
      <div>
        <Link href="/admin/bestellungen" className="text-sm text-ink-2 hover:underline">← Bestellungen</Link>
        <div className="flex flex-wrap items-center gap-3 mt-1"><h1 className="font-display text-3xl font-semibold num">{order.number}</h1><StatusBadge status={order.status} kind="order" /></div>
        <p className="text-ink-2 text-sm num">Bestellt am {order.createdAt.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}{order.paidAt ? `, bezahlt um ${order.paidAt.toLocaleTimeString("de-DE", { timeStyle: "short" })}` : ""} · Zahlung: {paymentText}</p>
        {order.paymentRef ? <p className="text-xs text-ink-3 num">Kennung beim Zahlungsdienst: {order.paymentRef}</p> : null}
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_260px] gap-6 min-w-0">
        <section className="card min-w-0">
          <div className="p-4 border-b border-line"><h2 className="font-semibold">Artikel</h2></div>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Produkt</th><th>Macher</th><th>Stück</th><th className="nowrap">Preis</th><th className="nowrap">An den Macher</th><th>Versand</th></tr></thead>
            <tbody>
              {order.items.map((i) => {
                const step = nextStep(i.fulfillment);
                return (
                  <tr key={i.id}>
                    <td>{i.product ? <Link href={`/produkt/${i.product.slug}`} className="text-accent-text font-semibold">{i.title}</Link> : i.title}{i.sku ? <span className="block text-xs text-ink-2 num">{i.sku}</span> : null}</td>
                    <td><Link href={`/admin/haendler/${i.vendorId}`} className="text-accent-text">{i.vendor.name}</Link><span className="block text-xs text-ink-2">{i.shippingBy === "VENDOR" ? "verschickt selbst" : "über unser Lager"}</span></td>
                    <td className="num">{i.quantity}</td>
                    <td className="nowrap">{formatCents(i.lineTotalCents)}</td>
                    <td className="nowrap font-semibold">{formatCents(i.vendorNetCents)}<span className="block text-xs text-ink-2 font-normal">unser Anteil {formatCents(i.commissionCents)}</span>{i.payoutId ? <Link href={`/admin/auszahlungen/${i.payoutId}`} className="block text-xs text-ok font-normal">in Auszahlung</Link> : null}</td>
                    <td className="min-w-[180px]">
                      <StatusBadge status={i.fulfillment} />
                      {order.status === "PAID" && step ? (
                        <form action={adminSetFulfillmentAction} className="mt-2">
                          <input type="hidden" name="itemId" value={i.id} />
                          <input type="hidden" name="fulfillment" value={step.value} />
                          <button className="btn btn-secondary btn-sm" type="submit">{step.label}</button>
                        </form>
                      ) : null}
                      {order.status === "PAID" && (i.fulfillment === "DELIVERED" || i.fulfillment === "SHIPPED") ? (
                        <form action={adminSetFulfillmentAction} className="mt-2">
                          <input type="hidden" name="itemId" value={i.id} />
                          <input type="hidden" name="fulfillment" value="RETURNED" />
                          <button className="btn btn-ghost btn-sm" type="submit">Als Rücksendung markieren</button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
          <dl className="p-4 text-sm space-y-1 border-t border-line num">
            <div className="flex justify-between"><dt className="text-ink-2">Zwischensumme</dt><dd>{formatCents(order.subtotalCents)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-2">Versand</dt><dd>{formatCents(order.shippingCents)}</dd></div>
            <div className="flex justify-between font-semibold"><dt>Gesamt vom Kunden</dt><dd>{formatCents(order.totalCents)}</dd></div>
            <div className="flex justify-between text-ink-2 pt-2"><dt>davon unser Anteil</dt><dd>{formatCents(commission)}</dd></div>
            <div className="flex justify-between text-ink-2"><dt>davon an die Macher</dt><dd>{formatCents(vendorNet)}</dd></div>
          </dl>
        </section>
        <aside className="space-y-4 min-w-0">
          <section className="card p-4 text-sm">
            <h2 className="font-semibold mb-2">Kunde</h2>
            <p>{order.name}<br />{order.addressLine}<br />{order.postalCode} {order.city}</p>
            <p className="mt-2 break-all"><a href={`mailto:${order.email}`} className="text-accent-text">{order.email}</a></p>
            {order.note ? <p className="mt-2 text-ink-2">Grußkarte: „{order.note}“</p> : null}
            {order.deliveryNote ? <p className="mt-1 text-ink-2">Hinweis: „{order.deliveryNote}“</p> : null}
          </section>
          <section className="card p-4 space-y-3 text-sm">
            <h2 className="font-semibold">Aktionen</h2>
            {order.status === "PENDING" ? (
              <>
                <form action={adminMarkPaidAction} className="space-y-2"><input type="hidden" name="orderId" value={order.id} /><input name="reference" placeholder="Zahlungsreferenz (optional)" className="input !min-h-[36px]" /><button className="btn btn-primary btn-sm w-full" type="submit">Als bezahlt markieren</button></form>
                <form action={adminCancelOrderAction}><input type="hidden" name="orderId" value={order.id} /><button className="btn btn-danger btn-sm w-full" type="submit">Stornieren und Bestand freigeben</button></form>
              </>
            ) : null}
            {order.status === "PAID" && order.items.every((i) => !i.payoutId) ? (
              <form action={adminRefundOrderAction}><input type="hidden" name="orderId" value={order.id} /><button className="btn btn-danger btn-sm w-full" type="submit">Als erstattet markieren</button><p className="hint">Die Rückzahlung selbst läuft über den Zahlungsdienst. Die Verkäufe fallen aus der Auszahlung.</p></form>
            ) : null}
            {order.status === "PAID" && order.items.some((i) => i.payoutId) ? <p className="text-ink-2">Verkäufe stecken schon in einer Auszahlung.</p> : null}
            {order.status === "CANCELLED" || order.status === "REFUNDED" ? <p className="text-ink-2">Keine Aktionen mehr möglich.</p> : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
