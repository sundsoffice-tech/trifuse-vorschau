"use server";

import { redirect } from "next/navigation";
import { field, intField, isValidEmail, type ActionState } from "@/lib/form";
import { createOrderFromCart, markOrderPaid, cancelPendingOrder } from "./service";
import { reverseOrderItem, reverseWholeOrder, retryRefund } from "./reversals";
import { getPaymentProvider, paymentsMode } from "@/modules/payments";
import { db } from "@/lib/db";
import { clearCart } from "@/modules/cart/service";
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
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors, message: "Bitte die markierten Felder prüfen." };

  const provider = getPaymentProvider(paymentsMode());
  let redirectUrl: string;
  try {
    const order = await createOrderFromCart(
      { email, name, addressLine, postalCode, city, country: "DE", note: field(formData, "note").slice(0, 500), deliveryNote: field(formData, "deliveryNote").slice(0, 300) },
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
    await clearCart();
    revalidatePath("/", "layout"); // sonst zeigt die Kopfzeile aus dem Router-Cache noch den alten Zähler
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

const REASONS = ["RETURN", "REFUND", "GOODWILL"] as const;
function reasonField(formData: FormData): (typeof REASONS)[number] {
  const r = field(formData, "reason");
  return (REASONS as readonly string[]).includes(r) ? (r as (typeof REASONS)[number]) : "REFUND";
}

/** Eine Stückzahl einer Position zurückbuchen: Rückgabe, Erstattung oder Kulanz. */
export async function adminReverseItemAction(formData: FormData) {
  await requireAdmin();
  const itemId = field(formData, "itemId");
  const quantity = intField(formData, "quantity", 1);
  const result = await reverseOrderItem({
    itemId,
    quantity,
    reason: reasonField(formData),
    note: field(formData, "note"),
    restock: field(formData, "restock") === "1",
    refundMoney: field(formData, "refundMoney") === "1",
  });
  const item = await db.orderItem.findUnique({ where: { id: itemId }, select: { orderId: true } });
  revalidatePath("/admin/bestellungen");
  revalidatePath("/admin/auszahlungen");
  revalidatePath("/portal/bestellungen");
  revalidatePath("/portal/auszahlungen");
  redirect(`/admin/bestellungen/${item?.orderId}${result.refund.ok ? "" : "?rueckzahlung=fehler"}`);
}

/** Alles Offene einer Bestellung zurückbuchen, eine Rückzahlung für die Summe. */
export async function adminReverseOrderAction(formData: FormData) {
  await requireAdmin();
  const orderId = field(formData, "orderId");
  const result = await reverseWholeOrder(orderId, {
    reason: reasonField(formData),
    note: field(formData, "note"),
    restock: field(formData, "restock") === "1",
    refundMoney: field(formData, "refundMoney") === "1",
    includeShipping: field(formData, "includeShipping") === "1",
  });
  revalidatePath("/admin/bestellungen");
  revalidatePath("/admin/auszahlungen");
  revalidatePath("/portal/bestellungen");
  revalidatePath("/portal/auszahlungen");
  redirect(`/admin/bestellungen/${orderId}${result.refund.ok ? "" : "?rueckzahlung=fehler"}`);
}

export async function adminRetryRefundAction(formData: FormData) {
  await requireAdmin();
  const reversalId = field(formData, "reversalId");
  const r = await db.reversal.findUniqueOrThrow({ where: { id: reversalId }, select: { orderId: true } });
  const result = await retryRefund(reversalId);
  revalidatePath(`/admin/bestellungen/${r.orderId}`);
  redirect(`/admin/bestellungen/${r.orderId}${result.ok ? "" : "?rueckzahlung=fehler"}`);
}
