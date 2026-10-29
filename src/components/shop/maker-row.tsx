import Link from "next/link";
import { imageUrl } from "@/modules/media/url";

type Vendor = { slug: string; name: string; description: string; logoPath: string | null; city: string };

export function MakerRow({ vendor, productCount }: { vendor: Vendor; productCount: number }) {
  return (
    <Link href={`/macher/${vendor.slug}`} className="card p-4 flex gap-4 hover:border-line-strong">
      <div className="w-16 h-16 rounded-md bg-surface-2 overflow-hidden shrink-0 img-surface">
        {vendor.logoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl(vendor.logoPath)} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-display text-2xl text-ink-3" aria-hidden="true">{vendor.name.slice(0, 1)}</div>
        )}
      </div>
      <div className="min-w-0">
        <p className="font-semibold">{vendor.name}</p>
        {vendor.city ? <p className="text-sm text-ink-2">aus {vendor.city}</p> : null}
        <p className="text-sm text-ink-2 mt-1 line-clamp-2">{vendor.description || "Macher auf trifuse.store."}</p>
        <p className="text-xs text-ink-3 mt-1 num">{productCount} {productCount === 1 ? "Produkt" : "Produkte"}</p>
      </div>
    </Link>
  );
}
