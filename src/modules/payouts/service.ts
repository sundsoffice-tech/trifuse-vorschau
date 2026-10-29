import "server-only";
import { db } from "@/lib/db";

/** Offene, bezahlte Positionen eines Händlers, die noch in keiner Auszahlung stecken. */
export async function openItemsForVendor(vendorId: string) {
  return db.orderItem.findMany({
    where: { vendorId, payoutId: null, order: { status: "PAID" } },
    include: { order: { select: { number: true, paidAt: true, createdAt: true } } },
    orderBy: { order: { paidAt: "asc" } },
  });
}

export async function vendorPayoutSummary(vendorId: string) {
  const [open, payouts] = await Promise.all([
    openItemsForVendor(vendorId),
    db.payout.findMany({ where: { vendorId }, orderBy: { createdAt: "desc" }, include: { _count: { select: { items: true } } } }),
  ]);
  const openCents = open.reduce((s, i) => s + i.vendorNetCents, 0);
  const paidCents = payouts.filter((p) => p.status === "PAID").reduce((s, p) => s + p.totalCents, 0);
  return { open, openCents, payouts, paidCents };
}

/** Übersicht für den Admin: je Händler offener Betrag und Anzahl Positionen. */
export async function openPayoutsOverview() {
  const grouped = await db.orderItem.groupBy({
    by: ["vendorId"],
    where: { payoutId: null, order: { status: "PAID" } },
    _sum: { vendorNetCents: true, lineTotalCents: true, commissionCents: true },
    _count: { _all: true },
  });
  const vendors = await db.vendor.findMany({ where: { id: { in: grouped.map((g) => g.vendorId) } } });
  const byId = new Map(vendors.map((v) => [v.id, v]));
  return grouped
    .map((g) => ({
      vendor: byId.get(g.vendorId)!,
      openCents: g._sum.vendorNetCents ?? 0,
      grossCents: g._sum.lineTotalCents ?? 0,
      commissionCents: g._sum.commissionCents ?? 0,
      count: g._count._all,
    }))
    .sort((a, b) => b.openCents - a.openCents);
}

/** Fasst alle offenen Positionen eines Händlers zu einem Auszahlungsentwurf zusammen. */
export async function createPayoutDraft(vendorId: string, note = "") {
  return db.$transaction(async (tx) => {
    const items = await tx.orderItem.findMany({ where: { vendorId, payoutId: null, order: { status: "PAID" } }, select: { id: true, vendorNetCents: true } });
    if (items.length === 0) throw new Error("Keine offenen Positionen für diesen Händler.");
    const payout = await tx.payout.create({
      data: { vendorId, note, totalCents: items.reduce((s, i) => s + i.vendorNetCents, 0), itemCount: items.length },
    });
    await tx.orderItem.updateMany({ where: { id: { in: items.map((i) => i.id) } }, data: { payoutId: payout.id } });
    return payout;
  });
}

export async function markPayoutPaid(payoutId: string, reference: string) {
  return db.payout.update({ where: { id: payoutId }, data: { status: "PAID", paidAt: new Date(), reference } });
}

/** Löst einen Entwurf wieder auf; die Positionen werden wieder offen. */
export async function deletePayoutDraft(payoutId: string) {
  return db.$transaction(async (tx) => {
    const payout = await tx.payout.findUnique({ where: { id: payoutId } });
    if (!payout || payout.status !== "DRAFT") throw new Error("Nur Entwürfe können aufgelöst werden.");
    await tx.orderItem.updateMany({ where: { payoutId }, data: { payoutId: null } });
    await tx.payout.delete({ where: { id: payoutId } });
  });
}

export async function getPayoutWithItems(payoutId: string) {
  return db.payout.findUnique({
    where: { id: payoutId },
    include: { vendor: true, items: { include: { order: { select: { number: true, paidAt: true } } }, orderBy: { id: "asc" } } },
  });
}
