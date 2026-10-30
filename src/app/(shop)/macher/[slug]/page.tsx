import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getActiveVendorBySlug, listActiveProducts } from "@/modules/catalog/queries";
import { imageSrc } from "@/modules/media/url";
import { ProductCard } from "@/components/shop/product-card";
import { Pagination } from "@/components/ui/pagination";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const vendor = await getActiveVendorBySlug((await params).slug);
  return { title: vendor?.name ?? "Macher" };
}

export default async function VendorPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ seite?: string }> }) {
  const { slug } = await params;
  const vendor = await getActiveVendorBySlug(slug);
  if (!vendor) notFound();
  const page = Math.max(1, parseInt((await searchParams).seite ?? "1", 10) || 1);
  const result = await listActiveProducts({ vendor: slug, page });
  const makerPercent = Math.round(100 - vendor.commissionPercent);
  return (
    <div className="container-x py-8">
      <div className="flex gap-5 items-start">
        {vendor.logoPath ? (
          <div className="w-20 h-20 rounded-md bg-surface-2 overflow-hidden shrink-0 border border-line img-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageSrc(vendor.logoPath)} alt="" className="w-full h-full object-cover" />
          </div>
        ) : null}
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold">{vendor.name}</h1>
          {vendor.city ? <p className="text-ink-2 mt-1">aus {vendor.city}</p> : null}
          {vendor.description ? <p className="text-ink-2 mt-3 max-w-[65ch] whitespace-pre-line">{vendor.description}</p> : null}
          <p className="text-sm text-ink-2 mt-3 num">{makerPercent} % jedes Preises gehen direkt an {vendor.name}.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-7 md:gap-x-6 mt-8">{result.items.map((p) => <ProductCard key={p.id} product={p} headingLevel="h2" />)}</div>
      {result.items.length === 0 ? <p className="text-ink-2 mt-6">{vendor.name} hat noch keine Produkte veröffentlicht.</p> : null}
      <Pagination page={result.page} pages={result.pages} makeHref={(p) => `/macher/${slug}${p > 1 ? `?seite=${p}` : ""}`} />
    </div>
  );
}
