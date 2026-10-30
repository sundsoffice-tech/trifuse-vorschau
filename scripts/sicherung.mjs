// Sicherung der SQLite-Datenbank im laufenden Betrieb mit VACUUM INTO (konsistenter Schnappschuss, auch bei
// WAL), danach Integritätsprüfung des Schnappschusses. Optional ein Archiv der Bilder.
//   node scripts/sicherung.mjs [--mit-bildern] [--ziel <ordner>] [--behalten 14]
// Eine Dateikopie von shop.db ist KEINE Sicherung: bei WAL liegen Änderungen in shop.db-wal, die Kopie wäre alt
// oder kaputt. Deshalb immer dieser Weg oder node:sqlite backup().
import { readFileSync, existsSync, mkdirSync, statSync, readdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.removeAllListeners("warning"); // node:sqlite meldet sich als experimentell; die Meldung ist hier nur Rauschen
const { DatabaseSync } = await import("node:sqlite");

const args = process.argv.slice(2);
const flag = (name, fallback = null) => { const i = args.indexOf(name); return i >= 0 ? (args[i + 1] ?? true) : fallback; };
const mitBildern = args.includes("--mit-bildern");
const behalten = Number(flag("--behalten", 14));

export function dbPathFromEnv() {
  let url = process.env.DATABASE_URL;
  if (!url) {
    const envFile = new URL("../.env", import.meta.url).pathname;
    if (existsSync(envFile)) {
      const line = readFileSync(envFile, "utf8").split("\n").find((l) => l.startsWith("DATABASE_URL="));
      url = line?.slice("DATABASE_URL=".length).replace(/^"|"$/g, "");
    }
  }
  if (!url?.startsWith("file:")) throw new Error("DATABASE_URL ist keine SQLite-Datei; diese Sicherung gilt nur für SQLite.");
  const rel = url.slice(5).split("?")[0];
  // Prisma löst relative Pfade ab dem Ordner der schema.prisma auf
  return path.isAbsolute(rel) ? rel : path.resolve(new URL("../prisma/", import.meta.url).pathname, rel);
}

export function sichern({ dbPath, zielOrdner, mitBildern = false, behalten = 14 }) {
  const start = Date.now();
  mkdirSync(zielOrdner, { recursive: true });
  const stempel = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 23);
  const ziel = path.join(zielOrdner, `shop-${stempel}.db`);
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    db.exec(`VACUUM INTO '${ziel.replace(/'/g, "''")}'`);
  } finally {
    db.close();
  }
  const probe = new DatabaseSync(ziel, { readOnly: true });
  let integritaet, bestellungen;
  try {
    integritaet = probe.prepare("PRAGMA integrity_check").get().integrity_check;
    bestellungen = probe.prepare('SELECT count(*) AS n FROM "Order"').get().n;
  } finally {
    probe.close();
  }
  if (integritaet !== "ok") { rmSync(ziel, { force: true }); throw new Error(`Schnappschuss nicht in Ordnung: ${integritaet}`); }
  let bilder = null;
  if (mitBildern) {
    const uploads = path.join(path.dirname(dbPath), "uploads");
    if (existsSync(uploads)) {
      bilder = path.join(zielOrdner, `uploads-${stempel}.tar.gz`);
      execFileSync("tar", ["-czf", bilder, "-C", path.dirname(uploads), "uploads"]);
    }
  }
  // Aufräumen: nur die letzten n Datenbank-Schnappschüsse und die letzten 4 Bildarchive behalten
  const alt = (prefix, n) => readdirSync(zielOrdner).filter((f) => f.startsWith(prefix)).sort().slice(0, -n);
  for (const f of alt("shop-", behalten)) rmSync(path.join(zielOrdner, f), { force: true });
  for (const f of alt("uploads-", 4)) rmSync(path.join(zielOrdner, f), { force: true });
  return { ziel, bilder, bytes: statSync(ziel).size, bestellungen, dauerMs: Date.now() - start, integritaet };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dbPath = dbPathFromEnv();
  const zielOrdner = flag("--ziel") ?? process.env.SICHERUNG_DIR ?? path.join(path.dirname(dbPath), "sicherung");
  const r = sichern({ dbPath, zielOrdner, mitBildern, behalten });
  console.log(`Sicherung: ${r.ziel} (${Math.round(r.bytes / 1024)} KB, ${r.bestellungen} Bestellungen, Integrität ${r.integritaet}, ${r.dauerMs} ms)${r.bilder ? `\nBilder: ${r.bilder}` : ""}`);
}
