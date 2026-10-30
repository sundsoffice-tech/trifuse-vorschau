import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayoutWithItems } from "@/modules/payouts/service";
import { markPayoutPaidAction, deletePayoutDraftAction } from "@/modules/payouts/actions";
import { formatCents } from "@/lib/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { Alert } from "@/components/ui/alert";
import { PrintButton } from "@/components/ui/print-button";
import { formatIban } from "@/lib/text";
import { reversalReasonText } from "@/modules/orders/texts";

export default async function AdminPayoutDetail({ params }: { params: Promise<{ id: string }> }) {
  const payout = await getPayoutWithItems((await params).id);
  if (!payout) notFound();
  const gross = payout.items.reduce((s, i) => s + i.lineTotalCents, 0) + payout.reversals.reduce((s, r) => s + r.lineTotalCents, 0);
  const commission = payout.items.reduce((s, i) => s + i.commissionCents, 0) + payout.reversals.reduce((s, r) => s + r.commissionCents, 0);
  const salesNet = payout.items.reduce((s, i) => s + i.vendorNetCents, 0);
  const reversalNet = payout.reversals.reduce((s, r) => s + r.vendorNetCents, 0);
  const settledOnly = payout.status === "PAID" && payout.totalCents === 0;
  const hasBank = Boolean(payout.vendor.payoutIban);
  const monat = payout.createdAt.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  const zweck = `Auszahlung ${monat}, ${payout.vendor.name}`;
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="print:hidden">
        <Link href="/admin/auszahlungen" className="text-sm text-ink-2 hover:underline">← Auszahlungen</Link>
        <div className="flex flex-wrap items-center gap-3 mt-1"><h1 className="font-display text-3xl font-semibold">Auszahlung an {payout.vendor.name}</h1>{settledOnly ? <span className="badge badge-muted">Verrechnet</span> : <StatusBadge status={payout.status} kind="payout" />}</div>
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
            <p className="text-ink-2 num">{payout.vendor.payoutIban ? formatIban(payout.vendor.payoutIban) : "IBAN fehlt"}</p>
          </div>
        </div>
        <div className="table-wrap mt-5"><table className="table">
          <thead><tr><th className="nowrap">Bezahlt am</th><th className="nowrap">Bestellung</th><th>Produkt</th><th>Stück</th><th className="nowrap">Verkaufspreis</th><th className="nowrap">Unser Anteil</th><th className="nowrap">An den Macher</th></tr></thead>
          <tbody>{payout.items.map((i) => <tr key={i.id}><td className="nowrap">{i.order.paidAt?.toLocaleDateString("de-DE")}</td><td className="nowrap">{i.order.number}</td><td>{i.title}{i.sku ? <span className="block text-xs text-ink-2 num">{i.sku}</span> : null}</td><td>{i.quantity}</td><td className="nowrap">{formatCents(i.lineTotalCents)}</td><td className="nowrap text-ink-2">{formatCents(i.commissionCents)} ({i.commissionPercent} %)</td><td className="nowrap">{formatCents(i.vendorNetCents)}</td></tr>)}</tbody>
          {payout.reversals.length > 0 ? (
            <>
              <tbody><tr><td colSpan={7} className="font-semibold pt-4">Rückbuchungen (Rückgaben, Erstattungen, Kulanz)</td></tr></tbody>
              <tbody>{payout.reversals.map((r) => <tr key={r.id}><td className="nowrap">{r.createdAt.toLocaleDateString("de-DE")}</td><td className="nowrap">{r.order.number}</td><td>{r.orderItem.title}<span className="block text-xs text-ink-2">{reversalReasonText(r.reason)}{r.note ? `, ${r.note}` : ""}</span></td><td>{r.quantity}</td><td className="nowrap text-bad">{formatCents(r.lineTotalCents)}</td><td className="nowrap text-ink-2">{formatCents(r.commissionCents)}</td><td className="nowrap text-bad">{formatCents(r.vendorNetCents)}</td></tr>)}</tbody>
            </>
          ) : null}
          <tfoot>
            {payout.reversals.length > 0 ? <><tr><td colSpan={6} className="text-ink-2">Verkäufe</td><td className="nowrap">{formatCents(salesNet)}</td></tr><tr><td colSpan={6} className="text-ink-2">Rückbuchungen</td><td className="nowrap text-bad">{formatCents(reversalNet)}</td></tr></> : null}
            <tr><td colSpan={4} className="font-semibold">Summe</td><td className="nowrap">{formatCents(gross)}</td><td className="nowrap text-ink-2">{formatCents(commission)}</td><td className="nowrap font-semibold">{formatCents(payout.totalCents)}</td></tr>
          </tfoot>
        </table></div>
        {payout.note ? <p className="text-sm text-ink-2 mt-4">Notiz: {payout.note}</p> : null}
      </section>
      <section className="card p-5 print:hidden space-y-4">
        {payout.status === "DRAFT" ? (
          <form action={markPayoutPaidAction} className="space-y-3">
            <input type="hidden" name="payoutId" value={payout.id} />
            <div><label className="label" htmlFor="reference">Verwendungszweck der Überweisung</label><input id="reference" name="reference" defaultValue={zweck} className="input max-w-lg" required disabled={!hasBank} /></div>
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn btn-primary" type="submit" disabled={!hasBank} title={hasBank ? undefined : "Erst möglich, wenn die Bankverbindung eingetragen ist"}>Als überwiesen markieren</button>
              <PrintButton className="btn btn-secondary" />
            </div>
          </form>
        ) : <div className="flex flex-wrap items-center gap-3"><p className="text-sm text-ok">{settledOnly ? "Verrechnet, es war keine Überweisung nötig." : "Diese Auszahlung ist überwiesen."}</p><PrintButton className="btn btn-secondary ml-auto" /></div>}
        {payout.status === "DRAFT" ? <form action={deletePayoutDraftAction} className="border-t border-line pt-3"><input type="hidden" name="payoutId" value={payout.id} /><button className="btn btn-ghost btn-sm text-bad" type="submit">Entwurf verwerfen, Verkäufe werden wieder offen</button></form> : null}
      </section>
    </div>
  );
}
