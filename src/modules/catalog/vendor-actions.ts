"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { field, type ActionState } from "@/lib/form";
import { requireVendorUser } from "@/modules/auth/session";
import { parseProductForm, createProduct, updateProduct, addProductImages, deleteProductImage, moveImageFirst, statusAfterVendorSubmit } from "./product-service";

async function ownProduct(productId: string, vendorId: string) {
  const product = await db.product.findFirst({ where: { id: productId, vendorId } });
  if (!product) throw new Error("Produkt nicht gefunden.");
  return product;
}

function revalidateCatalog() {
  revalidatePath("/", "layout");
  revalidatePath("/portal/produkte");
  revalidatePath("/admin/produkte");
}

export async function saveVendorProductAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireVendorUser();
  const vendor = await db.vendor.findUniqueOrThrow({ where: { id: user.vendorId } });
  if (vendor.status !== "ACTIVE") return { ok: false, message: "Dein Händlerkonto ist noch nicht freigeschaltet." };
  const parsed = parseProductForm(formData);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors, message: "Bitte die markierten Felder prüfen." };
  const wantsLive = field(formData, "intent") === "publish";
  const productId = field(formData, "productId");

  let id: string;
  if (productId) {
    const current = await ownProduct(productId, vendor.id);
    const status = statusAfterVendorSubmit(wantsLive, vendor.autoApprove, current.status);
    await updateProduct(current.id, parsed.data);
    await db.product.update({ where: { id: current.id }, data: { status, rejectReason: wantsLive ? "" : current.rejectReason } });
    id = current.id;
  } else {
    const created = await createProduct(vendor.id, parsed.data, statusAfterVendorSubmit(wantsLive, vendor.autoApprove));
    id = created.id;
  }
  const imageErrors = await addProductImages(id, formData.getAll("images").filter((f): f is File => f instanceof File));
  revalidateCatalog();
  const query = imageErrors.length ? `?bildfehler=${encodeURIComponent(imageErrors.join(" "))}` : "?gespeichert=1";
  redirect(`/portal/produkte/${id}${query}`);
}

export async function uploadVendorImagesAction(formData: FormData) {
  const user = await requireVendorUser();
  const product = await ownProduct(field(formData, "productId"), user.vendorId);
  await addProductImages(product.id, formData.getAll("images").filter((f): f is File => f instanceof File));
  revalidateCatalog();
  revalidatePath(`/portal/produkte/${product.id}`);
}

export async function deleteVendorImageAction(formData: FormData) {
  const user = await requireVendorUser();
  const product = await ownProduct(field(formData, "productId"), user.vendorId);
  await deleteProductImage(field(formData, "imageId"), product.id);
  revalidateCatalog();
  revalidatePath(`/portal/produkte/${product.id}`);
}

export async function firstVendorImageAction(formData: FormData) {
  const user = await requireVendorUser();
  const product = await ownProduct(field(formData, "productId"), user.vendorId);
  await moveImageFirst(field(formData, "imageId"), product.id);
  revalidateCatalog();
  revalidatePath(`/portal/produkte/${product.id}`);
}

export async function setVendorProductStatusAction(formData: FormData) {
  const user = await requireVendorUser();
  const product = await ownProduct(field(formData, "productId"), user.vendorId);
  const intent = field(formData, "intent");
  const status = intent === "archive" ? "ARCHIVED" : intent === "unpublish" ? "DRAFT" : null;
  if (!status) return;
  await db.product.update({ where: { id: product.id }, data: { status } });
  revalidateCatalog();
  revalidatePath(`/portal/produkte/${product.id}`);
}

export async function vendorSetFulfillmentAction(formData: FormData) {
  const user = await requireVendorUser();
  const item = await db.orderItem.findFirst({ where: { id: field(formData, "itemId"), vendorId: user.vendorId, shippingBy: "VENDOR" } });
  if (!item) return;
  const status = field(formData, "fulfillment");
  const allowed = ["NEW", "PACKED", "SHIPPED", "DELIVERED"] as const;
  if (!(allowed as readonly string[]).includes(status)) return;
  await db.orderItem.update({ where: { id: item.id }, data: { fulfillment: status as (typeof allowed)[number] } });
  revalidatePath("/portal/bestellungen");
  revalidatePath("/admin/bestellungen");
}
