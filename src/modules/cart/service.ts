import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getSettingNumber } from "@/lib/settings";

const COOKIE = "mp_cart";

export type CartView = Awaited<ReturnType<typeof getCartView>>;

async function cartToken(create: boolean): Promise<string | null> {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing || !create) return existing ?? null;
  const token = randomBytes(24).toString("hex");
  jar.set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return token;
}

export async function getOrCreateCart() {
  const token = (await cartToken(true))!;
  return db.cart.upsert({ where: { token }, update: {}, create: { token } });
}

export async function getCartView() {
  const token = await cartToken(false);
  const cart = token
    ? await db.cart.findUnique({
        where: { token },
        include: {
          items: {
            include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, vendor: { select: { id: true, name: true, slug: true, status: true, commissionPercent: true } } } } },
            orderBy: { id: "asc" },
          },
        },
      })
    : null;

  const items = (cart?.items ?? []).map((item) => {
    const p = item.product;
    const available = p.status === "ACTIVE" && p.vendor.status === "ACTIVE";
    const quantity = Math.min(item.quantity, Math.max(0, p.stock));
    return {
      id: item.id,
      productId: p.id,
      slug: p.slug,
      title: p.title,
      image: p.images[0]?.path ?? null,
      vendor: p.vendor,
      unitPriceCents: p.priceCents,
      requested: item.quantity,
      quantity,
      stock: p.stock,
      available: available && quantity > 0,
      lineTotalCents: p.priceCents * quantity,
      shippingBy: p.shippingBy,
    };
  });

  const purchasable = items.filter((i) => i.available);
  const subtotalCents = purchasable.reduce((s, i) => s + i.lineTotalCents, 0);
  const [flat, freeFrom] = await Promise.all([getSettingNumber("shipping_flat_cents"), getSettingNumber("free_shipping_from_cents")]);
  const shippingCents = subtotalCents === 0 || subtotalCents >= freeFrom ? 0 : flat;
  return {
    cartId: cart?.id ?? null,
    items,
    purchasable,
    count: purchasable.reduce((s, i) => s + i.quantity, 0),
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
    freeShippingFromCents: freeFrom,
    hasProblems: items.some((i) => !i.available || i.requested !== i.quantity),
  };
}

export async function addToCart(productId: string, quantity: number) {
  const product = await db.product.findFirst({ where: { id: productId, status: "ACTIVE", vendor: { status: "ACTIVE" } } });
  if (!product) throw new Error("Produkt ist nicht verfügbar.");
  if (product.stock <= 0) throw new Error("Produkt ist ausverkauft.");
  const cart = await getOrCreateCart();
  const existing = await db.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId } } });
  const next = Math.min(product.stock, (existing?.quantity ?? 0) + Math.max(1, quantity));
  await db.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    update: { quantity: next },
    create: { cartId: cart.id, productId, quantity: next },
  });
  await db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
}

export async function setCartQuantity(itemId: string, quantity: number) {
  const token = await cartToken(false);
  if (!token) return;
  const item = await db.cartItem.findFirst({ where: { id: itemId, cart: { token } }, include: { product: true } });
  if (!item) return;
  if (quantity <= 0) {
    await db.cartItem.delete({ where: { id: item.id } });
    return;
  }
  await db.cartItem.update({ where: { id: item.id }, data: { quantity: Math.min(quantity, Math.max(1, item.product.stock)) } });
}

/** Plus/Minus im Warenkorb: wirkt sofort, bleibt innerhalb von 1 und Bestand. */
export async function changeCartQuantity(itemId: string, delta: number) {
  const token = await cartToken(false);
  if (!token || !delta) return;
  const item = await db.cartItem.findFirst({ where: { id: itemId, cart: { token } }, include: { product: true } });
  if (!item) return;
  const next = item.quantity + delta;
  if (next <= 0) {
    await db.cartItem.delete({ where: { id: item.id } });
    return;
  }
  await db.cartItem.update({ where: { id: item.id }, data: { quantity: Math.min(next, Math.max(1, item.product.stock)) } });
}

export async function clearCart() {
  const token = await cartToken(false);
  if (!token) return;
  await db.cartItem.deleteMany({ where: { cart: { token } } });
}
