import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { listActiveProducts, listCategoriesWithCounts, listActiveVendors } from "@/modules/catalog/queries";
import { ProductCard } from "@/components/shop/product-card";

export default async function HomePage() {
  const [{ items }, categories, vendors] = await Promise.all([listActiveProducts({ perPage: 8 }), listCategoriesWithCounts(), listActiveVendors()]);
  return (
    <div className="container-x">
      <section className="py-14 md:py-20 grid md:grid-cols-[1.2fr_1fr] gap-10 items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">Marktplatz für kleine Marken</p>
          <h1 className="font-display text-4xl md:text-6xl font-semibold leading-[1.05] mt-3">Viele Hersteller. Eine Kasse. Ein Paket.</h1>
          <p className="text-ink-2 text-lg mt-5 max-w-xl">
            Bei {BRAND.name} findest du Produkte kleiner Hersteller an einem Ort. Du bezahlst einmal, wir kümmern uns um Versand und Service.
          </p>
          <div className="flex flex-wrap gap-3 mt-7">
            <Link href="/produkte" className="btn btn-primary">Produkte entdecken</Link>
            <Link href="/verkaufen" className="btn btn-secondary">Eigene Produkte listen</Link>
          </div>
        </div>
        <div className="card p-6 md:p-8">
          <p className="font-semibold">Kategorien</p>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/produkte?kategorie=${c.slug}`} className="flex items-center justify-between rounded-lg px-3 py-2 bg-surface-2 hover:bg-accent-soft hover:text-accent">
                  <span>{c.name}</span>
                  <span className="text-xs text-ink-3">{c._count.products}</span>
                </Link>
              </li>
            ))}
            {categories.length === 0 ? <li className="text-ink-3 text-sm">Noch keine Kategorien.</li> : null}
          </ul>
        </div>
      </section>

      <section className="py-8">
        <div className="flex items-end justify-between mb-5">
          <h2 className="font-display text-2xl md:text-3xl font-semibold">Neu im Marktplatz</h2>
          <Link href="/produkte" className="text-accent font-medium">Alle ansehen</Link>
        </div>
        {items.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">{items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        ) : (
          <p className="text-ink-2">Die ersten Produkte werden gerade eingepflegt.</p>
        )}
      </section>

      <section className="py-10">
        <h2 className="font-display text-2xl md:text-3xl font-semibold mb-5">Die Marken dahinter</h2>
        <div className="flex flex-wrap gap-3">
          {vendors.map((v) => (
            <Link key={v.id} href={`/haendler/${v.slug}`} className="card px-4 py-3 hover:border-accent">
              <span className="font-semibold">{v.name}</span>
              <span className="text-ink-3 text-sm ml-2">{v._count.products} Produkte</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="py-10 grid md:grid-cols-3 gap-5">
        {[
          ["Einmal bezahlen", "Auch wenn du bei drei Marken bestellst: eine Kasse, eine Rechnung, ein Ansprechpartner."],
          ["Versand aus einer Hand", "Die meisten Produkte lagern bei uns und gehen gemeinsam auf die Reise."],
          ["Fair für Hersteller", "Jede verkaufte Position wird dem Hersteller einzeln gutgeschrieben und transparent ausgezahlt."],
        ].map(([t, d]) => (
          <div key={t} className="card p-6">
            <p className="font-semibold text-lg">{t}</p>
            <p className="text-ink-2 mt-2">{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
