import Link from "next/link";
import { listActiveProducts, listCategoriesWithCounts, listActiveVendors } from "@/modules/catalog/queries";
import { getAllSettings } from "@/lib/settings";
import { formatCents } from "@/lib/money";
import { ProductCard } from "@/components/shop/product-card";
import { MakerRow } from "@/components/shop/maker-row";

export default async function HomePage() {
  const [{ items }, categories, vendors, settings] = await Promise.all([listActiveProducts({ perPage: 8, inStockOnly: true }), listCategoriesWithCounts(), listActiveVendors(), getAllSettings()]);
  const makerPercent = Math.round(100 - settings.commissionPercent);
  return (
    <div className="container-x">
      <section className="pt-8 md:pt-14 pb-6 md:pb-10 max-w-3xl">
        <h1 className="font-display text-[2.1rem] md:text-5xl font-semibold leading-[1.1]">Direkt vom Macher. Fair&nbsp;ausgezahlt.</h1>
        <p className="text-ink-2 text-lg mt-4 max-w-[60ch]">
          Honig vom Hof, Keramik aus der Werkstatt, Kerzen aus Mönchengladbach. Du bezahlst einmal, bekommst ein Paket, und an jedem Produkt steht, was beim Macher ankommt.
        </p>
        <div className="flex flex-wrap gap-3 mt-6">
          <Link href="/produkte" className="btn btn-primary">Alle Produkte</Link>
          <Link href="/macher" className="btn btn-secondary">Die Macher</Link>
        </div>
      </section>

      <section className="pb-4">
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h2 className="font-display text-2xl md:text-3xl font-semibold">Neu dabei</h2>
          <Link href="/produkte" className="link-44 text-accent-text font-semibold underline-offset-4 hover:underline">Alle ansehen</Link>
        </div>
        {items.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-7 md:gap-x-6">{items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        ) : (
          <p className="text-ink-2">Die ersten Produkte werden gerade eingestellt.</p>
        )}
      </section>

      <div className="band mt-10">
        <div><b className="num">{makerPercent} %</b><span>jedes Preises gehen an den Macher</span></div>
        <div><b>Ein Paket</b><span>auch wenn du bei drei Machern bestellst</span></div>
        <div><b>2 bis 4 Werktage</b><span>sorgfältig verpackt, Versand {formatCents(settings.shippingFlatCents)}, ab {formatCents(settings.freeShippingFromCents)} frei</span></div>
        <div><b>14 Tage</b><span>Widerrufsrecht, Lebensmittel ungeöffnet</span></div>
      </div>

      <section className="py-10">
        <h2 className="font-display text-2xl md:text-3xl font-semibold mb-5">Die Macher</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{vendors.map((v) => <MakerRow key={v.id} vendor={v} productCount={v._count.products} />)}</div>
        {vendors.length === 0 ? <p className="text-ink-2">Noch keine Macher freigeschaltet.</p> : null}
      </section>

      <section className="py-4 border-t border-line">
        <h2 className="font-display text-xl font-semibold mb-3 mt-6">Stöbern nach Art</h2>
        <ul className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <li key={c.id}><Link href={`/produkte?kategorie=${c.slug}`} className="chip">{c.name}</Link></li>
          ))}
          {categories.length === 0 ? <li className="text-ink-3 text-sm">Noch keine Kategorien.</li> : null}
        </ul>
      </section>
    </div>
  );
}
