import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { markOrderPaid } from "@/modules/orders/service";
import { getPaymentProvider } from "@/modules/payments";
import { clearCart } from "@/modules/cart/service";

/**
 * Rückkehr von der Kasse (Stripe success_url). Prüft die Zahlung, leert den Warenkorb und leitet zur
 * Bestellseite. Der Warenkorb wird hier geleert, nicht beim Rendern der Seite, damit der Zähler oben
 * nie mehr „3“ zeigt, wenn die Seite „eingegangen“ sagt (Künstler-Fund 1).
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const order = await db.order.findUnique({ where: { id } });
  if (!order) redirect("/");
  if (order.status === "PENDING" && order.paymentProvider === "stripe") {
    const params = Object.fromEntries(new URL(req.url).searchParams.entries());
    try {
      const check = await getPaymentProvider("stripe").verifyReturn(order, params);
      if (check.paid) await markOrderPaid(order.id, check.ref);
    } catch (e) {
      console.error("Rückkehr von Stripe: Prüfung fehlgeschlagen", e);
    }
  }
  const fresh = await db.order.findUnique({ where: { id }, select: { status: true } });
  if (fresh?.status === "PAID") await clearCart();
  redirect(`/bestellung/${id}`);
}
