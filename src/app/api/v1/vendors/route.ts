import { listActiveVendors } from "@/modules/catalog/queries";
import { imageUrl } from "@/modules/media/url";

export async function GET() {
  const vendors = await listActiveVendors();
  return Response.json({
    items: vendors.map((v) => ({ id: v.id, slug: v.slug, name: v.name, description: v.description, logo: v.logoPath ? imageUrl(v.logoPath) : null, productCount: v._count.products, url: `/haendler/${v.slug}` })),
  });
}
