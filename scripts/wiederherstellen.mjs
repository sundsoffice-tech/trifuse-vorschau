// Datenbank aus einem Schnappschuss zurückholen. Vorher den Dienst stoppen (systemctl stop sunds-shop);
// der laufende Server hält sonst alte Seiten und Sperren. Der bisherige Stand bleibt als shop.db.vor-<stempel>.
//   node scripts/wiederherstellen.mjs <schnappschuss.db> [--ziel <shop.db>]
import { existsSync, copyFileSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { dbPathFromEnv } from "./sicherung.mjs";

process.removeAllListeners("warning");
const { DatabaseSync } = await import("node:sqlite");

export function wiederherstellen({ quelle, ziel }) {
  if (!existsSync(quelle)) throw new Error(`Schnappschuss fehlt: ${quelle}`);
  const probe = new DatabaseSync(quelle, { readOnly: true });
  let ok, bestellungen;
  try {
    ok = probe.prepare("PRAGMA integrity_check").get().integrity_check;
    bestellungen = probe.prepare('SELECT count(*) AS n FROM "Order"').get().n;
  } finally {
    probe.close();
  }
  if (ok !== "ok") throw new Error(`Schnappschuss nicht in Ordnung: ${ok}`);
  // Ist jemand gerade am Schreiben? Dann ist der Dienst noch an.
  if (existsSync(ziel)) {
    const live = new DatabaseSync(ziel, { timeout: 0 });
    try {
      live.exec("BEGIN IMMEDIATE"); live.exec("ROLLBACK");
    } catch (e) {
      live.close();
      // SQLITE_BUSY (5) oder SQLITE_LOCKED (6): jemand schreibt. Alles andere (z. B. keine Datenbank) wird ohnehin ersetzt.
      const code = e && typeof e === "object" && "errcode" in e ? e.errcode : null;
      if (code === 5 || code === 6) throw new Error("Die Datenbank ist gesperrt, der Dienst läuft noch. Erst stoppen, dann wiederherstellen.");
    }
    if (live.isOpen) live.close();
    const stempel = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    renameSync(ziel, `${ziel}.vor-${stempel}`);
  }
  for (const s of ["-wal", "-shm", "-journal"]) rmSync(ziel + s, { force: true });
  copyFileSync(quelle, ziel);
  return { ziel, bestellungen };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const quelle = args.find((a) => !a.startsWith("--"));
  if (!quelle) { console.error("Aufruf: node scripts/wiederherstellen.mjs <schnappschuss.db> [--ziel <shop.db>]"); process.exit(2); }
  const i = args.indexOf("--ziel");
  const ziel = i >= 0 ? path.resolve(args[i + 1]) : dbPathFromEnv();
  const r = wiederherstellen({ quelle: path.resolve(quelle), ziel });
  console.log(`Wiederhergestellt nach ${r.ziel} (${r.bestellungen} Bestellungen). Dienst jetzt starten.`);
}
