import Link from "next/link";
import type { Metadata } from "next";
import { getCartView } from "@/modules/cart/service";
import { updateCartItemAction, removeCartItemAction } from "@/modules/cart/actions";
import { imageUrl } from "@/modules/media/url";
import { formatCents } from "@/lib/money";
import { Empty } from "@/components/ui/empty";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Warenkorb" };

export default async function CartPage() {
  const cart = await getCartView();
  if (cart.items.length === 0) {
    return (
      <div className="container-x py-12 max-w-2xl">
        <Empty title="Dein Warenkorb ist leer" text="Stöbere durch die Produkte unserer Marken." action={<Link href="/produkte" className="btn btn-primary">Produkte ansehen</Link>} />
      </div>
    );
  }
  return (
    <div className="container-x py-8">
      <h1 className="font-display text-3xl md:text-4xl font-semibold">Warenkorb</h1>
      {cart.hasProblems ? <div className="mt-4"><Alert tone="warn">Einige Positionen sind nicht mehr in der gewünschten Menge verfügbar. Die Mengen wurden angepasst.</Alert></div> : null}
      <div className="grid lg:grid-cols-[1fr_360px] gap-8 mt-6">
        <ul className="card divide-y divide-line">
          {cart.items.map((item) => (
            <li key={item.id} className="p-4 flex gap-4">
              <Link href={`/produkt/${item.slug}`} className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-surface-2 overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(item.image)} alt="" className="w-full h-full object-cover" />
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-ink-3">{item.vendor.name}</p>
                <Link href={`/produkt/${item.slug}`} className="font-semibold">{item.title}</Link>
                {!item.available ? <p className="text-bad text-sm mt-1">Nicht mehr verfügbar</p> : null}
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <form action={updateCartItemAction} className="flex items-center gap-2">
                    <input type="hidden" name="itemId" value={item.id} />
                    <label className="sr-only" htmlFor={`qty-${item.id}`}>Menge</label>
                    <input id={`qty-${item.id}`} name="quantity" type="number" min={1} max={Math.max(1, item.stock)} defaultValue={item.quantity} className="input !w-20 !min-h-[40px]" />
                    <button className="btn btn-secondary btn-sm" type="submit">Ändern</button>
                  </form>
                  <form action={removeCartItemAction}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <button className="btn btn-ghost btn-sm" type="submit">Entfernen</button>
                  </form>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatCents(item.lineTotalCents)}</p>
                {item.quantity > 1 ? <p className="text-xs text-ink-3">{item.quantity} × {formatCents(item.unitPriceCents)}</p> : null}
              </div>
            </li>
          ))}
        </ul>
        <aside className="card p-5 h-fit lg:sticky lg:top-20">
          <p className="font-semibold text-lg">Zusammenfassung</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-2">Zwischensumme</dt><dd>{formatCents(cart.subtotalCents)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-2">Versand</dt><dd>{cart.shippingCents === 0 ? "kostenlos" : formatCents(cart.shippingCents)}</dd></div>
            <div className="flex justify-between font-semibold text-base pt-2 border-t border-line"><dt>Gesamt</dt><dd>{formatCents(cart.totalCents)}</dd></div>
          </dl>
          {cart.shippingCents > 0 ? <p className="text-xs text-ink-3 mt-2">Ab {formatCents(cart.freeShippingFromCents)} versandkostenfrei.</p> : null}
          <Link href="/kasse" className={`btn btn-primary w-full mt-5 ${cart.purchasable.length === 0 ? "pointer-events-none opacity-50" : ""}`} aria-disabled={cart.purchasable.length === 0}>Zur Kasse</Link>
          <Link href="/produkte" className="btn btn-ghost w-full mt-2">Weiter einkaufen</Link>
        </aside>
      </div>
    </div>
  );
}
