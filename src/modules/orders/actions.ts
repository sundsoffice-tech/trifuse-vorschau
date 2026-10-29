"use server";

import { redirect } from "next/navigation";
import { field, isValidEmail, type ActionState } from "@/lib/form";
import { createOrderFromCart, markOrderPaid, cancelPendingOrder } from "./service";
import { getPaymentProvider, paymentsMode } from "@/modules/payments";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/modules/auth/session";

export async function checkoutAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const errors: Record<string, string> = {};
  const email = field(formData, "email").toLowerCase();
  const name = field(formData, "name");
  const addressLine = field(formData, "addressLine");
  const postalCode = field(formData, "postalCode");
  const city = field(formData, "city");
  if (!isValidEmail(email)) errors.email = "Bitte eine gültige E-Mail-Adresse angeben.";
  if (name.length < 2) errors.name = "Bitte den Namen angeben.";
  if (addressLine.length < 3) errors.addressLine = "Bitte Straße und Hausnummer angeben.";
  if (!/^\d{4,5}$/.test(postalCode)) errors.postalCode = "Bitte eine Postleitzahl angeben.";
  if (city.length < 2) errors.city = "Bitte den Ort angeben.";
  if (field(formData, "agb") !== "1") errors.agb = "Bitte die AGB und die Widerrufsbelehrung bestätigen.";
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors, message: "Bitte die markierten Felder prüfen." };

  const provider = getPaymentProvider(paymentsMode());
  let redirectUrl: string;
  try {
    const order = await createOrderFromCart(
      { email, name, addressLine, postalCode, city, country: "DE", note: field(formData, "note").slice(0, 500) },
      provider.id,
    );
    redirectUrl = (await provider.startCheckout(order)).redirectUrl;
  } catch (e) {
    // Technische Fehler (Prisma, Stripe) nie wortwörtlich an Kunden geben; fachliche Meldungen schon.
    const technical = !(e instanceof Error) || e.name.startsWith("Prisma") || e.name.startsWith("Stripe");
    if (technical) console.error("Checkout fehlgeschlagen:", e);
    return { ok: false, message: technical ? "Die Bestellung konnte gerade nicht angelegt werden. Bitte in einem Moment noch einmal versuchen." : e.message };
  }
  redirect(redirectUrl);
}

/** Nur im Testmodus: simuliert eine erfolgreiche Zahlung. */
export async function simulatePaymentAction(formData: FormData) {
  if (paymentsMode() !== "test") throw new Error("Simulation ist nur im Testmodus erlaubt.");
  const orderId = field(formData, "orderId");
  const result = field(formData, "result");
  if (result === "paid") {
    await markOrderPaid(orderId, `test_${Date.now().toString(36)}`);
    redirect(`/bestellung/${orderId}`);
  }
  await cancelPendingOrder(orderId);
  redirect(`/kasse?abgebrochen=${orderId}`);
}

export async function adminSetFulfillmentAction(formData: FormData) {
  await requireAdmin();
  const itemId = field(formData, "itemId");
  const status = field(formData, "fulfillment");
  const allowed = ["NEW", "PACKED", "SHIPPED", "DELIVERED", "RETURNED"] as const;
  if (!(allowed as readonly string[]).includes(status)) return;
  await db.orderItem.update({ where: { id: itemId }, data: { fulfillment: status as (typeof allowed)[number] } });
  revalidatePath("/admin/bestellungen");
  revalidatePath("/portal/bestellungen");
}

export async function adminCancelOrderAction(formData: FormData) {
  await requireAdmin();
  const orderId = field(formData, "orderId");
  await cancelPendingOrder(orderId);
  revalidatePath("/admin/bestellungen");
  revalidatePath("/", "layout");
}

/** Für Zahlungen ausserhalb der Kasse (z. B. Überweisung): Bestellung von Hand als bezahlt markieren. */
export async function adminMarkPaidAction(formData: FormData) {
  await requireAdmin();
  const orderId = field(formData, "orderId");
  const ref = field(formData, "reference") || `manuell_${Date.now().toString(36)}`;
  await markOrderPaid(orderId, ref);
  revalidatePath("/admin/bestellungen");
  revalidatePath("/admin/auszahlungen");
}

export async function adminRefundOrderAction(formData: FormData) {
  await requireAdmin();
  const orderId = field(formData, "orderId");
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.status !== "PAID") return;
  if (order.items.some((i) => i.payoutId)) throw new Error("Positionen stecken schon in einer Auszahlung. Erst die Auszahlung auflösen.");
  await db.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } });
  revalidatePath("/admin/bestellungen");
  revalidatePath("/admin/auszahlungen");
}
