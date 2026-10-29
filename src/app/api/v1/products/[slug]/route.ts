import { getActiveProductBySlug } from "@/modules/catalog/queries";
import { imageUrl } from "@/modules/media/url";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const product = await getActiveProductBySlug((await ctx.params).slug);
  if (!product) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({
    id: product.id,
    slug: product.slug,
    title: product.title,
    description: product.description,
    priceCents: product.priceCents,
    compareAtCents: product.compareAtCents,
    currency: product.currency,
    stock: product.stock,
    sku: product.sku,
    shippingBy: product.shippingBy,
    images: product.images.map((i) => ({ url: imageUrl(i.path), alt: i.alt })),
    vendor: { id: product.vendor.id, name: product.vendor.name, slug: product.vendor.slug },
    category: product.category ? { id: product.category.id, name: product.category.name, slug: product.category.slug } : null,
  });
}
