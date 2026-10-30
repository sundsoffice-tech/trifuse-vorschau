import Link from "next/link";
import type { Metadata } from "next";
import { getCartView } from "@/modules/cart/service";
import { changeCartQuantityAction, removeCartItemAction } from "@/modules/cart/actions";
import { imageUrl } from "@/modules/media/url";
import { formatCents } from "@/lib/money";
import { formatBasePrice } from "@/lib/grundpreis";
import { makerShareCents } from "@/lib/share";
import { Empty } from "@/components/ui/empty";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Warenkorb" };

export default async function CartPage() {
  const cart = await getCartView();
  if (cart.items.length === 0) {
    return (
      <div className="container-x py-12 max-w-2xl">
        <Empty title="Dein Warenkorb ist leer" text="Stöbere durch die Produkte der Macher." action={<Link href="/produkte" className="btn btn-primary">Produkte ansehen</Link>} />
      </div>
    );
  }
  const makers = [...new Set(cart.purchasable.map((i) => i.vendor.name))];
  const shareTotal = cart.purchasable.reduce((s, i) => s + makerShareCents(i.lineTotalCents, i.vendor.commissionPercent), 0);
  const missing = cart.freeShippingFromCents - cart.subtotalCents;
  return (
    <div className="container-x py-8">
      <h1 className="font-display text-3xl md:text-4xl font-semibold">Warenkorb</h1>
      {cart.hasProblems ? <div className="mt-4"><Alert tone="warn">Einige Produkte sind nicht mehr in der gewünschten Menge da. Die Mengen wurden angepasst.</Alert></div> : null}
      <div className="grid lg:grid-cols-[1fr_360px] gap-8 mt-6">
        <ul className="card divide-y divide-line">
          {cart.items.map((item) => (
            <li key={item.id} className="p-4 flex gap-4">
              <Link href={`/produkt/${item.slug}`} className="w-20 h-20 md:w-24 md:h-24 rounded-md border border-line bg-surface-2 overflow-hidden shrink-0 img-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(item.image)} alt="" className="w-full h-full object-cover" />
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/produkt/${item.slug}`} className="font-semibold">{item.title}</Link>
                <p className="text-sm text-ink-2">{item.vendor.name}</p>
                {!item.available ? <p className="text-bad text-sm mt-1">Nicht mehr verfügbar</p> : null}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <div className="inline-flex items-center border border-line-strong rounded-md overflow-hidden" aria-label="Menge">
                    <form action={changeCartQuantityAction}><input type="hidden" name="itemId" value={item.id} /><input type="hidden" name="delta" value="-1" /><button className="btn btn-ghost btn-icon !rounded-none !min-h-[40px]" type="submit" aria-label="Eins weniger">−</button></form>
                    <span className="min-w-10 text-center num font-semibold" aria-live="polite">{item.quantity}</span>
                    <form action={changeCartQuantityAction}><input type="hidden" name="itemId" value={item.id} /><input type="hidden" name="delta" value="1" /><button className="btn btn-ghost btn-icon !rounded-none !min-h-[40px]" type="submit" aria-label="Eins mehr" disabled={item.quantity >= item.stock}>+</button></form>
                  </div>
                  <form action={removeCartItemAction}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <button className="btn btn-ghost btn-sm" type="submit">Entfernen</button>
                  </form>
                </div>
              </div>
              <div className="text-right num">
                <p className="font-semibold">{formatCents(item.lineTotalCents)}</p>
                {item.quantity > 1 ? <p className="text-xs text-ink-2">{item.quantity} × {formatCents(item.unitPriceCents)}</p> : null}
                {item.basePrice ? <p className="text-xs text-ink-2">{formatBasePrice(item.basePrice)}</p> : null}
              </div>
            </li>
          ))}
        </ul>
        <aside className="card p-5 h-fit lg:sticky lg:top-20">
          <p className="font-semibold text-lg">Zusammenfassung</p>
          <dl className="mt-4 space-y-2 text-sm num">
            <div className="flex justify-between"><dt className="text-ink-2">Zwischensumme</dt><dd>{formatCents(cart.subtotalCents)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-2">Versand</dt><dd>{cart.shippingCents === 0 ? "kostenlos" : formatCents(cart.shippingCents)}</dd></div>
            <div className="flex justify-between font-semibold text-base pt-2 border-t border-line"><dt>Gesamt</dt><dd>{formatCents(cart.totalCents)}</dd></div>
          </dl>
          {cart.shippingCents > 0 && missing > 0 ? <p className="text-sm text-ink-2 mt-2 num">Noch {formatCents(missing)} bis zum kostenlosen Versand.</p> : null}
          <p className="text-sm mt-3 num text-accent-text font-semibold">{formatCents(shareTotal)} davon gehen an {makers.length === 1 ? makers[0] : `${makers.length} Macher`}.</p>
          {makers.length > 1 ? <p className="text-xs text-ink-2 mt-1">Alles kommt trotzdem in einem Paket.</p> : null}
          <Link href="/kasse" className="btn btn-primary w-full mt-5" aria-disabled={cart.purchasable.length === 0}>Zur Kasse</Link>
          <Link href="/produkte" className="btn btn-ghost w-full mt-2">Weiter stöbern</Link>
        </aside>
      </div>
    </div>
  );
}
