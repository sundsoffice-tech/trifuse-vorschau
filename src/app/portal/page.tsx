import Link from "next/link";
import { requireVendorUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { vendorPayoutSummary } from "@/modules/payouts/service";
import { getSetting } from "@/lib/settings";
import { formatCents } from "@/lib/money";
import { Stat } from "@/components/ui/stat";
import { Alert } from "@/components/ui/alert";
import { fulfillmentText, formatPayoutDate } from "@/modules/orders/texts";

export default async function PortalHome() {
  const user = await requireVendorUser();
  const vendor = await db.vendor.findUniqueOrThrow({ where: { id: user.vendorId } });
  const [counts, sold, payout, latest, schedule] = await Promise.all([
    db.product.groupBy({ by: ["status"], where: { vendorId: vendor.id }, _count: { _all: true } }),
    db.orderItem.aggregate({ where: { vendorId: vendor.id, order: { status: "PAID" } }, _sum: { lineTotalCents: true, vendorNetCents: true, quantity: true } }),
    vendorPayoutSummary(vendor.id),
    db.orderItem.findMany({ where: { vendorId: vendor.id, order: { status: "PAID" } }, include: { order: { select: { number: true, paidAt: true } } }, orderBy: { order: { paidAt: "desc" } }, take: 5 }),
    getSetting("payout_schedule"),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const pending = count("PENDING");
  const produkte = counts.reduce((n, c) => n + c._count._all, 0);
  const schritte = [
    { fertig: produkte > 0, text: "Erstes Produkt anlegen", hinweis: "Mit Foto, Preis und Art. Wir schalten frei.", href: "/portal/produkte/neu" },
    { fertig: Boolean(vendor.payoutIban), text: "Bankverbindung eintragen", hinweis: "Sonst können wir nicht überweisen.", href: "/portal/einstellungen#bank" },
    { fertig: Boolean(vendor.description && vendor.city), text: "Erzählen, wer du bist", hinweis: "Ort und zwei Sätze zu deiner Arbeit; stehen bei jedem Produkt.", href: "/portal/einstellungen" },
  ];
  const offen = schritte.filter((s) => !s.fertig).length;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Hallo {user.name.split(" ")[0]}</h1>
        <p className="text-ink-2">So läuft es gerade bei {vendor.name}.</p>
      </div>
      {vendor.status === "PENDING" ? <Alert tone="warn">Deine Bewerbung wird noch geprüft. Du kannst dich schon umsehen, aber noch nichts in den Shop stellen.</Alert> : null}
      {vendor.status === "ACTIVE" && offen > 0 ? (
        <section className="card p-5">
          <h2 className="font-semibold text-lg">Erste Schritte</h2>
          <p className="text-sm text-ink-2 mt-1">{offen === 1 ? "Noch ein Schritt, dann läuft alles." : `Noch ${offen} Schritte, dann läuft alles.`} In zehn Minuten erledigt.</p>
          <ol className="mt-4 space-y-3">
            {schritte.map((s, i) => (
              <li key={s.text} className="flex items-start gap-3">
                <span className={`mt-0.5 inline-flex w-6 h-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.fertig ? "bg-ok-soft text-ok" : "bg-accent-soft text-accent-text"}`} aria-hidden="true">{s.fertig ? "✓" : i + 1}</span>
                <div className="min-w-0">
                  {s.fertig ? <p className="font-semibold text-ink-2 line-through">{s.text}</p> : <Link href={s.href} className="font-semibold underline-offset-4 hover:underline">{s.text}</Link>}
                  {!s.fertig ? <p className="text-sm text-ink-2">{s.hinweis}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {vendor.status === "ACTIVE" && offen === 0 && !vendor.payoutIban ? <Alert tone="warn">Damit wir dir dein Geld überweisen können, fehlt noch deine Bankverbindung. <Link href="/portal/einstellungen#bank" className="underline font-semibold">Jetzt eintragen</Link></Alert> : null}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Im Shop sichtbar" value={String(count("ACTIVE"))} hint={pending ? `${pending} ${pending === 1 ? "wartet" : "warten"} auf Freigabe` : undefined} />
        <Stat label="Verkauft" value={`${sold._sum.quantity ?? 0} Stück`} hint={`für ${formatCents(sold._sum.lineTotalCents ?? 0)} insgesamt`} />
        <Stat label="Schon überwiesen" value={formatCents(payout.paidCents)} hint={`${Math.round(100 - vendor.commissionPercent)} % jedes Verkaufs kommen zu dir`} />
        <Stat label="Nächste Auszahlung" value={formatCents(payout.openCents)} hint={formatPayoutDate(schedule)} />
      </div>
      <Link href="/portal/produkte/neu" className="btn btn-primary">Neues Produkt</Link>
      <section className="card">
        <div className="p-4 border-b border-line flex items-center justify-between"><h2 className="font-semibold">Letzte Verkäufe</h2><Link href="/portal/bestellungen" className="text-sm text-accent-text font-semibold">Alle</Link></div>
        {latest.length ? (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Bestellung</th><th>Produkt</th><th>Stück</th><th>Kommt zu dir</th><th>Versand</th></tr></thead>
            <tbody>{latest.map((i) => <tr key={i.id}><td className="nowrap">{i.order.number}</td><td>{i.title}</td><td>{i.quantity}</td><td className="nowrap">{formatCents(i.vendorNetCents)}</td><td>{fulfillmentText(i.fulfillment, i.shippingBy)}</td></tr>)}</tbody>
          </table></div>
        ) : <p className="p-4 text-sm text-ink-2">Noch keine Verkäufe. Sobald jemand eines deiner Produkte kauft, steht es hier.</p>}
      </section>
    </div>
  );
}
