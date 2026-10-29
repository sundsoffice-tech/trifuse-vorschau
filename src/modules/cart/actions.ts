"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { intField, field, type ActionState } from "@/lib/form";
import { addToCart, setCartQuantity } from "./service";

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

export async function updateCartItemAction(formData: FormData) {
  const itemId = field(formData, "itemId");
  const quantity = intField(formData, "quantity", 1);
  await setCartQuantity(itemId, quantity);
  revalidatePath("/warenkorb");
  revalidatePath("/", "layout");
}

export async function removeCartItemAction(formData: FormData) {
  await setCartQuantity(field(formData, "itemId"), 0);
  revalidatePath("/warenkorb");
  revalidatePath("/", "layout");
}
