import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderWithItems } from "@/modules/orders/service";
import { refundSummary } from "@/modules/orders/reversals";
import { adminSetFulfillmentAction, adminCancelOrderAction, adminMarkPaidAction, adminReverseItemAction, adminReverseOrderAction, adminRetryRefundAction } from "@/modules/orders/actions";
import { formatCents } from "@/lib/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { Alert } from "@/components/ui/alert";
import { reversalReasonText } from "@/modules/orders/texts";

function nextStep(f: string): { value: string; label: string } | null {
  if (f === "NEW") return { value: "PACKED", label: "Gepackt melden" };
  if (f === "PACKED") return { value: "SHIPPED", label: "Verschickt melden" };
  if (f === "SHIPPED") return { value: "DELIVERED", label: "Zugestellt melden" };
  return null;
}

function moneyHint(provider: string) {
  if (provider === "stripe") return "Die Rückzahlung läuft über Stripe auf das Zahlungsmittel des Kunden.";
  if (provider === "test") return "Testmodus: es fließt kein Geld, die Rückzahlung wird nur simuliert.";
  return "Die Bestellung wurde außerhalb der Kasse bezahlt. Mit dem Haken bestätigst du, dass du das Geld zurücküberwiesen hast.";
}

function ReverseFields({ provider, maxQty, withShipping }: { provider: string; maxQty?: number; withShipping?: boolean }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap gap-2">
        {maxQty && maxQty > 1 ? (
          <label className="flex items-center gap-2">Stück
            <select name="quantity" className="input !min-h-[40px] !w-auto" defaultValue={maxQty}>{Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}</select>
          </label>
        ) : <input type="hidden" name="quantity" value="1" />}
        <label className="flex items-center gap-2">Grund
          <select name="reason" className="input !min-h-[40px] !w-auto" defaultValue="RETURN"><option value="RETURN">Rückgabe</option><option value="REFUND">Erstattung</option><option value="GOODWILL">Kulanz</option></select>
        </label>
      </div>
      <label className="flex items-center gap-2 min-h-[40px]"><input type="checkbox" name="restock" value="1" defaultChecked className="w-5 h-5" /> Ware zurück in den Bestand</label>
      <label className="flex items-center gap-2 min-h-[40px]"><input type="checkbox" name="refundMoney" value="1" defaultChecked className="w-5 h-5" /> Geld an den Kunden zurückzahlen</label>
      {withShipping ? <label className="flex items-center gap-2 min-h-[40px]"><input type="checkbox" name="includeShipping" value="1" className="w-5 h-5" /> Versandkosten mit zurückzahlen</label> : null}
      <p className="hint">{moneyHint(provider)}</p>
      <input name="note" placeholder="Notiz (optional)" className="input !min-h-[40px]" maxLength={300} />
    </div>
  );
}

