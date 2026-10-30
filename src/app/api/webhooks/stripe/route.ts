import { stripeWebhooks } from "@/modules/payments/stripe-provider";
import { markOrderPaid, cancelPendingOrder } from "@/modules/orders/service";
import { recordExternalRefund } from "@/modules/orders/reversals";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type Stripe from "stripe";

/**
 * Stripe stellt Ereignisse mindestens einmal zu, bei Fehlern mehrfach. Jedes Ereignis wird zuerst mit
 * seiner Kennung gespeichert; ein zweites mit derselben Kennung wird bestätigt und nicht noch einmal
 * verarbeitet. Fehler bei der Verarbeitung geben 500, damit Stripe es später erneut versucht; der
 * Eintrag wird dann wieder gelöscht.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook nicht konfiguriert", { status: 503 });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Signatur fehlt", { status: 400 });
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripeWebhooks().constructEvent(payload, signature, secret);
  } catch (e) {
    return new Response(`Signatur ungültig: ${e instanceof Error ? e.message : ""}`, { status: 400 });
  }

  if (await db.webhookEvent.findUnique({ where: { id: event.id }, select: { id: true } })) return Response.json({ received: true, duplicate: true });
  try {
    await db.webhookEvent.create({ data: { id: event.id, provider: "stripe", type: event.type } });
  } catch (e) {
    // Wettlauf zweier gleichzeitiger Zustellungen: der Unique-Index entscheidet.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return Response.json({ received: true, duplicate: true });
    throw e;
  }

  try {
    await handle(event);
  } catch (e) {
    console.error(`Stripe-Webhook ${event.type} (${event.id}) fehlgeschlagen:`, e);
    await db.webhookEvent.delete({ where: { id: event.id } }).catch(() => undefined);
    return new Response("Verarbeitung fehlgeschlagen", { status: 500 });
  }
  return Response.json({ received: true });
}

function sessionOrderId(session: Stripe.Checkout.Session) {
  return session.metadata?.orderId ?? session.client_reference_id ?? null;
}

async function handle(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      const orderId = sessionOrderId(session);
      const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
      if (orderId && session.payment_status === "paid") await markOrderPaid(orderId, session.id, intent);
      return;
    }
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed": {
      // Der Kunde hat die Kasse verlassen oder die Zahlung ist gescheitert: Bestand wieder freigeben.
      const orderId = sessionOrderId(event.data.object);
      if (orderId) await cancelPendingOrder(orderId);
      return;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      const intent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id ?? null;
      const latest = charge.refunds?.data?.[0]?.id ?? `charge_${charge.id}`;
      const result = await recordExternalRefund({ paymentIntent: intent, orderId: charge.metadata?.orderId ?? null }, charge.amount_refunded, latest);
      if (!result.matched) console.warn(`Stripe meldet Erstattung für unbekannten Zahlungsvorgang ${intent ?? charge.id}`);
      return;
    }
    default:
      return;
  }
}
