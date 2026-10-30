"use server";

import { revalidatePath } from "next/cache";
import { field } from "@/lib/form";
import { requireAdmin } from "@/modules/auth/session";
import { deliverQueued, requeueMail } from "./service";

export async function adminRequeueMailAction(formData: FormData) {
  await requireAdmin();
  await requeueMail(field(formData, "mailId"));
  revalidatePath("/admin/postausgang");
}

export async function adminDeliverMailsAction() {
  await requireAdmin();
  await deliverQueued(50);
  revalidatePath("/admin/postausgang");
}
