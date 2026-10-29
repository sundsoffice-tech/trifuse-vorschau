"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { field, type ActionState } from "@/lib/form";
import { requireAdmin } from "@/modules/auth/session";
import { parseProductForm, createProduct, updateProduct, addProductImages, deleteProductImage, moveImageFirst } from "./product-service";
import type { ProductStatus } from "@prisma/client";

function revalidateCatalog(productId?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/admin/produkte");
  revalidatePath("/portal/produkte");
  if (productId) {
    revalidatePath(`/admin/produkte/${productId}`);
    revalidatePath(`/portal/produkte/${productId}`);
  }
}

export async function saveAdminProductAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseProductForm(formData);
  const vendorId = field(formData, "vendorId");
  const fieldErrors = { ...(parsed.ok ? {} : parsed.fieldErrors) };
  if (!vendorId) fieldErrors.vendorId = "Bitte einen Händler wählen.";
  if (!parsed.ok || Object.keys(fieldErrors).length) return { ok: false, fieldErrors, message: "Bitte die markierten Felder prüfen." };
  const publish = field(formData, "intent") === "publish";
  const productId = field(formData, "productId");

  let id: string;
  if (productId) {
    const current = await db.product.findUniqueOrThrow({ where: { id: productId } });
    await updateProduct(current.id, parsed.data);
    const status: ProductStatus = publish ? "ACTIVE" : current.status === "ACTIVE" ? "DRAFT" : current.status;
    await db.product.update({ where: { id: current.id }, data: { vendorId, status, rejectReason: publish ? "" : current.rejectReason } });
    id = current.id;
  } else {
    id = (await createProduct(vendorId, parsed.data, publish ? "ACTIVE" : "DRAFT")).id;
  }
  const imageErrors = await addProductImages(id, formData.getAll("images").filter((f): f is File => f instanceof File));
  revalidateCatalog(id);
  redirect(`/admin/produkte/${id}${imageErrors.length ? `?bildfehler=${encodeURIComponent(imageErrors.join(" "))}` : "?gespeichert=1"}`);
}

export async function adminProductStatusAction(formData: FormData) {
  await requireAdmin();
  const productId = field(formData, "productId");
  const intent = field(formData, "intent");
  const map: Record<string, ProductStatus> = { approve: "ACTIVE", reject: "REJECTED", archive: "ARCHIVED", unpublish: "DRAFT", restore: "DRAFT" };
  const status = map[intent];
  if (!status) return;
  await db.product.update({ where: { id: productId }, data: { status, rejectReason: intent === "reject" ? field(formData, "reason").slice(0, 500) : "" } });
  revalidateCatalog(productId);
}

export async function adminUploadImagesAction(formData: FormData) {
  await requireAdmin();
  const productId = field(formData, "productId");
  await addProductImages(productId, formData.getAll("images").filter((f): f is File => f instanceof File));
  revalidateCatalog(productId);
}

export async function adminDeleteImageAction(formData: FormData) {
  await requireAdmin();
  const productId = field(formData, "productId");
  await deleteProductImage(field(formData, "imageId"), productId);
  revalidateCatalog(productId);
}

export async function adminFirstImageAction(formData: FormData) {
  await requireAdmin();
  const productId = field(formData, "productId");
  await moveImageFirst(field(formData, "imageId"), productId);
  revalidateCatalog(productId);
}

export async function adminCategoryAction(formData: FormData) {
  await requireAdmin();
  const intent = field(formData, "intent");
  if (intent === "create") {
    const name = field(formData, "name");
    if (name.length < 2) return;
    const { slugify } = await import("@/lib/slug");
    const base = slugify(name);
    const exists = await db.category.findUnique({ where: { slug: base } });
    await db.category.create({ data: { name, slug: exists ? `${base}-${Date.now().toString(36)}` : base, sortOrder: (await db.category.count()) + 1 } });
  } else if (intent === "rename") {
    const name = field(formData, "name");
    if (name.length >= 2) await db.category.update({ where: { id: field(formData, "id") }, data: { name, sortOrder: parseInt(field(formData, "sortOrder"), 10) || 0 } });
  } else if (intent === "delete") {
    const id = field(formData, "id");
    await db.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
    await db.category.delete({ where: { id } });
  }
  revalidatePath("/", "layout");
  revalidatePath("/admin/kategorien");
}
