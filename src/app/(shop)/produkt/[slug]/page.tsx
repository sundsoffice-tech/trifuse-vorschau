import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getActiveProductBySlug, listActiveProducts } from "@/modules/catalog/queries";
import { getAllSettings } from "@/lib/settings";
import { formatCents } from "@/lib/money";
import { makerShareCents } from "@/lib/share";
import { Picture } from "@/components/shop/picture";
import { Price } from "@/components/shop/price";
import { basePrice, formatAmount } from "@/lib/grundpreis";
import { ProductCard } from "@/components/shop/product-card";
import { AddToCartForm } from "@/components/shop/add-to-cart-form";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getActiveProductBySlug((await params).slug);
  return { title: product?.title ?? "Produkt" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getActiveProductBySlug((await params).slug);
  if (!product) notFound();
  const [more, settings] = await Promise.all([listActiveProducts({ vendor: product.vendor.slug, perPage: 5 }), getAllSettings()]);
  const related = more.items.filter((p) => p.id !== product.id).slice(0, 4);
  const [first, ...rest] = product.images;
  const share = makerShareCents(product.priceCents, product.vendor.commissionPercent);
  const makerPercent = Math.round(100 - product.vendor.commissionPercent);

  return (
    <div className="container-x py-8">
      <nav className="text-sm text-ink-2 mb-6" aria-label="Pfad">
        <Link href="/produkte" className="link-44 hover:underline">Produkte</Link>
        {product.category ? <> / <Link href={`/produkte?kategorie=${product.category.slug}`} className="link-44 hover:underline">{product.category.name}</Link></> : null}
        {" / "}<span className="text-ink">{product.title.length > 60 ? product.title.slice(0, 57).trimEnd() + " …" : product.title}</span>
      </nav>
      <div className="grid md:grid-cols-2 gap-8 lg:gap-14">
        <div>
          <div className="rounded-md border border-line overflow-hidden aspect-[4/3] md:aspect-square bg-surface-2 img-surface">
            <Picture path={first?.path} alt={first?.alt || product.title} sizes="(min-width: 768px) 50vw, 100vw" width={1280} loading="eager" fetchPriority="high" className="w-full h-full object-cover" />
          </div>
          {rest.length ? (
            <div className="grid grid-cols-4 gap-2 mt-2">
              {rest.map((img) => (
                <div key={img.id} className="rounded-md border border-line overflow-hidden aspect-square bg-surface-2 img-surface">
                  <Picture path={img.path} alt={img.alt || product.title} sizes="(min-width: 768px) 12vw, 25vw" width={320} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div>
          <p className="text-ink-2">
            <Link href={`/macher/${product.vendor.slug}`} className="link-44 font-semibold text-ink hover:underline">{product.vendor.name}</Link>
            {product.vendor.city ? <> · aus {product.vendor.city}</> : null}
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-semibold mt-1 leading-tight">{product.title}</h1>
          <Price cents={product.priceCents} compareAt={product.compareAtCents} basePrice={basePrice(product.priceCents, product.contentAmount, product.contentUnit)} className="text-2xl mt-4" />
          {product.contentAmount && product.contentUnit ? <p className="text-sm text-ink-2 num">Inhalt: {formatAmount(product.contentAmount, product.contentUnit)}</p> : null}
          <p className="text-sm text-ink-2 mt-1 num">inkl. MwSt., zzgl. {formatCents(settings.shippingFlatCents)} Versand, ab {formatCents(settings.freeShippingFromCents)} Bestellwert versandkostenfrei</p>

          <div className="mt-5">
            {product.stock > 0 ? <AddToCartForm productId={product.id} max={Math.min(product.stock, 10)} /> : <p className="badge badge-muted !text-sm !px-3 !py-1.5">Zurzeit ausverkauft</p>}
          </div>

          <div className="mt-5 rounded-md border border-line bg-surface-2 p-4">
            <p className="font-semibold num">Von {formatCents(product.priceCents)} gehen {formatCents(share)} an {product.vendor.name}.</p>
            <p className="text-sm text-ink-2 mt-1 num">Das sind {makerPercent} %. Der Rest deckt Verpackung, Versand, Zahlung und Kundendienst.</p>
          </div>

          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
            <dt className="text-ink-2">Lieferung</dt>
            <dd>{product.shippingBy === "WAREHOUSE" ? `Von ${product.vendor.name} gemacht, von uns sorgfältig verpackt und in einem Paket verschickt. 2 bis 4 Werktage.` : `${product.vendor.name} verschickt dieses Produkt selbst. 2 bis 5 Werktage.`}</dd>
            {product.sku ? <><dt className="text-ink-2">Artikelnummer</dt><dd className="num">{product.sku}</dd></> : null}
            <dt className="text-ink-2">Verfügbar</dt>
            <dd className="num">{product.stock > 10 ? "Auf Lager" : product.stock > 0 ? `Noch ${product.stock} Stück` : "Ausverkauft"}</dd>
            <dt className="text-ink-2">Rückgabe</dt>
            <dd>14 Tage Widerrufsrecht; Lebensmittel nur ungeöffnet</dd>
          </dl>

          {product.description ? <div className="prose mt-8 text-ink-2 whitespace-pre-line">{product.description}</div> : null}

          <div className="card p-5 mt-8">
            <p className="font-semibold">Über {product.vendor.name}</p>
            <p className="text-ink-2 text-sm mt-1">{product.vendor.description || "Macher auf trifuse.store."}</p>
            <Link href={`/macher/${product.vendor.slug}`} className="link-44 text-accent-text text-sm font-semibold underline-offset-4 hover:underline">Alle Produkte von {product.vendor.name}</Link>
          </div>
        </div>
      </div>
      {related.length ? (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold mb-5">Mehr von {product.vendor.name}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-7 md:gap-x-6">{related.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      ) : null}
    </div>
  );
}
