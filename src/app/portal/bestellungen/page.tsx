import { requireVendorUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { vendorSetFulfillmentAction } from "@/modules/catalog/vendor-actions";
import { formatCents } from "@/lib/money";
import { StatusBadge } from "@/components/ui/status-badge";
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
      <div><h1 className="font-display text-3xl font-semibold">Verkäufe</h1><p className="text-ink-2">Jede bezahlte Position einzeln, mit deinem Anteil nach Provision.</p></div>
      {items.length === 0 ? <Empty title="Noch keine Verkäufe" text="Sobald ein Kunde eines deiner Produkte bezahlt hat, steht es hier." /> : (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Datum</th><th>Bestellung</th><th>Produkt</th><th>Menge</th><th>Brutto</th><th>Provision</th><th>Dein Anteil</th><th>Versand</th><th>Auszahlung</th></tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="whitespace-nowrap">{i.order.paidAt?.toLocaleDateString("de-DE") ?? "–"}</td>
                  <td>{i.order.number}</td>
                  <td>{i.title}{i.sku ? <span className="block text-xs text-ink-3">{i.sku}</span> : null}</td>
                  <td>{i.quantity}</td>
                  <td>{formatCents(i.lineTotalCents)}</td>
                  <td className="text-ink-3">{i.commissionPercent} % · {formatCents(i.commissionCents)}</td>
                  <td className="font-semibold">{formatCents(i.vendorNetCents)}</td>
                  <td>
                    {i.shippingBy === "VENDOR" ? (
                      <form action={vendorSetFulfillmentAction} className="flex items-center gap-1">
                        <input type="hidden" name="itemId" value={i.id} />
                        <select name="fulfillment" defaultValue={i.fulfillment} className="select !min-h-[36px] !py-1 !w-auto text-sm">
                          <option value="NEW">Neu</option><option value="PACKED">Gepackt</option><option value="SHIPPED">Versendet</option><option value="DELIVERED">Zugestellt</option>
                        </select>
                        <button className="btn btn-ghost btn-sm" type="submit">OK</button>
                        <details className="text-xs"><summary className="cursor-pointer text-ink-3">Adresse</summary><p>{i.order.name}<br />{i.order.addressLine}<br />{i.order.postalCode} {i.order.city}</p></details>
                      </form>
                    ) : <span className="flex items-center gap-2"><StatusBadge status={i.fulfillment} /><span className="text-xs text-ink-3">Lager</span></span>}
                  </td>
                  <td>{i.payoutId ? <span className="badge badge-ok">in Auszahlung</span> : <span className="badge badge-muted">offen</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
