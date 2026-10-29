"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { field, type ActionState } from "@/lib/form";
import { createSession, destroySession } from "./session";

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = field(formData, "email").toLowerCase();
  const password = field(formData, "password");
  const weiter = field(formData, "weiter");
  if (!email || !password) return { ok: false, message: "Bitte E-Mail und Passwort eingeben." };

  const user = await db.user.findUnique({ where: { email }, include: { vendor: true } });
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !valid) return { ok: false, message: "E-Mail oder Passwort stimmt nicht." };
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
