import "server-only";
import type { PaymentProvider } from "./provider";

/** Simulierte Kasse ohne Geldfluss. Nur für Entwicklung und Vorführung. */
export const testProvider: PaymentProvider = {
  id: "test",
  async startCheckout(order) {
    return { redirectUrl: `/kasse/test-zahlung/${order.id}` };
  },
  async verifyReturn() {
    return { paid: false, ref: null };
  },
};
