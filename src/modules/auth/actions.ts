"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/password";
import { field, type ActionState } from "@/lib/form";
import { createSession, destroySession } from "./session";
import { issuePasswordLink, findValidReset, consumeReset, RESET_TTL_MS } from "./reset";
import { queueMail } from "@/modules/mail/service";
import { passwordReset } from "@/modules/mail/templates";
import { isValidEmail } from "@/lib/form";
import { limitExceeded, limitBlocked } from "./limit";

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = field(formData, "email").toLowerCase();
  const password = field(formData, "password");
  const weiter = field(formData, "weiter");
  if (!email || !password) return { ok: false, message: "Bitte E-Mail und Passwort eingeben." };
  const blocked = (await limitBlocked("login", 20, 15 * 60_000)) ?? (await limitBlocked("login-konto", 5, 15 * 60_000, email));
  if (blocked) return { ok: false, message: blocked };

  const user = await db.user.findUnique({ where: { email }, include: { vendor: true } });
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !valid) {
    // Nur Fehlversuche zählen, je Adresse und je Konto (auch für Konten, die es nicht gibt).
    await limitExceeded("login", 20, 15 * 60_000);
    await limitExceeded("login-konto", 5, 15 * 60_000, email);
    return { ok: false, message: "E-Mail oder Passwort stimmt nicht." };
  }
  if (user.role === "VENDOR" && user.vendor?.status === "PAUSED") {
    return { ok: false, message: "Dieser Händlerzugang ist pausiert. Bitte an den Marktplatz wenden." };
  }

  await createSession(user.id);
  const target = weiter.startsWith("/") && !weiter.startsWith("//") ? weiter : user.role === "ADMIN" ? "/admin" : "/portal";
  redirect(target);
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

/** Antwortet immer gleich, damit niemand über das Formular prüfen kann, welche Adressen ein Konto haben. */
export async function requestPasswordResetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = field(formData, "email").toLowerCase();
  if (!isValidEmail(email)) return { ok: false, message: "Bitte eine gültige E-Mail-Adresse angeben." };
  const blocked = await limitExceeded("passwort", 10, 60 * 60_000);
  if (blocked) return { ok: false, message: blocked };
  const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true } });
  if (user) {
    const url = await issuePasswordLink(user.id, RESET_TTL_MS);
    await queueMail(email, passwordReset(user.name, url), user.id);
  }
  return { ok: true, message: `Wenn es zu ${email} einen Zugang gibt, ist eine Mail mit einem Link unterwegs. Der Link gilt zwei Stunden.` };
}

export async function setNewPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = field(formData, "token");
  const password = formData.get("password");
  const confirm = formData.get("confirm");
  if (typeof password !== "string" || password.length < 10) return { ok: false, fieldErrors: { password: "Mindestens 10 Zeichen." }, message: "Bitte das Passwort prüfen." };
  if (password !== confirm) return { ok: false, fieldErrors: { confirm: "Die beiden Eingaben sind nicht gleich." }, message: "Bitte das Passwort prüfen." };
  const reset = await findValidReset(token);
  if (!reset) return { ok: false, message: "Dieser Link ist abgelaufen oder schon benutzt. Bitte einen neuen anfordern." };
  await consumeReset(reset.id, reset.userId, await hashPassword(password));
  await createSession(reset.userId);
  redirect(reset.user.role === "ADMIN" ? "/admin" : "/portal");
}
