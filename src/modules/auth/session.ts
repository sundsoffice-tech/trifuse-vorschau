import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

const COOKIE = "mp_session";
const TTL_MS = 1000 * 60 * 60 * 24 * 14;

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  vendorId: string | null;
};

export async function createSession(userId: string) {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TTL_MS);
  await db.session.create({ data: { id, userId, expiresAt } });
  const jar = await cookies();
  jar.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) await db.session.deleteMany({ where: { id } });
  jar.delete(COOKIE);
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;
  const session = await db.session.findUnique({ where: { id }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  const { user } = session;
  return { id: user.id, email: user.email, name: user.name, role: user.role, vendorId: user.vendorId };
});

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?weiter=/admin");
  if (user.role !== "ADMIN") redirect("/portal");
  return user;
}

export async function requireVendorUser(): Promise<CurrentUser & { vendorId: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?weiter=/portal");
  if (user.role === "ADMIN") redirect("/admin");
  if (!user.vendorId) redirect("/login");
  return user as CurrentUser & { vendorId: string };
}
