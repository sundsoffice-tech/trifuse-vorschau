"use server";

import { isValidIban, normalizeIban } from "@/lib/iban";

import { field, isValidEmail, type ActionState } from "@/lib/form";
import { createVendorApplication } from "./service";
import { BRAND } from "@/lib/brand";
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
  const description = field(formData, "description");
  const city = field(formData, "city");
  const website = field(formData, "website").slice(0, 300);
  if (name.length < 2) errors.name = "Bitte den Namen angeben.";
  if (contactName.length < 2) errors.contactName = "Bitte deinen Namen angeben.";
  if (!isValidEmail(email)) errors.email = "Bitte eine gültige E-Mail-Adresse angeben.";
  if (description.length < 10) errors.description = "Ein, zwei Sätze helfen uns bei der Einschätzung.";
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors, message: "Bitte die markierten Felder prüfen." };
  try {
    await createVendorApplication({ name, contactName, email, description, city, website, phone: field(formData, "phone") });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Bewerbung konnte nicht gespeichert werden." };
  }
  revalidatePath("/admin/haendler");
  return { ok: true, message: `Danke, deine Bewerbung ist angekommen. Wir melden uns innerhalb von ${BRAND.applyResponseDays} Werktagen per E-Mail und schicken dir dann deinen Zugang.` };
}

export async function updateVendorProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireVendorUser();
  const name = field(formData, "name");
  if (name.length < 2) return { ok: false, fieldErrors: { name: "Bitte den Namen angeben." } };
  const iban = normalizeIban(field(formData, "payoutIban"));
  if (iban && !isValidIban(iban)) return { ok: false, fieldErrors: { payoutIban: "Die IBAN stimmt so nicht (Prüfziffer oder Länge). Bitte noch einmal mit der Bankkarte vergleichen." } };
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
      website: field(formData, "website").slice(0, 300),
      payoutHolder: field(formData, "payoutHolder"),
      payoutIban: iban,
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
