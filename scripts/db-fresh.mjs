// Entwicklungs-Datenbank neu aufsetzen: SQLite-Datei löschen, Migrationen fahren, Demo-Daten einspielen.
// Verweigert bei Produktion oder einer Datenbank, die keine lokale Datei ist.
import { readFileSync, rmSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const env = Object.fromEntries(readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }));
const url = process.env.DATABASE_URL ?? env.DATABASE_URL ?? "";
if (process.env.NODE_ENV === "production" || !url.startsWith("file:")) {
  console.error("db:fresh läuft nur gegen eine lokale SQLite-Datei und nie in Produktion.");
  process.exit(2);
}
const file = path.resolve("prisma", url.slice(5).split("?")[0]);
for (const suffix of ["", "-wal", "-shm", "-journal"]) if (existsSync(file + suffix)) rmSync(file + suffix);
console.log(`Gelöscht: ${file}`);
execSync("npx prisma migrate deploy", { stdio: "inherit" });
execSync("node prisma/seed.mjs", { stdio: "inherit" });
