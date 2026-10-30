import "server-only";
import { db } from "@/lib/db";
import { reversalAmounts, sumFrozen } from "@/lib/ledger";
import { getPaymentProvider } from "@/modules/payments";
import type { Prisma, ReversalReason } from "@prisma/client";
import { notifyRefund } from "@/modules/mail/notify";

export type ReverseInput = {
  itemId: string;
  quantity: number;
  reason: ReversalReason;
  note?: string;
  /** Ware kommt zurück in den Bestand des Produkts. */
  restock?: boolean;
  /** Geld an den Kunden zurückzahlen (über den Zahlungsdienst der Bestellung). */
  refundMoney?: boolean;
};

/** Bereits zurückgebuchte Mengen und Beträge einer Position, als positive Größen. */
async function reversedSoFar(tx: Prisma.TransactionClient, orderItemId: string) {
  const list = await tx.reversal.findMany({ where: { orderItemId }, select: { quantity: true, lineTotalCents: true, commissionCents: true } });
  return sumFrozen(list.map((r) => ({ quantity: r.quantity, lineTotalCents: -r.lineTotalCents, commissionCents: -r.commissionCents })));
}

/** Setzt den Bestellstatus auf REFUNDED, sobald jede Position vollständig zurückgebucht ist. */
async function settleOrderStatus(tx: Prisma.TransactionClient, orderId: string) {
  const items = await tx.orderItem.findMany({ where: { orderId }, select: { id: true, quantity: true } });
  const reversed = await tx.reversal.groupBy({ by: ["orderItemId"], where: { orderId }, _sum: { quantity: true } });
  const byItem = new Map(reversed.map((r) => [r.orderItemId, r._sum.quantity ?? 0]));
  const complete = items.every((i) => (byItem.get(i.id) ?? 0) >= i.quantity);
  if (complete) await tx.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } });
}

async function createReversalInTx(tx: Prisma.TransactionClient, input: ReverseInput) {
  const item = await tx.orderItem.findUnique({ where: { id: input.itemId }, include: { order: { select: { id: true, status: true } } } });
  if (!item) throw new Error("Position nicht gefunden.");
  if (item.order.status !== "PAID" && item.order.status !== "REFUNDED") throw new Error("Nur bezahlte Bestellungen können zurückgebucht werden.");
  const done = await reversedSoFar(tx, item.id);
  const a = reversalAmounts(item, done, input.quantity);
  const reversal = await tx.reversal.create({
    data: {
      orderId: item.orderId,
      orderItemId: item.id,
      vendorId: item.vendorId,
      quantity: input.quantity,
      lineTotalCents: -a.lineTotalCents,
      commissionCents: -a.commissionCents,
      vendorNetCents: -a.vendorNetCents,
      reason: input.reason,
      note: (input.note ?? "").slice(0, 300),
      restocked: Boolean(input.restock && item.productId),
    },
  });
  if (input.restock && item.productId) await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: input.quantity } } });
  if (input.reason === "RETURN") await tx.orderItem.update({ where: { id: item.id }, data: { fulfillment: "RETURNED" } });
  return { reversal, amountCents: a.lineTotalCents, orderId: item.orderId };
}

/**
 * Zahlt dem Kunden Geld zurück und schreibt die Kennung an die Rückbuchungen. Ein Fehler beim Dienst
 * landet als Text an der Rückbuchung, die Buchführung bleibt trotzdem korrekt; der Admin kann es erneut
 * versuchen. Reihenfolge bewusst: erst Buchung, dann Geld, damit nie Geld ohne Buchung fließt.
 */
async function payRefund(orderId: string, reversalIds: string[], amountCents: number, reason: string) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (amountCents <= 0) return { ok: true as const };
  try {
    let ref: string;
    if (order.paymentProvider === "stripe" || order.paymentProvider === "test") {
      ref = (await getPaymentProvider(order.paymentProvider).refund(order, amountCents, reason)).ref;
    } else {
      ref = "manuell"; // z. B. Überweisung: der Admin bestätigt mit dem Haken, dass er zurückgezahlt hat
    }
    await db.$transaction([
      db.reversal.updateMany({ where: { id: { in: reversalIds } }, data: { refundRef: ref, refundedAt: new Date(), refundError: "" } }),
      db.order.update({ where: { id: orderId }, data: { refundedCents: { increment: amountCents } } }),
    ]);
    await notifyRefund(orderId, amountCents).catch((e) => console.error("Erstattungs-Mail konnte nicht eingereiht werden:", e));
    return { ok: true as const };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    console.error("Rückzahlung fehlgeschlagen:", e);
    await db.reversal.updateMany({ where: { id: { in: reversalIds } }, data: { refundError: message.slice(0, 500) } });
    return { ok: false as const, error: message };
  }
}

