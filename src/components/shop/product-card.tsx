import Link from "next/link";
import type { ProductCard as ProductCardData } from "@/modules/catalog/queries";
import { imageUrl } from "@/modules/media/url";
import { makerShareCents } from "@/lib/share";
import { Price, MakerShare } from "./price";

export function ProductCard({ product }: { product: ProductCardData }) {
  const img = product.images[0];
  const soldOut = product.stock <= 0;
  return (
    <article className="flex flex-col">
      <Link href={`/produkt/${product.slug}`} className="block aspect-square bg-surface-2 overflow-hidden rounded-md border border-line img-surface relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl(img?.path)} alt={img?.alt || product.title} loading="lazy" className={`w-full h-full object-cover ${soldOut ? "opacity-60" : ""}`} />
        {soldOut ? <span className="badge badge-muted absolute left-2 top-2">Ausverkauft</span> : product.stock <= 3 ? <span className="badge badge-warn absolute left-2 top-2">Nur noch {product.stock}</span> : null}
      </Link>
      <div className="pt-3 flex flex-col gap-1">
        <h3 className="font-semibold leading-snug text-[1.05rem]"><Link href={`/produkt/${product.slug}`}>{product.title}</Link></h3>
        <p className="text-sm text-ink-2">
          <Link href={`/macher/${product.vendor.slug}`} className="hover:underline">{product.vendor.name}</Link>
          {product.vendor.city ? <span className="text-ink-3"> · {product.vendor.city}</span> : null}
        </p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3">
          <Price cents={product.priceCents} compareAt={product.compareAtCents} />
          <MakerShare shareCents={makerShareCents(product.priceCents, product.vendor.commissionPercent)} makerName={product.vendor.name} className="text-sm" />
        </div>
      </div>
    </article>
  );
}
