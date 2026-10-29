"use server";

import { field, isValidEmail, type ActionState } from "@/lib/form";
import { createVendorWithUser } from "./service";
import { requireVendorUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { storeImage, removeImage } from "@/modules/media/storage";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function applyAsVendorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const errors: Record<string, string> = {};
  const name = field(formData, "name");
  const contactName = field(formData, "contactName");
  const email = field(formData, "email").toLowerCase();
  const password = field(formData, "password");
  const description = field(formData, "description");
  if (name.length < 2) errors.name = "Bitte den Namen angeben.";
  if (contactName.length < 2) errors.contactName = "Bitte einen Ansprechpartner angeben.";
  if (!isValidEmail(email)) errors.email = "Bitte eine gültige E-Mail-Adresse angeben.";
  if (password.length < 10) errors.password = "Mindestens 10 Zeichen.";
  if (description.length < 10) errors.description = "Ein, zwei Sätze helfen uns bei der Einschätzung.";
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors, message: "Bitte die markierten Felder prüfen." };
  try {
    await createVendorWithUser({ name, contactName, email, password, description, phone: field(formData, "phone"), status: "PENDING" });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Bewerbung konnte nicht gespeichert werden." };
  }
  revalidatePath("/admin/haendler");
  return { ok: true, message: "Danke, deine Bewerbung ist angekommen. Wir prüfen sie und melden uns per E-Mail. Danach kannst du dich anmelden." };
}

export async function updateVendorProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireVendorUser();
  const name = field(formData, "name");
  if (name.length < 2) return { ok: false, fieldErrors: { name: "Bitte den Namen angeben." } };
  const logo = formData.get("logo");
  let logoPath: string | undefined;
  if (logo instanceof File && logo.size > 0) {
    try {
      const current = await db.vendor.findUnique({ where: { id: user.vendorId }, select: { logoPath: true } });
      logoPath = (await storeImage(logo)).path;
      if (current?.logoPath && !current.logoPath.startsWith("/")) await removeImage(current.logoPath);
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Logo konnte nicht gespeichert werden." };
    }
  }
  await db.vendor.update({
    where: { id: user.vendorId },
    data: {
      name,
      description: field(formData, "description").slice(0, 3000),
      phone: field(formData, "phone"),
      addressLine: field(formData, "addressLine"),
      postalCode: field(formData, "postalCode"),
      city: field(formData, "city"),
      payoutHolder: field(formData, "payoutHolder"),
      payoutIban: field(formData, "payoutIban").replace(/\s+/g, "").toUpperCase(),
      ...(logoPath ? { logoPath } : {}),
    },
  });
  revalidatePath("/portal/einstellungen");
  revalidatePath("/", "layout");
  return { ok: true, message: "Gespeichert." };
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireVendorUser();
  const current = field(formData, "current");
  const next = field(formData, "next");
  if (next.length < 10) return { ok: false, fieldErrors: { next: "Mindestens 10 Zeichen." } };
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(current, row.passwordHash))) return { ok: false, fieldErrors: { current: "Das aktuelle Passwort stimmt nicht." } };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  return { ok: true, message: "Passwort geändert." };
}
