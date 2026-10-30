// Stripe-Webhook ohne Stripe: signierte Ereignisse gegen den laufenden Server, Wirkung in der Datenbank prüfen.
// Aufruf: node test/webhook.mjs http://localhost:3000   (braucht STRIPE_WEBHOOK_SECRET in .env, z. B. whsec_lokal)
import { readFileSync } from "node:fs";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const env = Object.fromEntries(readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }));
const secret = env.STRIPE_WEBHOOK_SECRET;
if (!secret) { console.error("STRIPE_WEBHOOK_SECRET fehlt in .env (für den Test reicht whsec_lokal)."); process.exit(2); }
process.env.DATABASE_URL ??= env.DATABASE_URL;
const db = new PrismaClient();
const stripe = new Stripe("sk_test_nur_signatur");

let failures = 0;
const check = (ok, label) => { console.log(`${ok ? "OK " : "FEHLER"} ${label}`); if (!ok) failures++; };
let n = 0;
async function send(type, object, { id, badSignature } = {}) {
  const payload = JSON.stringify({ id: id ?? `evt_test_${Date.now().toString(36)}_${n++}`, object: "event", type, created: Math.floor(Date.now() / 1000), data: { object }, livemode: false, api_version: "2025-01-01", pending_webhooks: 1, request: null });
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: badSignature ? "whsec_falsch" : secret });
  const res = await fetch(base + "/api/webhooks/stripe", { method: "POST", headers: { "content-type": "application/json", "stripe-signature": header }, body: payload });
  return { status: res.status, json: await res.json().catch(() => null), eventId: JSON.parse(payload).id };
}

const product = await db.product.findFirstOrThrow({ where: { status: "ACTIVE", stock: { gt: 0 }, vendor: { status: "ACTIVE" } }, include: { vendor: true } });
const stockBefore = product.stock;
const created = [];
async function pendingOrder(quantity = 1) {
  const lineTotalCents = product.priceCents * quantity;
  const commissionCents = Math.round((lineTotalCents * product.vendor.commissionPercent) / 100);
  const order = await db.order.create({
    data: {
      number: `W-${Date.now().toString(36)}-${n++}`,
      email: "webhook@example.com", name: "Webhook Probe", addressLine: "Teststr. 1", postalCode: "41189", city: "Mönchengladbach",
      subtotalCents: lineTotalCents, shippingCents: 490, totalCents: lineTotalCents + 490, paymentProvider: "stripe",
      items: { create: { productId: product.id, vendorId: product.vendorId, title: product.title, sku: product.sku, unitPriceCents: product.priceCents, quantity, lineTotalCents, commissionPercent: product.vendor.commissionPercent, commissionCents, vendorNetCents: lineTotalCents - commissionCents, shippingBy: product.shippingBy } },
    },
  });
  await db.product.update({ where: { id: product.id }, data: { stock: { decrement: quantity } } });
  created.push(order.id);
  return order;
}
const session = (order, extra = {}) => ({ id: `cs_test_${order.id}`, object: "checkout.session", client_reference_id: order.id, metadata: { orderId: order.id, orderNumber: order.number }, payment_status: "unpaid", payment_intent: `pi_test_${order.id}`, ...extra });