/** Bucht eine Stückzahl einer Position zurück; optional Bestand zurück und Geld an den Kunden. */
export async function reverseOrderItem(input: ReverseInput) {
  const created = await db.$transaction(async (tx) => {
    const r = await createReversalInTx(tx, input);
    await settleOrderStatus(tx, r.orderId);
    return r;
  });
  const refund = input.refundMoney ? await payRefund(created.orderId, [created.reversal.id], created.amountCents, input.reason) : { ok: true as const };
  return { reversal: created.reversal, refund };
}

/** Bucht alles zurück, was von einer Bestellung noch offen ist; eine Rückzahlung für die Summe. */
export async function reverseWholeOrder(orderId: string, opts: { reason: ReversalReason; note?: string; restock?: boolean; refundMoney?: boolean; includeShipping?: boolean }) {
  const created = await db.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    const made: { id: string; amountCents: number }[] = [];
    for (const item of order.items) {
      const done = await reversedSoFar(tx, item.id);
      const open = item.quantity - done.quantity;
      if (open <= 0) continue;
      const r = await createReversalInTx(tx, { itemId: item.id, quantity: open, reason: opts.reason, note: opts.note, restock: opts.restock });
      made.push({ id: r.reversal.id, amountCents: r.amountCents });
    }
    if (made.length === 0) throw new Error("Diese Bestellung ist bereits vollständig zurückgebucht.");
    await settleOrderStatus(tx, orderId);
    const shipping = opts.includeShipping && order.refundedCents < order.totalCents ? order.shippingCents : 0;
    return { ids: made.map((m) => m.id), amountCents: made.reduce((s, m) => s + m.amountCents, 0) + shipping };
  });
  const refund = opts.refundMoney ? await payRefund(orderId, created.ids, created.amountCents, opts.reason) : { ok: true as const };
  return { count: created.ids.length, refund };
}

/** Erneuter Versuch einer fehlgeschlagenen Rückzahlung. */
export async function retryRefund(reversalId: string) {
  const r = await db.reversal.findUniqueOrThrow({ where: { id: reversalId } });
  if (r.refundedAt) return { ok: true as const };
  return payRefund(r.orderId, [r.id], -r.lineTotalCents, r.reason);
}

/**
 * Der Zahlungsdienst meldet eine Erstattung (z. B. von Hand im Stripe-Dashboard ausgelöst). Die gemeldete
 * Summe ist die Wahrheit über das Geld. Ist alles erstattet und hier noch nichts gebucht, buchen wir alle
 * Positionen zurück. Teilerstattungen ohne Positionsbezug werden nicht geraten: der Admin sieht den
 * Unterschied zwischen erstattetem Geld und gebuchten Rückbuchungen und ordnet selbst zu.
 */
export async function recordExternalRefund(where: { paymentIntent?: string | null; orderId?: string | null }, amountRefundedCents: number, refundRef: string) {
  const order = where.orderId
    ? await db.order.findUnique({ where: { id: where.orderId }, include: { reversals: { select: { id: true } } } })
    : where.paymentIntent
      ? await db.order.findUnique({ where: { paymentIntent: where.paymentIntent }, include: { reversals: { select: { id: true } } } })
      : null;
  if (!order) return { matched: false as const };
  await db.order.update({ where: { id: order.id }, data: { refundedCents: amountRefundedCents } });
  if (amountRefundedCents >= order.totalCents && order.reversals.length === 0 && order.status === "PAID") {
    await db.$transaction(async (tx) => {
      const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
      for (const item of items) {
        const r = await createReversalInTx(tx, { itemId: item.id, quantity: item.quantity, reason: "REFUND", note: "Vom Zahlungsdienst gemeldet" });
        await tx.reversal.update({ where: { id: r.reversal.id }, data: { refundRef, refundedAt: new Date() } });
      }
      await settleOrderStatus(tx, order.id);
    });
    return { matched: true as const, booked: true as const };
  }
  return { matched: true as const, booked: false as const };
}

/** Zusammenfassung für die Bestellansicht: was gebucht, was erstattet, wo es nicht zusammenpasst. */
export function refundSummary(order: { totalCents: number; shippingCents: number; refundedCents: number; reversals: { lineTotalCents: number; refundedAt: Date | null; refundError: string }[] }) {
  const bookedCents = order.reversals.reduce((s, r) => s - r.lineTotalCents, 0);
  const pendingMoney = order.reversals.filter((r) => !r.refundedAt && r.refundError).length;
  // Erstattetes Geld darf die Versandkosten enthalten, deshalb ist die Toleranz die Versandpauschale.
  const unassignedCents = Math.max(0, order.refundedCents - bookedCents - order.shippingCents);
  return { bookedCents, refundedCents: order.refundedCents, unassignedCents, pendingMoney };
}