export default async function AdminOrderDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ rueckzahlung?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const order = await getOrderWithItems(id);
  if (!order) notFound();
  const commission = order.items.reduce((s, i) => s + i.commissionCents, 0);
  const vendorNet = order.items.reduce((s, i) => s + i.vendorNetCents, 0);
  const paymentText = order.paymentProvider === "test" ? "Testzahlung, kein Geld geflossen" : order.paymentProvider === "stripe" ? "Stripe" : "noch keine";
  const settled = order.status === "PAID" || order.status === "REFUNDED";
  const summary = refundSummary(order);
  const openQty = (i: (typeof order.items)[number]) => i.quantity - i.reversals.reduce((s, r) => s + r.quantity, 0);
  const anythingOpen = order.items.some((i) => openQty(i) > 0);
  const itemTitle = new Map(order.items.map((i) => [i.id, i.title]));
  return (
    <div className="space-y-6 max-w-5xl min-w-0">
      <div>
        <Link href="/admin/bestellungen" className="text-sm text-ink-2 hover:underline">← Bestellungen</Link>
        <div className="flex flex-wrap items-center gap-3 mt-1"><h1 className="font-display text-3xl font-semibold num">{order.number}</h1><StatusBadge status={order.status} kind="order" /></div>
        <p className="text-ink-2 text-sm num">Bestellt am {order.createdAt.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}{order.paidAt ? `, bezahlt um ${order.paidAt.toLocaleTimeString("de-DE", { timeStyle: "short" })}` : ""} · Zahlung: {paymentText}</p>
        {order.paymentRef ? <p className="text-xs text-ink-3 num">Kennung beim Zahlungsdienst: {order.paymentRef}{order.paymentIntent ? ` · Vorgang ${order.paymentIntent}` : ""}</p> : null}
      </div>

      {sp.rueckzahlung === "fehler" ? <Alert tone="bad">Die Rückbuchung ist gespeichert, aber die Rückzahlung beim Zahlungsdienst ist fehlgeschlagen. Unten steht der Fehler; du kannst es erneut versuchen.</Alert> : null}
      {summary.unassignedCents > 0 ? <Alert tone="warn">Beim Zahlungsdienst wurden {formatCents(summary.refundedCents)} erstattet, hier sind erst {formatCents(summary.bookedCents)} auf Verkäufe gebucht. Bitte die passenden Positionen unten zurückbuchen, ohne den Haken „Geld zurückzahlen“, sonst stimmt die Auszahlung der Macher nicht.</Alert> : null}

      <div className="grid xl:grid-cols-[minmax(0,1fr)_280px] gap-6 min-w-0">
        <div className="space-y-6 min-w-0">
          <section className="card min-w-0">
            <div className="p-4 border-b border-line"><h2 className="font-semibold">Artikel</h2></div>
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Produkt</th><th>Macher</th><th>Stück</th><th className="nowrap">Preis</th><th className="nowrap">An den Macher</th><th>Versand</th></tr></thead>
              <tbody>
                {order.items.map((i) => {
                  const step = nextStep(i.fulfillment);
                  const open = openQty(i);
                  return (
                    <tr key={i.id}>
                      <td>{i.product ? <Link href={`/produkt/${i.product.slug}`} className="text-accent-text font-semibold">{i.title}</Link> : i.title}{i.sku ? <span className="block text-xs text-ink-2 num">{i.sku}</span> : null}
                        {settled && open > 0 ? (
                          <details className="mt-2">
                            <summary className="details-summary !min-h-0 !text-xs">Zurückbuchen{open < i.quantity ? ` (${open} von ${i.quantity} offen)` : ""}</summary>
                            <form action={adminReverseItemAction} className="mt-2 space-y-2 max-w-sm">
                              <input type="hidden" name="itemId" value={i.id} />
                              <ReverseFields provider={order.paymentProvider} maxQty={open} />
                              <button className="btn btn-danger btn-sm" type="submit">Zurückbuchen</button>
                            </form>
                          </details>
                        ) : null}
                        {open === 0 ? <span className="badge badge-bad mt-2">vollständig zurückgebucht</span> : null}
                      </td>
                      <td><Link href={`/admin/haendler/${i.vendorId}`} className="text-accent-text whitespace-nowrap">{i.vendor.name}</Link><span className="block text-xs text-ink-2">{i.shippingBy === "VENDOR" ? "verschickt selbst" : "über unser Lager"}</span></td>
                      <td className="num">{i.quantity}</td>
                      <td className="nowrap">{formatCents(i.lineTotalCents)}</td>
                      <td className="nowrap font-semibold">{formatCents(i.vendorNetCents)}<span className="block text-xs text-ink-2 font-normal">unser Anteil {formatCents(i.commissionCents)}</span>{i.payoutId ? <Link href={`/admin/auszahlungen/${i.payoutId}`} className="block text-xs text-ok font-normal">in Auszahlung</Link> : null}</td>
                      <td className="min-w-[180px]">
                        <StatusBadge status={i.fulfillment} />
                        {order.status === "PAID" && step && open > 0 ? (
                          <form action={adminSetFulfillmentAction} className="mt-2">
                            <input type="hidden" name="itemId" value={i.id} />
                            <input type="hidden" name="fulfillment" value={step.value} />
                            <button className="btn btn-secondary btn-sm" type="submit">{step.label}</button>
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
              {order.refundedCents > 0 ? <div className="flex justify-between text-bad pt-2"><dt>An den Kunden zurückgezahlt</dt><dd>{formatCents(order.refundedCents)}</dd></div> : null}
            </dl>
          </section>

          {order.reversals.length > 0 ? (
            <section className="card min-w-0">
              <div className="p-4 border-b border-line"><h2 className="font-semibold">Rückbuchungen</h2><p className="text-sm text-ink-2">Jede Rückbuchung zieht beim Macher ab, auch wenn der Verkauf schon ausgezahlt war; dann in der nächsten Auszahlung.</p></div>
              <div className="table-wrap"><table className="table">
                <thead><tr><th>Datum</th><th>Produkt</th><th>Grund</th><th>Stück</th><th className="nowrap">Preis</th><th className="nowrap">Beim Macher</th><th>Geld zurück</th></tr></thead>
                <tbody>
                  {order.reversals.map((r) => (
                    <tr key={r.id}>
                      <td className="nowrap">{r.createdAt.toLocaleDateString("de-DE")}</td>
                      <td>{itemTitle.get(r.orderItemId)}{r.note ? <span className="block text-xs text-ink-2">{r.note}</span> : null}{r.restocked ? <span className="block text-xs text-ink-2">zurück in den Bestand</span> : null}</td>
                      <td className="nowrap">{reversalReasonText(r.reason)}</td>
                      <td className="num">{r.quantity}</td>
                      <td className="nowrap">{formatCents(r.lineTotalCents)}</td>
                      <td className="nowrap font-semibold">{formatCents(r.vendorNetCents)}{r.payoutId ? <Link href={`/admin/auszahlungen/${r.payoutId}`} className="block text-xs text-ok font-normal">verrechnet</Link> : <span className="block text-xs text-ink-2 font-normal">in nächster Auszahlung</span>}</td>
                      <td className="text-sm">
                        {r.refundedAt ? <span className="text-ok">zurückgezahlt{r.refundRef && r.refundRef !== "manuell" ? <span className="block text-xs text-ink-3 num">{r.refundRef}</span> : null}</span>
                          : r.refundError ? <form action={adminRetryRefundAction}><input type="hidden" name="reversalId" value={r.id} /><span className="block text-bad text-xs">{r.refundError}</span><button className="btn btn-secondary btn-sm mt-1" type="submit">Erneut versuchen</button></form>
                          : <span className="text-ink-2">kein Geldfluss</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </section>
          ) : null}
        </div>

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
            {settled && anythingOpen ? (
              <details>
                <summary className="details-summary">Ganze Bestellung erstatten</summary>
                <form action={adminReverseOrderAction} className="mt-2 space-y-2">
                  <input type="hidden" name="orderId" value={order.id} />
                  <ReverseFields provider={order.paymentProvider} withShipping={order.shippingCents > 0} />
                  <button className="btn btn-danger btn-sm w-full" type="submit">Alles zurückbuchen</button>
                </form>
              </details>
            ) : null}
            {order.status === "REFUNDED" ? <p className="text-ink-2">Vollständig erstattet.</p> : null}
            {order.status === "CANCELLED" ? <p className="text-ink-2">Storniert, keine Aktionen mehr möglich.</p> : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
