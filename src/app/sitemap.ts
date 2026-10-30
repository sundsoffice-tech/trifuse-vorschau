import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteIndexable } from "@/lib/site";
import { appUrl } from "@/modules/payments/provider";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!siteIndexable()) return [];
  const [products, vendors, categories] = await Promise.all([
    db.product.findMany({ where: { status: "ACTIVE", vendor: { status: "ACTIVE" } }, select: { slug: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 5000 }),
    db.vendor.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ select: { slug: true } }),
  ]);
  return [
    { url: appUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: appUrl("/produkte"), changeFrequency: "daily", priority: 0.9 },
    { url: appUrl("/macher"), changeFrequency: "weekly", priority: 0.7 },
    { url: appUrl("/verkaufen"), changeFrequency: "monthly", priority: 0.5 },
    ...categories.map((c) => ({ url: appUrl(`/produkte?kategorie=${c.slug}`), changeFrequency: "weekly" as const, priority: 0.6 })),
    ...vendors.map((v) => ({ url: appUrl(`/macher/${v.slug}`), lastModified: v.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...products.map((p) => ({ url: appUrl(`/produkt/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
