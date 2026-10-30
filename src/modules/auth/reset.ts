import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { appUrl } from "@/modules/payments/provider";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Erzeugt einen einmaligen Link zum Setzen des Passworts; in der Datenbank liegt nur der Hash. */
export async function issuePasswordLink(userId: string, ttlMs: number) {
  const token = randomBytes(32).toString("base64url");
  await db.passwordReset.create({ data: { userId, tokenHash: hash(token), expiresAt: new Date(Date.now() + ttlMs) } });
  return appUrl(`/passwort-neu/${token}`);
}

export async function findValidReset(token: string) {
  if (!token || token.length > 200) return null;
  const r = await db.passwordReset.findUnique({ where: { tokenHash: hash(token) }, include: { user: { select: { id: true, email: true, name: true, role: true } } } });
  if (!r || r.usedAt || r.expiresAt < new Date()) return null;
  return r;
}

/** Setzt das Passwort, entwertet den Link und alle anderen Links des Nutzers, beendet alte Sitzungen. */
export async function consumeReset(resetId: string, userId: string, passwordHash: string) {
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { passwordHash } }),
    db.passwordReset.update({ where: { id: resetId }, data: { usedAt: new Date() } }),
    db.passwordReset.deleteMany({ where: { userId, usedAt: null } }),
    db.session.deleteMany({ where: { userId } }),
  ]);
}

export const RESET_TTL_MS = 2 * 60 * 60 * 1000;
export const WELCOME_TTL_MS = 7 * 24 * 60 * 60 * 1000;
