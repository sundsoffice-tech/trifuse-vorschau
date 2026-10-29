import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getActiveVendorBySlug, listActiveProducts } from "@/modules/catalog/queries";
import { ProductCard } from "@/components/shop/product-card";
import { Pagination } from "@/components/ui/pagination";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const vendor = await getActiveVendorBySlug((await params).slug);
  return { title: vendor?.name ?? "Marke" };
}

export default async function VendorPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ seite?: string }> }) {
  const { slug } = await params;
  const vendor = await getActiveVendorBySlug(slug);
  if (!vendor) notFound();
  const page = Math.max(1, parseInt((await searchParams).seite ?? "1", 10) || 1);
  const result = await listActiveProducts({ vendor: slug, page });
  return (
    <div className="container-x py-8">
      <p className="text-xs uppercase tracking-[0.15em] text-accent font-semibold">Marke</p>
      <h1 className="font-display text-3xl md:text-4xl font-semibold mt-1">{vendor.name}</h1>
      {vendor.description ? <p className="text-ink-2 mt-3 max-w-2xl whitespace-pre-line">{vendor.description}</p> : null}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mt-8">{result.items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
      {result.items.length === 0 ? <p className="text-ink-2 mt-6">Diese Marke hat noch keine Produkte veröffentlicht.</p> : null}
      <Pagination page={result.page} pages={result.pages} makeHref={(p) => `/haendler/${slug}${p > 1 ? `?seite=${p}` : ""}`} />
    </div>
  );
}
