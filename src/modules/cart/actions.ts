"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { intField, field, type ActionState } from "@/lib/form";
import { addToCart, setCartQuantity, changeCartQuantity } from "./service";

export async function addToCartAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const productId = field(formData, "productId");
  const quantity = intField(formData, "quantity", 1);
  try {
    await addToCart(productId, quantity);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Konnte nicht in den Warenkorb legen." };
  }
  revalidatePath("/", "layout");
  if (field(formData, "goToCart") === "1") redirect("/warenkorb");
  return { ok: true, message: "Liegt im Warenkorb." };
}

export async function changeCartQuantityAction(formData: FormData) {
  await changeCartQuantity(field(formData, "itemId"), intField(formData, "delta", 0));
  revalidatePath("/warenkorb");
  revalidatePath("/", "layout");
}

export async function updateCartItemAction(formData: FormData) {
  await setCartQuantity(field(formData, "itemId"), intField(formData, "quantity", 1));
  revalidatePath("/warenkorb");
  revalidatePath("/", "layout");
}

export async function removeCartItemAction(formData: FormData) {
  await setCartQuantity(field(formData, "itemId"), 0);
  revalidatePath("/warenkorb");
  revalidatePath("/", "layout");
}
