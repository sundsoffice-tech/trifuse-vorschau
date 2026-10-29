"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { field } from "@/lib/form";
import { requireAdmin } from "@/modules/auth/session";
import { createPayoutDraft, markPayoutPaid, deletePayoutDraft } from "./service";

export async function createPayoutDraftAction(formData: FormData) {
  await requireAdmin();
  const payout = await createPayoutDraft(field(formData, "vendorId"), field(formData, "note"));
  revalidatePath("/admin/auszahlungen");
  revalidatePath("/portal/auszahlungen");
  redirect(`/admin/auszahlungen/${payout.id}`);
}

export async function markPayoutPaidAction(formData: FormData) {
  await requireAdmin();
  const id = field(formData, "payoutId");
  await markPayoutPaid(id, field(formData, "reference"));
  revalidatePath("/admin/auszahlungen");
  revalidatePath(`/admin/auszahlungen/${id}`);
  revalidatePath("/portal/auszahlungen");
}

export async function deletePayoutDraftAction(formData: FormData) {
  await requireAdmin();
  await deletePayoutDraft(field(formData, "payoutId"));
  revalidatePath("/admin/auszahlungen");
  revalidatePath("/portal/auszahlungen");
  redirect("/admin/auszahlungen");
}
