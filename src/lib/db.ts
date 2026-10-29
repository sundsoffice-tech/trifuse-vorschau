import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; walSet?: boolean };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// SQLite: Write-Ahead-Logging, damit Leser nicht hinter Schreibern warten. Die Einstellung bleibt in der
// Datei gespeichert; unter Postgres läuft dieser Zweig nicht. Einzige Stelle mit datenbankspezifischem SQL.
if ((process.env.DATABASE_URL ?? "").startsWith("file:") && !globalForPrisma.walSet) {
  globalForPrisma.walSet = true;
  db.$queryRawUnsafe("PRAGMA journal_mode=WAL").catch(() => undefined);
}
