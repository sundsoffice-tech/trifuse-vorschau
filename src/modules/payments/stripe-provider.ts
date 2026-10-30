import "server-only";
import Stripe from "stripe";
import { appUrl, type PaymentProvider } from "./provider";

let client: Stripe | null = null;
export function stripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY fehlt.");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

/** Nur Signaturprüfung von Webhooks; braucht keinen echten Schlüssel (kein Netzzugriff). */
export function stripeWebhooks() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_nur_signaturpruefung").webhooks;
}

function intentId(pi: string | Stripe.PaymentIntent | null | undefined): string | null {
  return typeof pi === "string" ? pi : pi?.id ?? null;
}

export const stripeProvider: PaymentProvider = {
  id: "stripe",
  async startCheckout(order) {
    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: order.email,
      client_reference_id: order.id,
      metadata: { orderId: order.id, orderNumber: order.number },
      line_items: [
        ...order.items.map((item) => ({
          quantity: item.quantity,
          price_data: { currency: order.currency.toLowerCase(), unit_amount: item.unitPriceCents, product_data: { name: item.title } },
        })),
        ...(order.shippingCents > 0
          ? [{ quantity: 1, price_data: { currency: order.currency.toLowerCase(), unit_amount: order.shippingCents, product_data: { name: "Versand" } } }]
          : []),
      ],
      success_url: appUrl(`/bestellung/${order.id}/rueckkehr?session_id={CHECKOUT_SESSION_ID}`),
      cancel_url: appUrl(`/kasse?abgebrochen=${order.id}`),
    });
    if (!session.url) throw new Error("Stripe hat keine Checkout-URL geliefert.");
    return { redirectUrl: session.url };
  },
  async verifyReturn(order, params) {
    const sessionId = params.session_id;
    if (!sessionId) return { paid: false, ref: null };
    const session = await stripeClient().checkout.sessions.retrieve(sessionId);
    const matches = session.client_reference_id === order.id || session.metadata?.orderId === order.id;
    return { paid: matches && session.payment_status === "paid", ref: session.id, paymentIntent: intentId(session.payment_intent) };
  },
  async refund(order, amountCents, reason) {
    const stripe = stripeClient();
    let paymentIntent = order.paymentIntent;
    if (!paymentIntent && order.paymentRef?.startsWith("cs_")) {
      paymentIntent = intentId((await stripe.checkout.sessions.retrieve(order.paymentRef)).payment_intent);
    }
    if (!paymentIntent) throw new Error("Zu dieser Bestellung ist kein Zahlungsvorgang bei Stripe bekannt.");
    const refund = await stripe.refunds.create(
      { payment_intent: paymentIntent, amount: amountCents, metadata: { orderId: order.id, orderNumber: order.number, reason } },
      { idempotencyKey: `refund_${order.id}_${amountCents}_${reason}` },
    );
    return { ref: refund.id };
  },
};
