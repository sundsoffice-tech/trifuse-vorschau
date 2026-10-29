import "server-only";
import type { PaymentProvider } from "./provider";
import { stripeProvider } from "./stripe-provider";
import { testProvider } from "./test-provider";

export function paymentsMode(): "stripe" | "test" {
  return process.env.PAYMENTS_MODE === "stripe" && process.env.STRIPE_SECRET_KEY ? "stripe" : "test";
}

export function getPaymentProvider(id?: string): PaymentProvider {
  const mode = id ?? paymentsMode();
  return mode === "stripe" ? stripeProvider : testProvider;
}
