"use server";

import { revalidatePath } from "next/cache";
import { field, type ActionState } from "@/lib/form";
import { requireAdmin } from "@/modules/auth/session";
import { setSetting } from "@/lib/settings";
import { parseEuroToCents } from "@/lib/money";

export async function saveSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const commission = parseFloat(field(formData, "commissionPercent").replace(",", "."));
  const flat = parseEuroToCents(field(formData, "shippingFlat"));
  const freeFrom = parseEuroToCents(field(formData, "freeShippingFrom"));
  const errors: Record<string, string> = {};
  if (!Number.isFinite(commission) || commission < 0 || commission > 100) errors.commissionPercent = "0 bis 100.";
  if (flat == null) errors.shippingFlat = "Betrag wie 4,90.";
  if (freeFrom == null) errors.freeShippingFrom = "Betrag wie 75,00.";
  const schedule = field(formData, "payoutSchedule").slice(0, 120);
  if (schedule.length < 3) errors.payoutSchedule = "Bitte einen Termin angeben.";
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  await setSetting("payout_schedule", schedule);
  await setSetting("commission_percent", String(commission));
  await setSetting("shipping_flat_cents", String(flat));
  await setSetting("free_shipping_from_cents", String(freeFrom));
  revalidatePath("/", "layout");
  return { ok: true, message: "Gespeichert. Der Anteil gilt für neue Macher; bestehende behalten ihren Satz." };
}
