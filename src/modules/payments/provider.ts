import "server-only";
import type { Order, OrderItem } from "@prisma/client";

export type OrderForCheckout = Order & { items: OrderItem[] };

export interface PaymentProvider {
  readonly id: "stripe" | "test";
  startCheckout(order: OrderForCheckout): Promise<{ redirectUrl: string }>;
  /** Prüft nach der Rückleitung, ob bezahlt wurde (Fallback, falls der Webhook nicht ankam). */
  verifyReturn(order: Order, params: Record<string, string | undefined>): Promise<{ paid: boolean; ref: string | null }>;
}

export function appUrl(path: string) {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}
