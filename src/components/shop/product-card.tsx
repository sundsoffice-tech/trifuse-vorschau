import Link from "next/link";
import type { ProductCard as ProductCardData } from "@/modules/catalog/queries";
import { imageUrl } from "@/modules/media/url";
import { Price } from "./price";

export function ProductCard({ product }: { product: ProductCardData }) {
  const img = product.images[0];
  return (
    <article className="card overflow-hidden flex flex-col group">
      <Link href={`/produkt/${product.slug}`} className="block aspect-square bg-surface-2 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl(img?.path)} alt={img?.alt || product.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
      </Link>
      <div className="p-4 flex flex-col gap-1 flex-1">
        <Link href={`/haendler/${product.vendor.slug}`} className="text-xs uppercase tracking-wide text-ink-3 hover:text-accent">{product.vendor.name}</Link>
        <h3 className="font-semibold leading-snug"><Link href={`/produkt/${product.slug}`}>{product.title}</Link></h3>
        <div className="mt-auto pt-2 flex items-center justify-between">
          <Price cents={product.priceCents} compareAt={product.compareAtCents} />
          {product.stock <= 0 ? <span className="badge badge-muted">Ausverkauft</span> : product.stock <= 3 ? <span className="badge badge-warn">Nur noch {product.stock}</span> : null}
        </div>
      </div>
    </article>
  );
}
