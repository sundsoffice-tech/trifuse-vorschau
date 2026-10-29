import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getActiveProductBySlug, listActiveProducts } from "@/modules/catalog/queries";
import { imageUrl } from "@/modules/media/url";
import { Price } from "@/components/shop/price";
import { ProductCard } from "@/components/shop/product-card";
import { AddToCartForm } from "@/components/shop/add-to-cart-form";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getActiveProductBySlug((await params).slug);
  return { title: product?.title ?? "Produkt" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getActiveProductBySlug((await params).slug);
  if (!product) notFound();
  const more = await listActiveProducts({ vendor: product.vendor.slug, perPage: 5 });
  const related = more.items.filter((p) => p.id !== product.id).slice(0, 4);
  const [first, ...rest] = product.images;

  return (
    <div className="container-x py-8">
      <nav className="text-sm text-ink-3 mb-6" aria-label="Pfad">
        <Link href="/produkte">Produkte</Link>
        {product.category ? <> / <Link href={`/produkte?kategorie=${product.category.slug}`}>{product.category.name}</Link></> : null}
        {" / "}<span className="text-ink-2">{product.title}</span>
      </nav>
      <div className="grid md:grid-cols-2 gap-8 lg:gap-14">
        <div>
          <div className="card overflow-hidden aspect-square bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl(first?.path)} alt={first?.alt || product.title} className="w-full h-full object-cover" />
          </div>
          {rest.length ? (
            <div className="grid grid-cols-4 gap-2 mt-2">
              {rest.map((img) => (
                <div key={img.id} className="card overflow-hidden aspect-square bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(img.path)} alt={img.alt || product.title} loading="lazy" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div>
          <Link href={`/haendler/${product.vendor.slug}`} className="text-xs uppercase tracking-[0.15em] text-accent font-semibold">{product.vendor.name}</Link>
          <h1 className="font-display text-3xl md:text-4xl font-semibold mt-2 leading-tight">{product.title}</h1>
          <Price cents={product.priceCents} compareAt={product.compareAtCents} className="text-2xl mt-4" />
          <p className="text-xs text-ink-3 mt-1">inkl. MwSt., zzgl. Versand</p>
          <div className="mt-6">
            {product.stock > 0 ? <AddToCartForm productId={product.id} max={Math.min(product.stock, 10)} /> : <p className="badge badge-muted !text-sm !px-3 !py-1.5">Zurzeit ausverkauft</p>}
          </div>
          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
            <dt className="text-ink-3">Lieferung</dt>
            <dd>{product.shippingBy === "WAREHOUSE" ? "Versand aus unserem Lager, 2 bis 4 Werktage" : `Versand direkt von ${product.vendor.name}`}</dd>
            {product.sku ? <><dt className="text-ink-3">Artikelnummer</dt><dd>{product.sku}</dd></> : null}
            <dt className="text-ink-3">Verfügbar</dt>
            <dd>{product.stock > 10 ? "Auf Lager" : product.stock > 0 ? `Noch ${product.stock} Stück` : "Ausverkauft"}</dd>
          </dl>
          {product.description ? (
            <div className="prose mt-8 text-ink-2 whitespace-pre-line">{product.description}</div>
          ) : null}
          <div className="card p-5 mt-8 bg-surface-2">
            <p className="font-semibold">Über {product.vendor.name}</p>
            <p className="text-ink-2 text-sm mt-1">{product.vendor.description || "Eine kleine Marke auf unserem Marktplatz."}</p>
            <Link href={`/haendler/${product.vendor.slug}`} className="text-accent text-sm font-medium mt-2 inline-block">Alle Produkte der Marke</Link>
          </div>
        </div>
      </div>
      {related.length ? (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold mb-5">Mehr von {product.vendor.name}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">{related.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      ) : null}
    </div>
  );
}
