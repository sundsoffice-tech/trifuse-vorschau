import Link from "next/link";
import type { Metadata } from "next";
import { getCartView } from "@/modules/cart/service";
import { formatCents } from "@/lib/money";
import { makerShareCents } from "@/lib/share";
import { paymentsMode } from "@/modules/payments";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { Alert } from "@/components/ui/alert";
import { Empty } from "@/components/ui/empty";

export const metadata: Metadata = { title: "Kasse" };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ abgebrochen?: string }> }) {
  const sp = await searchParams;
  const cart = await getCartView();
  if (cart.purchasable.length === 0) {
    return (
      <div className="container-x py-12 max-w-2xl">
        {sp.abgebrochen ? <div className="mb-4"><Alert tone="warn">Die Zahlung wurde abgebrochen. Es wurde nichts bestellt.</Alert></div> : null}
        <Empty title="Nichts zu bezahlen" text="Lege zuerst etwas in den Warenkorb." action={<Link href="/produkte" className="btn btn-primary">Produkte ansehen</Link>} />
      </div>
    );
  }
  const shareTotal = cart.purchasable.reduce((s, i) => s + makerShareCents(i.lineTotalCents, i.vendor.commissionPercent), 0);
  return (
    <div className="container-x py-8">
      <h1 className="font-display text-3xl md:text-4xl font-semibold">Kasse</h1>
      {sp.abgebrochen ? <div className="mt-4"><Alert tone="warn">Die Zahlung wurde abgebrochen. Dein Warenkorb ist noch da, du kannst es noch einmal versuchen.</Alert></div> : null}
      <div className="grid lg:grid-cols-[1fr_380px] gap-8 mt-6">
        <CheckoutForm testMode={paymentsMode() === "test"} />
        <aside className="card p-5 h-fit lg:sticky lg:top-20">
          <p className="font-semibold text-lg">Deine Bestellung</p>
          <ul className="mt-3 divide-y divide-line text-sm">
            {cart.purchasable.map((i) => (
              <li key={i.id} className="py-2 flex justify-between gap-3">
                <span><span className="text-ink-2 num">{i.quantity} ×</span> {i.title}<span className="block text-xs text-ink-2">{i.vendor.name}</span></span>
                <span className="whitespace-nowrap num">{formatCents(i.lineTotalCents)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 text-sm border-t border-line pt-3 num">
            <div className="flex justify-between"><dt className="text-ink-2">Zwischensumme</dt><dd>{formatCents(cart.subtotalCents)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-2">Versand, ein Paket</dt><dd>{cart.shippingCents === 0 ? "kostenlos" : formatCents(cart.shippingCents)}</dd></div>
            <div className="flex justify-between font-semibold text-base pt-2"><dt>Gesamt</dt><dd>{formatCents(cart.totalCents)}</dd></div>
          </dl>
          <p className="text-sm mt-3 num text-accent-text font-semibold">{formatCents(shareTotal)} davon gehen an die Macher.</p>
          <p className="text-xs text-ink-2 mt-2">Alle Preise inkl. MwSt.</p>
        </aside>
      </div>
    </div>
  );
}
