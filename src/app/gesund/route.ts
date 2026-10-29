import { db } from "@/lib/db";

/**
 * Gesundheitsprobe nach Hauskonvention (/opt/sunds-hub/KONVENTION.md, Regel 5):
 * "status": "ok" nur, wenn die Datenbank wirklich antwortet.
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", dienst: "shop", commit: process.env.GIT_COMMIT ?? null, zeit: new Date().toISOString() });
  } catch (e) {
    return Response.json({ status: "fehler", grund: e instanceof Error ? e.message : "db" }, { status: 503 });
  }
}
