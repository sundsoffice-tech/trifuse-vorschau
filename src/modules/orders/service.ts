import "server-only";
import { db } from "@/lib/db";
import { splitLine } from "@/lib/money";
import { getCartView } from "@/modules/cart/service";
import { Prisma } from "@prisma/client";

export type CheckoutCustomer = {
  email: string;
  name: string;
  addressLine: string;
  postalCode: string;
  city: string;
  country: string;
  note: string;
  deliveryNote: string;
};

async function nextOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `M-${year}-`;
  const last = await tx.order.findFirst({ where: { number: { startsWith: prefix } }, orderBy: { number: "desc" }, select: { number: true } });
  const n = last ? parseInt(last.number.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(n).padStart(6, "0")}`;
}

/**
 * Erzeugt aus dem Warenkorb eine Bestellung im Status PENDING.
 * Je Position werden Preis, Provisionssatz und Händleranteil eingefroren und der Bestand reserviert.
 */
export async function createOrderFromCart(customer: CheckoutCustomer, paymentProvider: string) {
  const cart = await getCartView();
  if (cart.purchasable.length === 0) {
    throw new Error(cart.items.length > 0 ? "Die Artikel in deinem Warenkorb sind inzwischen ausverkauft oder nicht mehr verfügbar." : "Der Warenkorb ist leer.");
  }
  if (cart.hasProblems) throw new Error("Im Warenkorb gibt es Positionen, die nicht mehr verfügbar sind. Bitte prüfen.");

  // Die Bestellnummer wird in der Transaktion ermittelt. Zwei gleichzeitige Käufe können dieselbe Nummer
  // ziehen (unter Postgres realistisch); der Unique-Index meldet das, und wir versuchen es erneut.
  // P2028: Transaktion abgelaufen, weil die Datenbank gesperrt war (gemessen bei 10 parallelen Käufern auf
  // SQLite). Beides wird bis zu fünfmal wiederholt, danach bekommt der Kunde eine verständliche Meldung.
  for (let attempt = 1; ; attempt++) {
    try {
      return await createOrderTransaction(cart, customer, paymentProvider);
    } catch (e) {
      const code = e instanceof Prisma.PrismaClientKnownRequestError ? e.code : null;
      if (attempt < 5 && (code === "P2002" || code === "P2028")) {
        await new Promise((r) => setTimeout(r, 100 * attempt + Math.floor(Math.random() * 100)));
        continue;
      }
      if (code === "P2028") throw new Error("Gerade bestellen sehr viele Kunden gleichzeitig. Bitte in einem Moment noch einmal auf „Bestellen“ klicken.");
      throw e;
    }
  }
}

const ORDER_TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 };

async function createOrderTransaction(cart: Awaited<ReturnType<typeof getCartView>>, customer: CheckoutCustomer, paymentProvider: string) {
  return db.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: cart.purchasable.map((i) => i.productId) } },
      include: { vendor: { select: { id: true, commissionPercent: true, status: true } } },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const items: Prisma.OrderItemCreateWithoutOrderInput[] = [];
    let subtotal = 0;
    for (const line of cart.purchasable) {
      const p = byId.get(line.productId);
      if (!p || p.status !== "ACTIVE" || p.vendor.status !== "ACTIVE") throw new Error(`"${line.title}" ist nicht mehr verfügbar.`);
      if (p.stock < line.quantity) throw new Error(`Von "${p.title}" sind nur noch ${p.stock} Stück da.`);
      const lineTotalCents = p.priceCents * line.quantity;
      const { commissionCents, vendorNetCents } = splitLine(lineTotalCents, p.vendor.commissionPercent);
      subtotal += lineTotalCents;
      items.push({
        product: { connect: { id: p.id } },
        vendor: { connect: { id: p.vendor.id } },
        title: p.title,
        sku: p.sku,
        unitPriceCents: p.priceCents,
        quantity: line.quantity,
        lineTotalCents,
        commissionPercent: p.vendor.commissionPercent,
        commissionCents,
        vendorNetCents,
        shippingBy: p.shippingBy,
      });
      await tx.product.update({ where: { id: p.id }, data: { stock: { decrement: line.quantity } } });
    }

    const number = await nextOrderNumber(tx);
    return tx.order.create({
      data: {
        number,
        ...customer,
        subtotalCents: subtotal,
        shippingCents: cart.shippingCents,
        totalCents: subtotal + cart.shippingCents,
        paymentProvider,
        items: { create: items },
      },
      include: { items: true },
    });
  }, ORDER_TX_OPTIONS);
}

export async function markOrderPaid(orderId: string, paymentRef: string | null) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Bestellung nicht gefunden.");
    if (order.status === "PAID") return order;
    if (order.status !== "PENDING") throw new Error(`Bestellung ist ${order.status} und kann nicht als bezahlt markiert werden.`);
    return tx.order.update({ where: { id: orderId }, data: { status: "PAID", paidAt: new Date(), paymentRef: paymentRef ?? order.paymentRef } });
  });
}

/** Storniert eine offene Bestellung und gibt den reservierten Bestand frei. */
export async function cancelPendingOrder(orderId: string) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.status !== "PENDING") return order;
    for (const item of order.items) {
      if (item.productId) await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
    }
    return tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
  });
}

/** Offene Bestellungen, die älter als zwei Stunden sind, werden aufgeräumt (Bestand zurück). */
export async function expireStaleOrders() {
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const stale = await db.order.findMany({ where: { status: "PENDING", createdAt: { lt: cutoff } }, select: { id: true } });
  for (const o of stale) await cancelPendingOrder(o.id);
  return stale.length;
}

export async function getOrderWithItems(orderId: string) {
  return db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { vendor: { select: { name: true, slug: true } }, product: { select: { slug: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } } } } },
  });
}

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
