"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { field, floatField, isValidEmail, type ActionState } from "@/lib/form";
import { requireAdmin } from "@/modules/auth/session";
import { createVendorWithUser, ensureVendorUser } from "./service";
import { hashPassword, generatePassword } from "@/lib/password";
import type { VendorStatus } from "@prisma/client";

export async function adminCreateVendorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = field(formData, "name");
  const email = field(formData, "email").toLowerCase();
  const contactName = field(formData, "contactName") || name;
  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Bitte den Namen angeben.";
  if (!isValidEmail(email)) errors.email = "Bitte eine gültige E-Mail-Adresse angeben.";
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  try {
    const { vendor, password } = await createVendorWithUser({ name, email, contactName, description: field(formData, "description"), phone: field(formData, "phone"), status: "ACTIVE" });
    revalidatePath("/admin/haendler");
    return { ok: true, message: `Händler "${vendor.name}" angelegt. Startpasswort (einmalig sichtbar): ${password}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Konnte Händler nicht anlegen." };
  }
}

export async function adminUpdateVendorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = field(formData, "vendorId");
  const statusRaw = field(formData, "status");
  const status: VendorStatus = statusRaw === "ACTIVE" || statusRaw === "PAUSED" ? statusRaw : "PENDING";
  const commissionPercent = floatField(formData, "commissionPercent", -1);
  if (commissionPercent < 0 || commissionPercent > 100) return { ok: false, fieldErrors: { commissionPercent: "0 bis 100." } };
  const name = field(formData, "name");
  if (name.length < 2) return { ok: false, fieldErrors: { name: "Bitte den Namen angeben." } };
  await db.vendor.update({
    where: { id },
    data: {
      name,
      status,
      commissionPercent,
      autoApprove: field(formData, "autoApprove") === "1",
      city: field(formData, "city"),
      website: field(formData, "website").slice(0, 300),
      description: field(formData, "description").slice(0, 3000),
      email: field(formData, "email").toLowerCase() || undefined,
      phone: field(formData, "phone"),
      payoutNote: field(formData, "payoutNote").slice(0, 1000),
      payoutHolder: field(formData, "payoutHolder"),
      payoutIban: field(formData, "payoutIban").replace(/\s+/g, "").toUpperCase(),
    },
  });
  if (status === "PAUSED") await db.session.deleteMany({ where: { user: { vendorId: id } } });
  revalidatePath("/", "layout");
  revalidatePath("/admin/haendler");
  revalidatePath(`/admin/haendler/${id}`);
  return { ok: true, message: "Gespeichert." };
}

export async function adminResetVendorPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const userId = field(formData, "userId");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "VENDOR") return { ok: false, message: "Benutzer nicht gefunden." };
  const password = generatePassword();
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password) } });
  await db.session.deleteMany({ where: { userId } });
  return { ok: true, message: `Neues Passwort für ${user.email} (einmalig sichtbar): ${password}` };
}

export async function adminDeleteVendorAction(formData: FormData) {
  await requireAdmin();
  const id = field(formData, "vendorId");
  const usage = await db.orderItem.count({ where: { vendorId: id } });
  if (usage > 0) throw new Error("Händler mit Verkäufen können nicht gelöscht werden. Stattdessen pausieren.");
  await db.$transaction([
    db.productImage.deleteMany({ where: { product: { vendorId: id } } }),
    db.product.deleteMany({ where: { vendorId: id } }),
    db.user.deleteMany({ where: { vendorId: id } }),
    db.vendor.delete({ where: { id } }),
  ]);
  revalidatePath("/admin/haendler");
  redirect("/admin/haendler");
}

export async function adminCreateAccessAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  try {
    const password = await ensureVendorUser(field(formData, "vendorId"));
    revalidatePath(`/admin/haendler/${field(formData, "vendorId")}`);
    return password ? { ok: true, message: `Zugang angelegt. Startpasswort, nur jetzt sichtbar: ${password}` } : { ok: true, message: "Es gibt schon einen Zugang." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Zugang konnte nicht angelegt werden." };
  }
}

/** Bewerbung annehmen: Stand auf Aktiv, Zugang anlegen, Startpasswort zeigen (ein Schritt statt zwei). */
export async function adminApproveVendorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = field(formData, "vendorId");
  try {
    await db.vendor.update({ where: { id }, data: { status: "ACTIVE" } });
    const password = await ensureVendorUser(id);
    revalidatePath("/", "layout");
    revalidatePath("/admin/haendler");
    revalidatePath(`/admin/haendler/${id}`);
    return { ok: true, message: password ? `Freigeschaltet. Startpasswort, nur jetzt sichtbar: ${password}. Schick es mit der Zusage an den Macher.` : "Freigeschaltet; der Zugang bestand schon." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Freischalten fehlgeschlagen." };
  }
}
