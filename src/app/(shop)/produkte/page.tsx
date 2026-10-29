import Link from "next/link";
import type { Metadata } from "next";
import { listActiveProducts, listCategoriesWithCounts } from "@/modules/catalog/queries";
import { ProductCard } from "@/components/shop/product-card";
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
          <h1 className="font-display text-3xl md:text-4xl font-semibold">{sp.q ? `Suche: „${sp.q}“` : "Alle Produkte"}</h1>
          <p className="text-ink-2 mt-1">{result.total} {result.total === 1 ? "Produkt" : "Produkte"}</p>
        </div>
        <form className="flex items-center gap-2" action="/produkte">
          {sp.q ? <input type="hidden" name="q" value={sp.q} /> : null}
          {sp.kategorie ? <input type="hidden" name="kategorie" value={sp.kategorie} /> : null}
          <label htmlFor="sortierung" className="text-sm text-ink-2">Sortieren</label>
          <select id="sortierung" name="sortierung" defaultValue={sort} className="select !w-auto">
            <option value="neu">Neueste zuerst</option>
            <option value="preis-auf">Preis aufsteigend</option>
            <option value="preis-ab">Preis absteigend</option>
          </select>
          <button className="btn btn-secondary btn-sm" type="submit">Anwenden</button>
        </form>
      </div>

      <div className="flex gap-2 flex-wrap mt-6">
        <Link href={sp.q ? `/produkte?q=${encodeURIComponent(sp.q)}` : "/produkte"} className={`badge !py-1.5 !px-3 ${!sp.kategorie ? "badge-accent" : "badge-muted"}`}>Alle</Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/produkte?kategorie=${c.slug}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} className={`badge !py-1.5 !px-3 ${sp.kategorie === c.slug ? "badge-accent" : "badge-muted"}`}>
            {c.name} <span className="opacity-60 ml-1">{c._count.products}</span>
          </Link>
        ))}
      </div>

      {result.items.length ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mt-8">{result.items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
      ) : (
        <div className="mt-8"><Empty title="Nichts gefunden" text="Probiere einen anderen Suchbegriff oder eine andere Kategorie." action={<Link href="/produkte" className="btn btn-secondary">Alle Produkte</Link>} /></div>
      )}
      <Pagination page={result.page} pages={result.pages} makeHref={makeHref} />
    </div>
  );
}
