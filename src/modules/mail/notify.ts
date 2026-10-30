import "server-only";
import { db } from "@/lib/db";
import { BRAND } from "@/lib/brand";
import { appUrl } from "@/modules/payments/provider";
import { queueMail } from "./service";
import * as t from "./templates";

/** Käufer-Bestätigung und eine Verkaufsmeldung je Macher, sobald eine Bestellung bezahlt ist. */
export async function notifyOrderPaid(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: { include: { vendor: { select: { id: true, name: true, email: true } } } } } });
  if (!order) return;
  const forMail: t.OrderForMail = {
    ...order,
    items: order.items.map((i) => ({ title: i.title, quantity: i.quantity, lineTotalCents: i.lineTotalCents, vendorNetCents: i.vendorNetCents, vendorName: i.vendor.name, shippingBy: i.shippingBy })),
  };
  await queueMail(order.email, t.orderConfirmation(forMail, appUrl(`/bestellung/${order.id}`)), order.id);
  const byVendor = new Map<string, { name: string; email: string; items: t.OrderForMail["items"] }>();
  order.items.forEach((i, idx) => {
    const entry = byVendor.get(i.vendor.id) ?? { name: i.vendor.name, email: i.vendor.email, items: [] };
    entry.items.push(forMail.items[idx]);
    byVendor.set(i.vendor.id, entry);
  });
  for (const v of byVendor.values()) await queueMail(v.email, t.vendorSale(v.name, forMail, v.items, appUrl("/portal/bestellungen")), order.id);
}

export async function notifyApplication(vendor: { id: string; name: string; email: string; payoutHolder: string; city: string; website: string }) {
  await queueMail(vendor.email, t.applicationReceived(vendor.payoutHolder || vendor.name, BRAND.applyResponseDays), vendor.id);
  await queueMail(BRAND.supportEmail, t.applicationForTeam(vendor.name, vendor.payoutHolder, vendor.city, vendor.website, appUrl(`/admin/haendler/${vendor.id}`)), vendor.id);
}

export async function notifyVendorWelcome(vendor: { id: string; name: string; email: string; payoutHolder: string }, setPasswordUrl: string) {
  await queueMail(vendor.email, t.vendorWelcome(vendor.payoutHolder || vendor.name, vendor.name, setPasswordUrl), vendor.id);
}

export async function notifyProductDecision(productId: string, approved: boolean, reason: string) {
  const p = await db.product.findUnique({ where: { id: productId }, include: { vendor: { select: { name: true, email: true, payoutHolder: true } } } });
  if (!p) return;
  const url = approved ? appUrl(`/produkt/${p.slug}`) : appUrl(`/portal/produkte/${p.id}`);
  await queueMail(p.vendor.email, t.productDecision(p.vendor.payoutHolder || p.vendor.name, p.title, approved, reason, url), p.id);
}

export async function notifyPayoutPaid(payoutId: string) {
  const p = await db.payout.findUnique({ where: { id: payoutId }, include: { vendor: { select: { name: true, email: true, payoutHolder: true } } } });
  if (!p || p.totalCents <= 0) return;
  await queueMail(p.vendor.email, t.payoutPaid(p.vendor.payoutHolder || p.vendor.name, p.totalCents, p.reference, p.itemCount, appUrl("/portal/auszahlungen")), p.id);
}

export async function notifyRefund(orderId: string, amountCents: number) {
  const o = await db.order.findUnique({ where: { id: orderId }, select: { id: true, number: true, name: true, email: true } });
  if (!o || amountCents <= 0) return;
  await queueMail(o.email, t.refundConfirmation(o.name, o.number, amountCents, appUrl(`/bestellung/${o.id}`)), o.id);
}
