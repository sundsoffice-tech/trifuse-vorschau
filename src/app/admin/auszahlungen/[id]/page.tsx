import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayoutWithItems } from "@/modules/payouts/service";
import { markPayoutPaidAction, deletePayoutDraftAction } from "@/modules/payouts/actions";
import { formatCents } from "@/lib/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { Alert } from "@/components/ui/alert";
import { PrintButton } from "@/components/ui/print-button";

export default async function AdminPayoutDetail({ params }: { params: Promise<{ id: string }> }) {
  const payout = await getPayoutWithItems((await params).id);
  if (!payout) notFound();
  const gross = payout.items.reduce((s, i) => s + i.lineTotalCents, 0);
  const commission = payout.items.reduce((s, i) => s + i.commissionCents, 0);
  const hasBank = Boolean(payout.vendor.payoutIban);
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="print:hidden">
        <Link href="/admin/auszahlungen" className="text-sm text-ink-2 hover:underline">← Auszahlungen</Link>
        <div className="flex flex-wrap items-center gap-3 mt-1"><h1 className="font-display text-3xl font-semibold">Auszahlung an {payout.vendor.name}</h1><StatusBadge status={payout.status} kind="payout" /></div>
      </div>
      {!hasBank && payout.status === "DRAFT" ? <Alert tone="warn">Für {payout.vendor.name} fehlt die Bankverbindung. Überweisen geht erst, wenn sie da ist: <Link href={`/admin/haendler/${payout.vendorId}`} className="underline font-semibold">beim Macher eintragen</Link>.</Alert> : null}
      <section className="card p-5 md:p-6">
        <div className="flex flex-wrap justify-between gap-4 text-sm">
          <div>
            <p className="font-display text-xl font-semibold">trifuse.store · Auszahlungsabrechnung</p>
            <p className="text-ink-2">Erstellt am {payout.createdAt.toLocaleDateString("de-DE")}{payout.paidAt ? `, überwiesen am ${payout.paidAt.toLocaleDateString("de-DE")}` : ""}</p>
            {payout.reference ? <p className="text-ink-2">Verwendungszweck: {payout.reference}</p> : null}
          </div>
          <div className="text-right">
            <p className="font-semibold">{payout.vendor.name}</p>
            <p className="text-ink-2">{payout.vendor.payoutHolder || "Kontoinhaber fehlt"}</p>
            <p className="text-ink-2 num">{payout.vendor.payoutIban || "IBAN fehlt"}</p>
          </div>
        </div>
        <div className="table-wrap mt-5"><table className="table">
          <thead><tr><th className="nowrap">Bezahlt am</th><th className="nowrap">Bestellung</th><th>Produkt</th><th>Stück</th><th className="nowrap">Verkaufspreis</th><th className="nowrap">Unser Anteil</th><th className="nowrap">An den Macher</th></tr></thead>
          <tbody>{payout.items.map((i) => <tr key={i.id}><td className="nowrap">{i.order.paidAt?.toLocaleDateString("de-DE")}</td><td className="nowrap">{i.order.number}</td><td>{i.title}{i.sku ? <span className="block text-xs text-ink-2 num">{i.sku}</span> : null}</td><td>{i.quantity}</td><td className="nowrap">{formatCents(i.lineTotalCents)}</td><td className="nowrap text-ink-2">{formatCents(i.commissionCents)} ({i.commissionPercent} %)</td><td className="nowrap">{formatCents(i.vendorNetCents)}</td></tr>)}</tbody>
          <tfoot><tr><td colSpan={4} className="font-semibold">Summe</td><td className="nowrap">{formatCents(gross)}</td><td className="nowrap text-ink-2">{formatCents(commission)}</td><td className="nowrap font-semibold">{formatCents(payout.totalCents)}</td></tr></tfoot>
        </table></div>
        {payout.note ? <p className="text-sm text-ink-2 mt-4">Notiz: {payout.note}</p> : null}
      </section>
      <section className="card p-5 flex flex-wrap items-center gap-4 print:hidden">
        {payout.status === "DRAFT" ? (
          <>
            <form action={markPayoutPaidAction} className="flex flex-wrap items-center gap-2"><input type="hidden" name="payoutId" value={payout.id} /><input name="reference" placeholder="Verwendungszweck der Überweisung" className="input !min-h-[40px] w-64" disabled={!hasBank} /><button className="btn btn-primary" type="submit" disabled={!hasBank} title={hasBank ? undefined : "Erst möglich, wenn die Bankverbindung eingetragen ist"}>Als überwiesen markieren</button></form>
            <form action={deletePayoutDraftAction}><input type="hidden" name="payoutId" value={payout.id} /><button className="btn btn-ghost text-bad" type="submit">Entwurf verwerfen</button></form>
          </>
        ) : <p className="text-sm text-ok">Diese Auszahlung ist überwiesen.</p>}
        <PrintButton className="btn btn-secondary ml-auto" />
      </section>
    </div>
  );
}
