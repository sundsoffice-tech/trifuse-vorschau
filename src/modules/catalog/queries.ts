import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const productCardInclude = {
  images: { orderBy: { sortOrder: "asc" as const }, take: 1 },
  vendor: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ProductInclude;

export type ProductCard = Prisma.ProductGetPayload<{ include: typeof productCardInclude }>;

export type CatalogFilter = {
  q?: string;
  category?: string;
  vendor?: string;
  sort?: "neu" | "preis-auf" | "preis-ab";
  page?: number;
  perPage?: number;
};

export async function listActiveProducts(filter: CatalogFilter = {}) {
  const perPage = filter.perPage ?? 24;
  const page = Math.max(1, filter.page ?? 1);
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    vendor: { status: "ACTIVE" },
    ...(filter.category ? { category: { slug: filter.category } } : {}),
    ...(filter.vendor ? { vendor: { slug: filter.vendor, status: "ACTIVE" } } : {}),
    ...(filter.q
      ? {
          OR: [
            { title: { contains: filter.q } },
            { description: { contains: filter.q } },
            { vendor: { name: { contains: filter.q } } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    filter.sort === "preis-auf" ? { priceCents: "asc" } : filter.sort === "preis-ab" ? { priceCents: "desc" } : { createdAt: "desc" };

  const [items, total] = await Promise.all([
    db.product.findMany({ where, include: productCardInclude, orderBy, skip: (page - 1) * perPage, take: perPage }),
    db.product.count({ where }),
  ]);
  return { items, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getActiveProductBySlug(slug: string) {
  return db.product.findFirst({
    where: { slug, status: "ACTIVE", vendor: { status: "ACTIVE" } },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      vendor: { select: { id: true, name: true, slug: true, description: true, logoPath: true } },
      category: true,
    },
  });
}

export async function listCategories() {
  return db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}

export async function listCategoriesWithCounts() {
  const cats = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: { where: { status: "ACTIVE", vendor: { status: "ACTIVE" } } } } } },
  });
  return cats;
}

export async function listActiveVendors() {
  return db.vendor.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } },
  });
}

export async function getActiveVendorBySlug(slug: string) {
  return db.vendor.findFirst({ where: { slug, status: "ACTIVE" } });
}
