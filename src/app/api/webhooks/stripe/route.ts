import { stripeClient } from "@/modules/payments/stripe-provider";
import { markOrderPaid } from "@/modules/orders/service";
import type Stripe from "stripe";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook nicht konfiguriert", { status: 503 });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Signatur fehlt", { status: 400 });
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(payload, signature, secret);
  } catch (e) {
    return new Response(`Signatur ungültig: ${e instanceof Error ? e.message : ""}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    const orderId = session.metadata?.orderId ?? session.client_reference_id;
    if (orderId && session.payment_status === "paid") {
      await markOrderPaid(orderId, session.id);
    }
  }
  return Response.json({ received: true });
}
