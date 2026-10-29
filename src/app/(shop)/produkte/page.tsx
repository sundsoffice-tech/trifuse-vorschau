import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { listActiveProducts, listCategoriesWithCounts } from "@/modules/catalog/queries";
import { ProductCard } from "@/components/shop/product-card";
import { SortSelect } from "@/components/shop/sort-select";
import { Pagination } from "@/components/ui/pagination";
import { Empty } from "@/components/ui/empty";

export const metadata: Metadata = { title: "Produkte" };

type Search = { q?: string; kategorie?: string; sortierung?: string; seite?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const sort = sp.sortierung === "preis-auf" || sp.sortierung === "preis-ab" ? sp.sortierung : "neu";
  const page = Math.max(1, parseInt(sp.seite ?? "1", 10) || 1);
  const [result, categories] = await Promise.all([
    listActiveProducts({ q: sp.q?.trim() || undefined, category: sp.kategorie || undefined, sort, page }),
    listCategoriesWithCounts(),
  ]);
  const activeCategory = categories.find((c) => c.slug === sp.kategorie);
  const title = sp.q ? `Suche nach „${sp.q}“` : activeCategory ? activeCategory.name : "Alle Produkte";
  const makeHref = (p: number) => {
    const u = new URLSearchParams();
    if (sp.q) u.set("q", sp.q);
    if (sp.kategorie) u.set("kategorie", sp.kategorie);
    if (sort !== "neu") u.set("sortierung", sort);
    if (p > 1) u.set("seite", String(p));
    const s = u.toString();
    return `/produkte${s ? `?${s}` : ""}`;
  };

  return (
    <div className="container-x py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold">{title}</h1>
          <p className="text-ink-2 mt-1 num">{result.total} {result.total === 1 ? "Produkt" : "Produkte"}{activeCategory && sp.q ? ` in ${activeCategory.name}` : ""}</p>
        </div>
        <Suspense fallback={null}><SortSelect value={sort} /></Suspense>
      </div>

      <ul className="flex gap-2 flex-wrap mt-6" aria-label="Kategorien">
        <li><Link href={sp.q ? `/produkte?q=${encodeURIComponent(sp.q)}` : "/produkte"} className="chip" aria-current={!sp.kategorie ? "true" : undefined}>Alle</Link></li>
        {categories.map((c) => (
          <li key={c.id}><Link href={`/produkte?kategorie=${c.slug}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} className="chip" aria-current={sp.kategorie === c.slug ? "true" : undefined}>{c.name}</Link></li>
        ))}
      </ul>

      {result.items.length ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-7 md:gap-x-6 mt-8">{result.items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
      ) : (
        <div className="mt-8"><Empty title="Nichts gefunden" text="Probiere einen anderen Begriff oder eine andere Art." action={<Link href="/produkte" className="btn btn-secondary">Alle Produkte</Link>} /></div>
      )}
      <Pagination page={result.page} pages={result.pages} makeHref={makeHref} />
    </div>
  );
}
