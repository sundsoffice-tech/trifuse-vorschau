import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayoutWithItems } from "@/modules/payouts/service";
import { markPayoutPaidAction, deletePayoutDraftAction } from "@/modules/payouts/actions";
import { formatCents } from "@/lib/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { BRAND } from "@/lib/brand";
import { PrintButton } from "@/components/ui/print-button";

export default async function AdminPayoutDetail({ params }: { params: Promise<{ id: string }> }) {
  const payout = await getPayoutWithItems((await params).id);
  if (!payout) notFound();
  const gross = payout.items.reduce((s, i) => s + i.lineTotalCents, 0);
  const commission = payout.items.reduce((s, i) => s + i.commissionCents, 0);
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="print:hidden">
        <Link href="/admin/auszahlungen" className="text-sm text-ink-3">← Auszahlungen</Link>
        <div className="flex flex-wrap items-center gap-3 mt-1"><h1 className="font-display text-3xl font-semibold">Auszahlung an {payout.vendor.name}</h1><StatusBadge status={payout.status} kind="payout" /></div>
      </div>
      <section className="card p-5 md:p-6">
        <div className="flex flex-wrap justify-between gap-4 text-sm">
          <div>
            <p className="font-display text-xl font-semibold">{BRAND.name} · Auszahlungsabrechnung</p>
            <p className="text-ink-2">Erstellt am {payout.createdAt.toLocaleDateString("de-DE")}{payout.paidAt ? ` · überwiesen am ${payout.paidAt.toLocaleDateString("de-DE")}` : ""}</p>
            {payout.reference ? <p className="text-ink-2">Referenz: {payout.reference}</p> : null}
          </div>
          <div className="text-right">
            <p className="font-semibold">{payout.vendor.name}</p>
            <p className="text-ink-2">{payout.vendor.payoutHolder || "Kontoinhaber fehlt"}</p>
            <p className="font-mono text-ink-2">{payout.vendor.payoutIban || "IBAN fehlt"}</p>
          </div>
        </div>
        <div className="table-wrap mt-5"><table className="table">
          <thead><tr><th>Bezahlt</th><th>Bestellung</th><th>Produkt</th><th>Menge</th><th>Brutto</th><th>Provision</th><th>Anteil</th></tr></thead>
          <tbody>{payout.items.map((i) => <tr key={i.id}><td>{i.order.paidAt?.toLocaleDateString("de-DE")}</td><td>{i.order.number}</td><td>{i.title}{i.sku ? <span className="block text-xs text-ink-3">{i.sku}</span> : null}</td><td>{i.quantity}</td><td>{formatCents(i.lineTotalCents)}</td><td className="text-ink-3">{i.commissionPercent} % · {formatCents(i.commissionCents)}</td><td>{formatCents(i.vendorNetCents)}</td></tr>)}</tbody>
          <tfoot><tr><td colSpan={4} className="font-semibold">Summe</td><td>{formatCents(gross)}</td><td className="text-ink-3">{formatCents(commission)}</td><td className="font-semibold">{formatCents(payout.totalCents)}</td></tr></tfoot>
        </table></div>
        {payout.note ? <p className="text-sm text-ink-2 mt-4">Notiz: {payout.note}</p> : null}
      </section>
      <section className="card p-5 flex flex-wrap items-center gap-4 print:hidden">
        {payout.status === "DRAFT" ? (
          <>
            <form action={markPayoutPaidAction} className="flex flex-wrap items-center gap-2"><input type="hidden" name="payoutId" value={payout.id} /><input name="reference" placeholder="Verwendungszweck / Referenz" className="input !min-h-[40px] w-64" /><button className="btn btn-primary" type="submit">Als überwiesen markieren</button></form>
            <form action={deletePayoutDraftAction}><input type="hidden" name="payoutId" value={payout.id} /><button className="btn btn-ghost text-bad" type="submit">Entwurf auflösen</button></form>
          </>
        ) : <p className="text-sm text-ok">Diese Auszahlung ist abgeschlossen.</p>}
        <PrintButton className="btn btn-secondary ml-auto" />
      </section>
    </div>
  );
}
