import "server-only";
import { db } from "@/lib/db";
import { slugify, randomSuffix } from "@/lib/slug";
import { parseEuroToCents } from "@/lib/money";
import { field, intField } from "@/lib/form";
import { storeImage, removeImage } from "@/modules/media/storage";
import type { ProductStatus, ShippingBy } from "@prisma/client";

export type ProductInput = {
  title: string;
  description: string;
  priceCents: number;
  compareAtCents: number | null;
  stock: number;
  sku: string;
  categoryId: string | null;
  shippingBy: ShippingBy;
  weightGrams: number | null;
};

export type ParsedProduct = { ok: true; data: ProductInput } | { ok: false; fieldErrors: Record<string, string> };

export function parseProductForm(formData: FormData): ParsedProduct {
  const errors: Record<string, string> = {};
  const title = field(formData, "title");
  if (title.length < 3) errors.title = "Mindestens 3 Zeichen.";
  if (title.length > 140) errors.title = "Höchstens 140 Zeichen.";
  const priceCents = parseEuroToCents(field(formData, "price"));
  if (priceCents == null || priceCents <= 0) errors.price = "Bitte einen Preis wie 12,90 eingeben.";
  const compareRaw = field(formData, "compareAt");
  const compareAtCents = compareRaw ? parseEuroToCents(compareRaw) : null;
  if (compareRaw && compareAtCents == null) errors.compareAt = "Ungültiger Streichpreis.";
  const stock = intField(formData, "stock", -1);
  if (stock < 0) errors.stock = "Bestand muss 0 oder größer sein.";
  const shippingByRaw = field(formData, "shippingBy");
  const shippingBy: ShippingBy = shippingByRaw === "VENDOR" ? "VENDOR" : "WAREHOUSE";
  const weightRaw = field(formData, "weightGrams");
  const weightGrams = weightRaw ? intField(formData, "weightGrams", 0) : null;
  const categoryId = field(formData, "categoryId") || null;
  if (!categoryId) errors.categoryId = "Bitte eine Art wählen.";
  const description = field(formData, "description").slice(0, 5000);

  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return {
    ok: true,
    data: { title, description, priceCents: priceCents!, compareAtCents, stock, sku: field(formData, "sku").slice(0, 60), categoryId, shippingBy, weightGrams },
  };
}

async function uniqueSlug(title: string, excludeId?: string) {
  const base = slugify(title);
  let candidate = base;
  for (let i = 0; i < 10; i++) {
    const existing = await db.product.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${base}-${randomSuffix()}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createProduct(vendorId: string, input: ProductInput, status: ProductStatus) {
  const slug = await uniqueSlug(input.title);
  return db.product.create({ data: { ...input, vendorId, slug, status } });
}

export async function updateProduct(productId: string, input: ProductInput) {
  const current = await db.product.findUniqueOrThrow({ where: { id: productId } });
  const slug = current.title === input.title ? current.slug : await uniqueSlug(input.title, productId);
  return db.product.update({ where: { id: productId }, data: { ...input, slug } });
}

export async function addProductImages(productId: string, files: File[]) {
  const existing = await db.productImage.count({ where: { productId } });
  let sortOrder = existing;
  const errors: string[] = [];
  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue;
    if (existing + (sortOrder - existing) >= 8) { errors.push("Höchstens 8 Bilder je Produkt."); break; }
    try {
      const stored = await storeImage(file);
      await db.productImage.create({ data: { productId, path: stored.path, sortOrder: sortOrder++ } });
    } catch (e) {
      errors.push(`${file.name}: ${e instanceof Error ? e.message : "Upload fehlgeschlagen"}`);
    }
  }
  return errors;
}

export async function deleteProductImage(imageId: string, productId: string) {
  const img = await db.productImage.findFirst({ where: { id: imageId, productId } });
  if (!img) return;
  await db.productImage.delete({ where: { id: img.id } });
  if (!img.path.startsWith("/")) await removeImage(img.path);
}

export async function moveImageFirst(imageId: string, productId: string) {
  const images = await db.productImage.findMany({ where: { productId }, orderBy: { sortOrder: "asc" } });
  const ordered = [...images.filter((i) => i.id === imageId), ...images.filter((i) => i.id !== imageId)];
  await db.$transaction(ordered.map((img, idx) => db.productImage.update({ where: { id: img.id }, data: { sortOrder: idx } })));
}

/** Status nach Speichern durch einen Händler: Freigabe nötig, ausser der Händler darf selbst veröffentlichen. */
export function statusAfterVendorSubmit(wantsLive: boolean, autoApprove: boolean, current?: ProductStatus): ProductStatus {
  if (!wantsLive) return current === "ACTIVE" ? "ACTIVE" : "DRAFT";
  return autoApprove ? "ACTIVE" : "PENDING";
}
