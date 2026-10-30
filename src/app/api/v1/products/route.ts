import { listActiveProducts } from "@/modules/catalog/queries";
import { imageUrl } from "@/modules/media/url";
import { basePrice } from "@/lib/grundpreis";

/** Öffentliche, lesende Katalog-API (headless): /api/v1/products?q=&kategorie=&händler=&seite= */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const result = await listActiveProducts({
    q: u.searchParams.get("q") ?? undefined,
    category: u.searchParams.get("kategorie") ?? undefined,
    vendor: u.searchParams.get("haendler") ?? undefined,
    page: parseInt(u.searchParams.get("seite") ?? "1", 10) || 1,
    perPage: Math.min(100, parseInt(u.searchParams.get("proSeite") ?? "24", 10) || 24),
  });
  return Response.json({
    total: result.total,
    page: result.page,
    pages: result.pages,
    items: result.items.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      priceCents: p.priceCents,
      compareAtCents: p.compareAtCents,
      content: p.contentAmount && p.contentUnit ? { amount: p.contentAmount, unit: p.contentUnit } : null,
      basePrice: basePrice(p.priceCents, p.contentAmount, p.contentUnit),
      currency: p.currency,
      stock: p.stock,
      image: imageUrl(p.images[0]?.path),
      vendor: p.vendor,
      category: p.category,
      url: `/produkt/${p.slug}`,
    })),
  });
}
