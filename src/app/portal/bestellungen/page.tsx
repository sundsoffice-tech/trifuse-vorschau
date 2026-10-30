import { requireVendorUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { vendorSetFulfillmentAction } from "@/modules/catalog/vendor-actions";
import { formatCents } from "@/lib/money";
import { fulfillmentText, reversalReasonText } from "@/modules/orders/texts";
import { Empty } from "@/components/ui/empty";

export default async function PortalSales() {
  const user = await requireVendorUser();
  const items = await db.orderItem.findMany({
    where: { vendorId: user.vendorId, order: { status: { in: ["PAID", "REFUNDED"] } } },
    include: { order: { select: { id: true, number: true, paidAt: true, status: true, name: true, addressLine: true, postalCode: true, city: true } }, reversals: { orderBy: { createdAt: "asc" } } },
    orderBy: { order: { paidAt: "desc" } },
  });
  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-3xl font-semibold">Verkäufe</h1><p className="text-ink-2">Jeder bezahlte Verkauf einzeln, mit dem Betrag, der zu dir kommt. Rückgaben stehen beim Verkauf und werden mit der nächsten Auszahlung verrechnet.</p></div>
      {items.length === 0 ? <Empty title="Noch keine Verkäufe" text="Sobald jemand eines deiner Produkte bezahlt hat, steht es hier." /> : (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th className="nowrap">Bezahlt am</th><th>Produkt</th><th>Stück</th><th className="nowrap">Kommt zu dir</th><th>Versand</th><th>Auszahlung</th></tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="nowrap">{i.order.paidAt?.toLocaleDateString("de-DE") ?? "–"}<span className="block text-xs text-ink-2">{i.order.number}</span></td>
                  <td>{i.title}<span className="block text-xs text-ink-2 num">{i.quantity} × {formatCents(i.unitPriceCents)}</span></td>
                  <td className="num">{i.quantity}</td>
                  <td className="nowrap font-semibold">{formatCents(i.vendorNetCents)}<span className="block text-xs text-ink-2 font-normal">von {formatCents(i.lineTotalCents)}</span>{i.reversals.map((r) => <span key={r.id} className="block text-xs text-bad font-normal">{reversalReasonText(r.reason)} {r.quantity} Stück: {formatCents(r.vendorNetCents)}</span>)}</td>
                  <td>
                    {i.shippingBy === "VENDOR" && (i.fulfillment === "NEW" || i.fulfillment === "PACKED") ? (
                      <form action={vendorSetFulfillmentAction} className="space-y-1">
                        <input type="hidden" name="itemId" value={i.id} />
                        <input type="hidden" name="fulfillment" value="SHIPPED" />
                        <details><summary className="details-summary !min-h-0 !text-xs">Adresse</summary><p className="text-xs">{i.order.name}, {i.order.addressLine}, {i.order.postalCode} {i.order.city}</p></details>
                        <button className="btn btn-primary btn-sm" type="submit">Verschickt melden</button>
                      </form>
                    ) : <span className="text-sm">{fulfillmentText(i.fulfillment, i.shippingBy)}</span>}
                  </td>
                  <td className="nowrap">{i.payoutId ? <span className="badge badge-ok">überwiesen oder unterwegs</span> : <span className="badge badge-muted">noch offen</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
