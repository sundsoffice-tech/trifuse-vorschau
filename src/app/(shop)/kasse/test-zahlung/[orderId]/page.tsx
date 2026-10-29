import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { paymentsMode } from "@/modules/payments";
import { simulatePaymentAction } from "@/modules/orders/actions";
import { formatCents } from "@/lib/money";
import { Alert } from "@/components/ui/alert";

export default async function TestPaymentPage({ params }: { params: Promise<{ orderId: string }> }) {
  if (paymentsMode() !== "test") notFound();
  const order = await db.order.findUnique({ where: { id: (await params).orderId } });
  if (!order) notFound();
  if (order.status !== "PENDING") redirect(`/bestellung/${order.id}`);
  return (
    <div className="container-x py-12 max-w-lg">
      <div className="card p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.15em] text-warn font-semibold">Testkasse</p>
        <h1 className="font-display text-3xl font-semibold mt-1">Zahlung simulieren</h1>
        <div className="mt-4"><Alert tone="warn">Es fliesst kein Geld. Dieser Schritt ersetzt die echte Kasse, solange der Shop im Testmodus läuft.</Alert></div>
        <dl className="mt-5 text-sm space-y-1">
          <div className="flex justify-between"><dt className="text-ink-2">Bestellung</dt><dd>{order.number}</dd></div>
          <div className="flex justify-between font-semibold"><dt>Betrag</dt><dd>{formatCents(order.totalCents)}</dd></div>
        </dl>
        <form action={simulatePaymentAction} className="mt-6 flex flex-col gap-3">
          <input type="hidden" name="orderId" value={order.id} />
          <button className="btn btn-primary" name="result" value="paid" type="submit">Zahlung erfolgreich</button>
          <button className="btn btn-secondary" name="result" value="cancel" type="submit">Zahlung abbrechen</button>
        </form>
      </div>
    </div>
  );
}