try {
  // 1. Falsche Signatur
  check((await send("checkout.session.completed", {}, { badSignature: true })).status === 400, "Falsche Signatur wird mit 400 abgewiesen");

  // 2. Kasse verlassen: Bestand kommt zurück
  const o1 = await pendingOrder(2);
  const r1 = await send("checkout.session.expired", session(o1));
  const o1after = await db.order.findUnique({ where: { id: o1.id } });
  check(r1.status === 200 && o1after.status === "CANCELLED", "checkout.session.expired storniert die offene Bestellung");
  check((await db.product.findUnique({ where: { id: product.id } })).stock === stockBefore, "Bestand nach Ablauf der Kasse wieder frei");

  // 3. Bezahlt, Zahlungsvorgang gemerkt, Dublette wirkt nicht
  const o2 = await pendingOrder(1);
  const r2 = await send("checkout.session.completed", session(o2, { payment_status: "paid" }));
  const o2paid = await db.order.findUnique({ where: { id: o2.id } });
  check(r2.status === 200 && o2paid.status === "PAID" && o2paid.paymentIntent === `pi_test_${o2.id}`, "checkout.session.completed markiert bezahlt und merkt den Zahlungsvorgang");
  const dup = await send("checkout.session.completed", session(o2, { payment_status: "paid" }), { id: r2.eventId });
  check(dup.status === 200 && dup.json?.duplicate === true, "Dasselbe Ereignis ein zweites Mal: erkannt, nicht erneut verarbeitet");
  check((await db.webhookEvent.count({ where: { id: r2.eventId } })) === 1, "Ereignis genau einmal gespeichert");

  // 4. Volle Erstattung aus dem Stripe-Dashboard: alles zurückgebucht
  const r3 = await send("charge.refunded", { id: "ch_test_1", object: "charge", payment_intent: `pi_test_${o2.id}`, amount: o2.totalCents, amount_refunded: o2.totalCents, metadata: {}, refunds: { data: [{ id: "re_test_1" }] } });
  const o2ref = await db.order.findUnique({ where: { id: o2.id }, include: { reversals: true, items: true } });
  check(r3.status === 200 && o2ref.status === "REFUNDED", "charge.refunded (voll) setzt die Bestellung auf erstattet");
  check(o2ref.reversals.length === o2ref.items.length && o2ref.reversals.every((r) => r.refundRef === "re_test_1" && r.vendorNetCents === -o2ref.items[0].vendorNetCents), "Rückbuchung je Position mit eingefrorenem Macheranteil und Stripe-Kennung");
  check(o2ref.refundedCents === o2.totalCents, "Erstattete Summe übernommen");
  const dup2 = await send("charge.refunded", { id: "ch_test_1", object: "charge", payment_intent: `pi_test_${o2.id}`, amount: o2.totalCents, amount_refunded: o2.totalCents, metadata: {}, refunds: { data: [{ id: "re_test_1" }] } });
  check(dup2.status === 200 && (await db.reversal.count({ where: { orderId: o2.id } })) === o2ref.items.length, "Zweite Meldung derselben Erstattung (neue Ereignis-Kennung) erzeugt keine zweite Rückbuchung");

  // 5. Teilerstattung ohne Positionsbezug: nichts raten, nur merken
  const o3 = await pendingOrder(1);
  await send("checkout.session.completed", session(o3, { payment_status: "paid" }));
  const half = Math.floor(o3.totalCents / 2);
  await send("charge.refunded", { id: "ch_test_2", object: "charge", payment_intent: `pi_test_${o3.id}`, amount: o3.totalCents, amount_refunded: half, metadata: {}, refunds: { data: [{ id: "re_test_2" }] } });
  const o3after = await db.order.findUnique({ where: { id: o3.id }, include: { reversals: true } });
  check(o3after.status === "PAID" && o3after.refundedCents === half && o3after.reversals.length === 0, "Teilerstattung wird gemerkt, aber keiner Position zugeordnet");

  // 6. Unbekannter Zahlungsvorgang: 200, keine Wirkung
  const r6 = await send("charge.refunded", { id: "ch_test_3", object: "charge", payment_intent: "pi_unbekannt", amount: 100, amount_refunded: 100, metadata: {}, refunds: { data: [] } });
  check(r6.status === 200, "Unbekannter Zahlungsvorgang wird bestätigt (Stripe soll nicht ewig wiederholen)");
} finally {
  await db.order.deleteMany({ where: { id: { in: created } } });
  await db.webhookEvent.deleteMany({ where: { id: { startsWith: "evt_test_" } } });
  await db.product.update({ where: { id: product.id }, data: { stock: stockBefore } });
  await db.$disconnect();
}
console.log(failures === 0 ? "\nWebhook-Test bestanden." : `\n${failures} Fehler.`);
process.exit(failures === 0 ? 0 : 1);
