import "server-only";
import { headers } from "next/headers";
import { MemoryRateLimiter, formatRetry } from "@/lib/rate-limit";

// Ein Zähler je Prozess; unter Postgres/mehreren Instanzen durch eine Redis-Umsetzung desselben Vertrags ersetzen.
const globalForLimit = globalThis as unknown as { rateLimiter?: MemoryRateLimiter };
const limiter = (globalForLimit.rateLimiter ??= new MemoryRateLimiter());

/** Erste Adresse aus X-Forwarded-For (Caddy setzt sie), sonst „unbekannt“. */
export async function clientKey(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || h.get("x-real-ip") || "unbekannt";
}

/**
 * Prüft ein Kontingent und liefert eine Meldung, wenn es erschöpft ist, sonst null.
 * `scope` trennt die Aktionen (login, bewerbung, passwort), `extra` kann z. B. die E-Mail sein.
 */
export async function limitExceeded(scope: string, limit: number, windowMs: number, extra = ""): Promise<string | null> {
  if (process.env.RATE_LIMIT_OFF === "1") return null; // nur für Lasttests, nie in Produktion setzen
  const r = limiter.hit(await limitKey(scope, extra), limit, windowMs);
  return r.allowed ? null : `Zu viele Versuche. Bitte in ${formatRetry(r.retryAfterMs)} noch einmal.`;
}

/** Nur prüfen, ob gesperrt (für Fehlversuche: erst prüfen, nach dem Fehlschlag zählen). */
export async function limitBlocked(scope: string, limit: number, windowMs: number, extra = ""): Promise<string | null> {
  if (process.env.RATE_LIMIT_OFF === "1") return null;
  const r = limiter.peek(await limitKey(scope, extra), limit, windowMs);
  return r.allowed ? null : `Zu viele Versuche. Bitte in ${formatRetry(r.retryAfterMs)} noch einmal.`;
}

async function limitKey(scope: string, extra: string) {
  // Beim Konto zählt nur die E-Mail, nicht die Adresse: ein Angreifer wechselt Adressen, das Konto bleibt gleich.
  return scope.endsWith("-konto") ? `${scope}:${extra}` : `${scope}:${await clientKey()}${extra ? `:${extra}` : ""}`;
}
