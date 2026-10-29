import Link from "next/link";
import type { Metadata } from "next";
import { listActiveVendors } from "@/modules/catalog/queries";
import { imageUrl } from "@/modules/media/url";

export const metadata: Metadata = { title: "Marken" };

export default async function VendorsPage() {
  const vendors = await listActiveVendors();
  return (
    <div className="container-x py-8">
      <h1 className="font-display text-3xl md:text-4xl font-semibold">Alle Marken</h1>
      <p className="text-ink-2 mt-1">Kleine Hersteller, die ihre Produkte über uns verkaufen.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {vendors.map((v) => (
          <Link key={v.id} href={`/haendler/${v.slug}`} className="card p-5 flex gap-4 hover:border-accent">
            <div className="w-16 h-16 rounded-xl bg-surface-2 overflow-hidden shrink-0">
              {v.logoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl(v.logoPath)} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-display text-2xl text-ink-3">{v.name.slice(0, 1)}</div>
              )}
            </div>
            <div>
              <p className="font-semibold">{v.name}</p>
              <p className="text-sm text-ink-2 line-clamp-2 mt-1">{v.description || "Marke auf unserem Marktplatz."}</p>
              <p className="text-xs text-ink-3 mt-2">{v._count.products} Produkte</p>
            </div>
          </Link>
        ))}
        {vendors.length === 0 ? <p className="text-ink-2">Noch keine Marken freigeschaltet.</p> : null}
      </div>
    </div>
  );
}
