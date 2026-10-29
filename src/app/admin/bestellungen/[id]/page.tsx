import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderWithItems } from "@/modules/orders/service";
import { adminSetFulfillmentAction, adminCancelOrderAction, adminMarkPaidAction, adminRefundOrderAction } from "@/modules/orders/actions";
import { formatCents } from "@/lib/money";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const order = await getOrderWithItems((await params).id);
  if (!order) notFound();
  const commission = order.items.reduce((s, i) => s + i.commissionCents, 0);
  const vendorNet = order.items.reduce((s, i) => s + i.vendorNetCents, 0);
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/admin/bestellungen" className="text-sm text-ink-3">← Bestellungen</Link>
        <div className="flex flex-wrap items-center gap-3 mt-1"><h1 className="font-display text-3xl font-semibold">{order.number}</h1><StatusBadge status={order.status} kind="order" /></div>
        <p className="text-ink-2 text-sm">{order.createdAt.toLocaleString("de-DE")} · Zahlung: {order.paymentProvider || "–"} {order.paymentRef ? <span className="font-mono text-xs">({order.paymentRef})</span> : null}{order.paidAt ? ` · bezahlt ${order.paidAt.toLocaleString("de-DE")}` : ""}</p>
      </div>

      <div className="grid md:grid-cols-[1fr_300px] gap-6">
        <section className="card">
          <div className="p-4 border-b border-line"><h2 className="font-semibold">Positionen</h2></div>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Produkt</th><th>Händler</th><th>Menge</th><th>Brutto</th><th>Provision</th><th>Händleranteil</th><th>Versand</th></tr></thead>
            <tbody>
              {order.items.map((i) => (
                <tr key={i.id}>
                  <td>{i.product ? <Link href={`/produkt/${i.product.slug}`} className="text-accent">{i.title}</Link> : i.title}{i.sku ? <span className="block text-xs text-ink-3">{i.sku}</span> : null}</td>
                  <td><Link href={`/admin/haendler/${i.vendorId}`} className="text-accent">{i.vendor.name}</Link></td>
                  <td>{i.quantity} × {formatCents(i.unitPriceCents)}</td>
                  <td>{formatCents(i.lineTotalCents)}</td>
                  <td className="text-ink-3">{i.commissionPercent} % · {formatCents(i.commissionCents)}</td>
                  <td className="font-semibold">{formatCents(i.vendorNetCents)}{i.payoutId ? <Link href={`/admin/auszahlungen/${i.payoutId}`} className="block text-xs text-ok">in Auszahlung</Link> : null}</td>
                  <td>
                    {order.status === "PAID" ? (
                      <form action={adminSetFulfillmentAction} className="flex items-center gap-1">
                        <input type="hidden" name="itemId" value={i.id} />
                        <select name="fulfillment" defaultValue={i.fulfillment} className="select !min-h-[36px] !py-1 !w-auto text-sm">
                          <option value="NEW">Neu</option><option value="PACKED">Gepackt</option><option value="SHIPPED">Versendet</option><option value="DELIVERED">Zugestellt</option><option value="RETURNED">Retoure</option>
                        </select>
                        <button className="btn btn-ghost btn-sm" type="submit">OK</button>
                        <span className="text-xs text-ink-3">{i.shippingBy === "VENDOR" ? "Händler" : "Lager"}</span>
                      </form>
                    ) : <StatusBadge status={i.fulfillment} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <dl className="p-4 text-sm space-y-1 border-t border-line">
            <div className="flex justify-between"><dt className="text-ink-2">Zwischensumme</dt><dd>{formatCents(order.subtotalCents)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-2">Versand</dt><dd>{formatCents(order.shippingCents)}</dd></div>
            <div className="flex justify-between font-semibold"><dt>Gesamt vom Kunden</dt><dd>{formatCents(order.totalCents)}</dd></div>
            <div className="flex justify-between text-ink-2 pt-2"><dt>davon Provision Marktplatz</dt><dd>{formatCents(commission)}</dd></div>
            <div className="flex justify-between text-ink-2"><dt>davon an Händler</dt><dd>{formatCents(vendorNet)}</dd></div>
          </dl>
        </section>
        <aside className="space-y-4">
          <section className="card p-4 text-sm">
            <h2 className="font-semibold mb-2">Kunde</h2>
            <p>{order.name}<br />{order.addressLine}<br />{order.postalCode} {order.city}</p>
            <p className="mt-2"><a href={`mailto:${order.email}`} className="text-accent">{order.email}</a></p>
            {order.note ? <p className="mt-2 text-ink-2 italic">„{order.note}“</p> : null}
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
              <form action={adminRefundOrderAction}><input type="hidden" name="orderId" value={order.id} /><button className="btn btn-danger btn-sm w-full" type="submit">Als erstattet markieren</button><p className="hint">Die Rückzahlung selbst läuft über den Zahlungsanbieter. Positionen fallen aus der Auszahlung.</p></form>
            ) : null}
            {order.status === "PAID" && order.items.some((i) => i.payoutId) ? <p className="text-ink-3">Positionen stecken bereits in einer Auszahlung.</p> : null}
            {order.status === "CANCELLED" || order.status === "REFUNDED" ? <p className="text-ink-3">Keine Aktionen mehr möglich.</p> : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
