import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

// Verkäufe (Positionen) zählen, sobald die Bestellung bezahlt ist; eine spätere Erstattung ändert den
// Status auf REFUNDED, die Position bleibt aber Teil der Buchführung, weil ihr eine Rückbuchung
// gegenübersteht. Nur so stimmt die Summe auch, wenn die Auszahlung schon vor der Rückgabe lief.
const SETTLED: Prisma.OrderWhereInput = { status: { in: ["PAID", "REFUNDED"] } };

/** Offene, bezahlte Positionen eines Händlers, die noch in keiner Auszahlung stecken. */
export async function openItemsForVendor(vendorId: string) {
  return db.orderItem.findMany({
    where: { vendorId, payoutId: null, order: SETTLED },
    include: { order: { select: { number: true, paidAt: true, createdAt: true } } },
    orderBy: { order: { paidAt: "asc" } },
  });
}

/** Offene Rückbuchungen eines Händlers (negative Beträge), noch in keiner Auszahlung. */
export async function openReversalsForVendor(vendorId: string) {
  return db.reversal.findMany({
    where: { vendorId, payoutId: null, order: SETTLED },
    include: { order: { select: { number: true, paidAt: true } }, orderItem: { select: { title: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function vendorPayoutSummary(vendorId: string) {
  const [open, openReversals, payouts] = await Promise.all([
    openItemsForVendor(vendorId),
    openReversalsForVendor(vendorId),
    db.payout.findMany({ where: { vendorId }, orderBy: { createdAt: "desc" }, include: { _count: { select: { items: true, reversals: true } } } }),
  ]);
  const openCents = open.reduce((s, i) => s + i.vendorNetCents, 0) + openReversals.reduce((s, r) => s + r.vendorNetCents, 0);
  const paidCents = payouts.filter((p) => p.status === "PAID").reduce((s, p) => s + p.totalCents, 0);
  return { open, openReversals, openCents, payouts, paidCents };
}

export type OpenPayoutRow = {
  vendor: Awaited<ReturnType<typeof db.vendor.findMany>>[number];
  openCents: number;
  grossCents: number;
  commissionCents: number;
  count: number;
  reversalCount: number;
  reversalCents: number;
};

/** Übersicht für den Admin: je Händler offener Saldo aus Verkäufen und Rückbuchungen. */
export async function openPayoutsOverview(): Promise<OpenPayoutRow[]> {
  const [items, reversals] = await Promise.all([
    db.orderItem.groupBy({ by: ["vendorId"], where: { payoutId: null, order: SETTLED }, _sum: { vendorNetCents: true, lineTotalCents: true, commissionCents: true }, _count: { _all: true } }),
    db.reversal.groupBy({ by: ["vendorId"], where: { payoutId: null, order: SETTLED }, _sum: { vendorNetCents: true, lineTotalCents: true, commissionCents: true }, _count: { _all: true } }),
  ]);
  const ids = [...new Set([...items.map((g) => g.vendorId), ...reversals.map((g) => g.vendorId)])];
  const vendors = await db.vendor.findMany({ where: { id: { in: ids } } });
  const byId = new Map(vendors.map((v) => [v.id, v]));
  const rev = new Map(reversals.map((g) => [g.vendorId, g]));
  const rows: OpenPayoutRow[] = ids.map((vendorId) => {
    const g = items.find((i) => i.vendorId === vendorId);
    const r = rev.get(vendorId);
    return {
      vendor: byId.get(vendorId)!,
      openCents: (g?._sum.vendorNetCents ?? 0) + (r?._sum.vendorNetCents ?? 0),
      grossCents: (g?._sum.lineTotalCents ?? 0) + (r?._sum.lineTotalCents ?? 0),
      commissionCents: (g?._sum.commissionCents ?? 0) + (r?._sum.commissionCents ?? 0),
      count: g?._count._all ?? 0,
      reversalCount: r?._count._all ?? 0,
      reversalCents: r?._sum.vendorNetCents ?? 0,
    };
  });
  return rows.sort((a, b) => b.openCents - a.openCents);
}

/**
 * Fasst alle offenen Positionen und Rückbuchungen eines Händlers zu einer Auszahlung zusammen.
 * Saldo > 0: Entwurf, der nach der Überweisung abgehakt wird. Saldo = 0: sofort als verrechnet abgeschlossen,
 * es fließt kein Geld. Saldo < 0: keine Auszahlung; die Rückbuchungen warten auf künftige Verkäufe.
 */
export async function createPayoutDraft(vendorId: string, note = "") {
  const vendor = await db.vendor.findUniqueOrThrow({ where: { id: vendorId }, select: { payoutIban: true, name: true } });
  return db.$transaction(async (tx) => {
    const [items, reversals] = await Promise.all([
      tx.orderItem.findMany({ where: { vendorId, payoutId: null, order: SETTLED }, select: { id: true, vendorNetCents: true } }),
      tx.reversal.findMany({ where: { vendorId, payoutId: null, order: SETTLED }, select: { id: true, vendorNetCents: true } }),
    ]);
    if (items.length === 0 && reversals.length === 0) throw new Error("Keine offenen Positionen für diesen Händler.");
    const totalCents = items.reduce((s, i) => s + i.vendorNetCents, 0) + reversals.reduce((s, r) => s + r.vendorNetCents, 0);
    if (totalCents < 0) throw new Error(`Der Saldo von ${vendor.name} ist negativ. Die Rückbuchungen werden mit den nächsten Verkäufen verrechnet.`);
    if (totalCents > 0 && !vendor.payoutIban) throw new Error(`Für ${vendor.name} fehlt die Bankverbindung. Erst eintragen, dann auszahlen.`);
    const settled = totalCents === 0;
    const payout = await tx.payout.create({
      data: {
        vendorId,
        note,
        totalCents,
        itemCount: items.length,
        status: settled ? "PAID" : "DRAFT",
        paidAt: settled ? new Date() : null,
        reference: settled ? "Verrechnet, keine Überweisung nötig" : "",
      },
    });
    if (items.length) await tx.orderItem.updateMany({ where: { id: { in: items.map((i) => i.id) } }, data: { payoutId: payout.id } });
    if (reversals.length) await tx.reversal.updateMany({ where: { id: { in: reversals.map((r) => r.id) } }, data: { payoutId: payout.id } });
    return payout;
  });
}

export async function markPayoutPaid(payoutId: string, reference: string) {
  const payout = await db.payout.findUniqueOrThrow({ where: { id: payoutId }, include: { vendor: { select: { payoutIban: true, name: true } } } });
  if (!payout.vendor.payoutIban) throw new Error(`Für ${payout.vendor.name} fehlt die Bankverbindung. Ohne sie kann nichts überwiesen worden sein.`);
  return db.payout.update({ where: { id: payoutId }, data: { status: "PAID", paidAt: new Date(), reference } });
}

/** Löst einen Entwurf wieder auf; Positionen und Rückbuchungen werden wieder offen. */
export async function deletePayoutDraft(payoutId: string) {
  return db.$transaction(async (tx) => {
    const payout = await tx.payout.findUnique({ where: { id: payoutId } });
    if (!payout || payout.status !== "DRAFT") throw new Error("Nur Entwürfe können aufgelöst werden.");
    await tx.orderItem.updateMany({ where: { payoutId }, data: { payoutId: null } });
    await tx.reversal.updateMany({ where: { payoutId }, data: { payoutId: null } });
    await tx.payout.delete({ where: { id: payoutId } });
  });
}

export async function getPayoutWithItems(payoutId: string) {
  return db.payout.findUnique({
    where: { id: payoutId },
    include: {
      vendor: true,
      items: { include: { order: { select: { number: true, paidAt: true } } }, orderBy: { id: "asc" } },
      reversals: { include: { order: { select: { number: true } }, orderItem: { select: { title: true, sku: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
}
