// Sicherung im laufenden Betrieb und Wiederherstellung in einen Probepfad; vergleicht Zählwerte.
// Aufruf: node test/sicherung.mjs   (Server darf laufen; braucht nur die .env)
import { mkdtempSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { sichern, dbPathFromEnv } from "../scripts/sicherung.mjs";
import { wiederherstellen } from "../scripts/wiederherstellen.mjs";

process.removeAllListeners("warning");
const { DatabaseSync } = await import("node:sqlite");

let failures = 0;
const check = (ok, label) => { console.log(`${ok ? "OK " : "FEHLER"} ${label}`); if (!ok) failures++; };
const count = (file, table) => { const d = new DatabaseSync(file, { readOnly: true }); try { return d.prepare(`SELECT count(*) AS n FROM "${table}"`).get().n; } finally { d.close(); } };

const dbPath = dbPathFromEnv();
const dir = mkdtempSync(path.join(tmpdir(), "sicherung-"));
try {
  const live = { orders: count(dbPath, "Order"), products: count(dbPath, "Product") };
  const r = sichern({ dbPath, zielOrdner: dir, mitBildern: true, behalten: 2 });
  check(existsSync(r.ziel) && r.integritaet === "ok", `Schnappschuss geschrieben und geprüft (${Math.round(r.bytes / 1024)} KB, ${r.dauerMs} ms)`);
  check(r.bestellungen === live.orders && count(r.ziel, "Product") === live.products, `Zählwerte stimmen: ${live.orders} Bestellungen, ${live.products} Produkte`);
  check(!r.bilder || existsSync(r.bilder), `Bildarchiv ${r.bilder ? "geschrieben" : "übersprungen (keine Uploads)"}`);
  const { readdirSync } = await import("node:fs");
  // Wiederherstellen in einen Probepfad, der eine fremde, alte Datei enthält
  const ziel = path.join(dir, "probe", "shop.db");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(path.dirname(ziel)); writeFileSync(ziel, "kaputt"); writeFileSync(ziel + "-wal", "rest");
  const w = wiederherstellen({ quelle: r.ziel, ziel });
  check(w.bestellungen === live.orders && count(ziel, "Order") === live.orders && !existsSync(ziel + "-wal"), "Wiederherstellung ersetzt die alte Datei, räumt -wal weg, Zählwerte stimmen");
  check(readdirSync(path.dirname(ziel)).some((f) => f.startsWith("shop.db.vor-")), "Alter Stand bleibt als shop.db.vor-<stempel> liegen");
  // Gesperrte Zieldatenbank wird verweigert
  const lock = new DatabaseSync(ziel); lock.exec("BEGIN IMMEDIATE");
  let refused = false;
  try { wiederherstellen({ quelle: r.ziel, ziel }); } catch (e) { refused = /gesperrt/.test(e.message); }
  lock.exec("ROLLBACK"); lock.close();
  check(refused, "Wiederherstellung in eine gesperrte Datenbank wird verweigert");
  // Aufräumen: drei Sicherungen, behalten=2 -> es bleiben die zwei jüngsten (der erste Schnappschuss fällt weg)
  sichern({ dbPath, zielOrdner: dir, behalten: 2 }); sichern({ dbPath, zielOrdner: dir, behalten: 2 });
  const rest = readdirSync(dir).filter((f) => f.startsWith("shop-"));
  check(rest.length === 2 && !rest.includes(path.basename(r.ziel)), "Alte Schnappschüsse werden aufgeräumt (behalten=2, der älteste fällt weg)");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log(failures === 0 ? "\nSicherungs-Test bestanden." : `\n${failures} Fehler.`);
process.exit(failures === 0 ? 0 : 1);
