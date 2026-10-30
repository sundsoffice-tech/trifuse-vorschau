import { db } from "@/lib/db";
import { requireAdmin } from "@/modules/auth/session";
import { buildCsv, csvEuro } from "@/lib/csv";
import { reversalReasonText } from "@/modules/orders/texts";

function parseDate(v: string | null, fallback: Date): Date {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return fallback;
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

/**
 * Buchhaltungs-Export als CSV.
 *  art=positionen   jede bezahlte Position und jede Rückbuchung im Zeitraum (Umsatz, Provision, Macheranteil)
 *  art=auszahlungen jede Auszahlung im Zeitraum (Datum, Macher, Betrag, Verwendungszweck, Stand)
 * Zeitraum: von=JJJJ-MM-TT&bis=JJJJ-MM-TT (bis einschließlich), Standard: der laufende Monat.
 */
export async function GET(req: Request) {
  await requireAdmin();
  const u = new URL(req.url);
  const now = new Date();
  const from = parseDate(u.searchParams.get("von"), new Date(now.getFullYear(), now.getMonth(), 1));
  const toInclusive = parseDate(u.searchParams.get("bis"), new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const to = new Date(toInclusive.getTime() + 24 * 60 * 60 * 1000);
  const art = u.searchParams.get("art") === "auszahlungen" ? "auszahlungen" : "positionen";
  const stamp = `${from.toISOString().slice(0, 10)}_${toInclusive.toISOString().slice(0, 10)}`;

  let csv: string;
  if (art === "auszahlungen") {
    const payouts = await db.payout.findMany({ where: { createdAt: { gte: from, lt: to } }, include: { vendor: { select: { name: true, payoutIban: true, payoutHolder: true } }, _count: { select: { items: true, reversals: true } } }, orderBy: { createdAt: "asc" } });
    csv = buildCsv(
      ["Erstellt", "Überwiesen am", "Macher", "Kontoinhaber", "IBAN", "Verkäufe", "Rückbuchungen", "Betrag EUR", "Stand", "Verwendungszweck", "Auszahlungs-ID", "SEPA-Datei am"],
      payouts.map((p) => [p.createdAt, p.paidAt, p.vendor.name, p.vendor.payoutHolder, p.vendor.payoutIban, p._count.items, p._count.reversals, csvEuro(p.totalCents), p.status === "PAID" ? (p.totalCents === 0 ? "verrechnet" : "überwiesen") : "Entwurf", p.reference, p.id, p.sepaExportedAt]),
    );
  } else {
    const [items, reversals] = await Promise.all([
      db.orderItem.findMany({ where: { order: { status: { in: ["PAID", "REFUNDED"] }, paidAt: { gte: from, lt: to } } }, include: { order: { select: { number: true, paidAt: true, paymentProvider: true, paymentRef: true } }, vendor: { select: { name: true } }, payout: { select: { id: true, paidAt: true, reference: true } } }, orderBy: { order: { paidAt: "asc" } } }),
      db.reversal.findMany({ where: { createdAt: { gte: from, lt: to } }, include: { order: { select: { number: true } }, orderItem: { select: { title: true, sku: true } }, vendor: { select: { name: true } }, payout: { select: { id: true, paidAt: true, reference: true } } }, orderBy: { createdAt: "asc" } }),
    ]);
    const header = ["Datum", "Art", "Bestellung", "Macher", "Produkt", "Artikelnummer", "Stück", "Verkaufspreis EUR", "Provision %", "Provision EUR", "Macheranteil EUR", "Zahlungsdienst", "Zahlungskennung", "Auszahlungs-ID", "Auszahlung am", "Verwendungszweck"];
    const rows = [
      ...items.map((i) => [i.order.paidAt, "Verkauf", i.order.number, i.vendor.name, i.title, i.sku, i.quantity, csvEuro(i.lineTotalCents), String(i.commissionPercent).replace(".", ","), csvEuro(i.commissionCents), csvEuro(i.vendorNetCents), i.order.paymentProvider, i.order.paymentRef ?? "", i.payout?.id ?? "", i.payout?.paidAt ?? null, i.payout?.reference ?? ""]),
      ...reversals.map((r) => [r.createdAt, reversalReasonText(r.reason), r.order.number, r.vendor.name, r.orderItem.title, r.orderItem.sku, r.quantity, csvEuro(r.lineTotalCents), "", csvEuro(r.commissionCents), csvEuro(r.vendorNetCents), r.refundRef ? "Rückzahlung" : "", r.refundRef ?? "", r.payout?.id ?? "", r.payout?.paidAt ?? null, r.payout?.reference ?? ""]),
    ].sort((a, b) => ((a[0] as Date | null)?.getTime() ?? 0) - ((b[0] as Date | null)?.getTime() ?? 0));
    csv = buildCsv(header, rows);
  }
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${art}-${stamp}.csv"`, "Cache-Control": "no-store" },
  });
}
