"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { field, isValidEmail, type ActionState } from "@/lib/form";
import { hashPassword, generatePassword } from "@/lib/password";
import { requireAdmin } from "@/modules/auth/session";
import { issuePasswordLink, WELCOME_TTL_MS } from "@/modules/auth/reset";
import { queueMail } from "@/modules/mail/service";
import { adminInvite } from "@/modules/mail/templates";

/** Weiteren Zugang fürs Team anlegen; die Person setzt ihr Passwort über den Link aus der Mail. */
export async function adminInviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const email = field(formData, "email").toLowerCase();
  const name = field(formData, "name").slice(0, 80);
  if (!isValidEmail(email)) return { ok: false, fieldErrors: { email: "Bitte eine gültige E-Mail-Adresse." } };
  if (name.length < 2) return { ok: false, fieldErrors: { name: "Bitte den Namen angeben." } };
  if (await db.user.findUnique({ where: { email } })) return { ok: false, fieldErrors: { email: "Für diese Adresse gibt es schon einen Zugang." } };
  const user = await db.user.create({ data: { email, name, role: "ADMIN", passwordHash: await hashPassword(generatePassword(24)) } });
  const url = await issuePasswordLink(user.id, WELCOME_TTL_MS);
  await queueMail(email, adminInvite(name, me.name || me.email, url), user.id);
  revalidatePath("/admin/einstellungen");
  return { ok: true, message: `${name} bekommt eine Mail mit einem Link zum Festlegen des Passworts (gilt 7 Tage).` };
}

/** Zugang entfernen; der eigene und der letzte bleiben. */
export async function adminRemoveAction(formData: FormData) {
  const me = await requireAdmin();
  const id = field(formData, "userId");
  if (id === me.id) return;
  if ((await db.user.count({ where: { role: "ADMIN" } })) <= 1) return;
  await db.user.deleteMany({ where: { id, role: "ADMIN" } });
  revalidatePath("/admin/einstellungen");
}
