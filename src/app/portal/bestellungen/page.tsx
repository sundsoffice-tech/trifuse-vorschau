import { requireVendorUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { vendorSetFulfillmentAction } from "@/modules/catalog/vendor-actions";
import { formatCents } from "@/lib/money";
import { fulfillmentText } from "@/modules/orders/texts";
import { Empty } from "@/components/ui/empty";

export default async function PortalSales() {
  const user = await requireVendorUser();
  const items = await db.orderItem.findMany({
    where: { vendorId: user.vendorId, order: { status: { in: ["PAID", "REFUNDED"] } } },
    include: { order: { select: { id: true, number: true, paidAt: true, status: true, name: true, addressLine: true, postalCode: true, city: true } } },
    orderBy: { order: { paidAt: "desc" } },
  });
  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-3xl font-semibold">Verkäufe</h1><p className="text-ink-2">Jeder bezahlte Verkauf einzeln, mit dem Betrag, der zu dir kommt.</p></div>
      {items.length === 0 ? <Empty title="Noch keine Verkäufe" text="Sobald jemand eines deiner Produkte bezahlt hat, steht es hier." /> : (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th className="nowrap">Bezahlt am</th><th className="nowrap">Bestellung</th><th>Produkt</th><th>Stück</th><th className="nowrap">Verkaufspreis</th><th className="nowrap">Kommt zu dir</th><th>Versand</th><th>Auszahlung</th></tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="nowrap">{i.order.paidAt?.toLocaleDateString("de-DE") ?? "–"}</td>
                  <td className="nowrap">{i.order.number}</td>
                  <td>{i.title}</td>
                  <td>{i.quantity}</td>
                  <td className="nowrap">{formatCents(i.lineTotalCents)}</td>
                  <td className="nowrap font-semibold">{formatCents(i.vendorNetCents)}<span className="block text-xs text-ink-2 font-normal">nach {i.commissionPercent} % für Versand und Service</span></td>
                  <td className="min-w-[220px]">
                    {i.shippingBy === "VENDOR" && (i.fulfillment === "NEW" || i.fulfillment === "PACKED") ? (
                      <form action={vendorSetFulfillmentAction} className="space-y-2">
                        <input type="hidden" name="itemId" value={i.id} />
                        <input type="hidden" name="fulfillment" value="SHIPPED" />
                        <p className="text-sm">Bitte an {i.order.name}, {i.order.addressLine}, {i.order.postalCode} {i.order.city} schicken.</p>
                        <button className="btn btn-primary btn-sm" type="submit">Als verschickt markieren</button>
                      </form>
                    ) : <span className="text-sm">{fulfillmentText(i.fulfillment, i.shippingBy)}</span>}
                  </td>
                  <td>{i.payoutId ? <span className="badge badge-ok">in Auszahlung</span> : <span className="badge badge-muted">noch offen</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
