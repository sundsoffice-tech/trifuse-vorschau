import "server-only";
import Stripe from "stripe";
import { appUrl, type PaymentProvider } from "./provider";

let client: Stripe | null = null;
export function stripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY fehlt.");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
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
      success_url: appUrl(`/bestellung/${order.id}?session_id={CHECKOUT_SESSION_ID}`),
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
    return { paid: matches && session.payment_status === "paid", ref: session.id };
  },
};
