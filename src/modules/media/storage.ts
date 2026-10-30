import "server-only";
import { mkdir, writeFile, unlink, readdir } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import sharp, { type Metadata } from "sharp";
import { IMAGE_WIDTHS, MASTER_WIDTH } from "./url";

// Fester Ort unter dem Projektordner (im Container als Volume einhängen).
const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const MAX_BYTES = 12 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;

export type StoredImage = { path: string; mime: string; width: number; height: number };

/**
 * Ablage-Schnittstelle. Heute lokal; ein S3-kompatibler Adapter bekommt dieselben Methoden
 * (siehe docs/SKALIERUNG.md, Stufe 2). Aufrufer kennen nur `storeImage`, `removeImage`, `imageUrl`.
 */
export interface StorageAdapter {
  put(relPath: string, data: Buffer, mime: string): Promise<void>;
  /** Entfernt alle Dateien, die mit dem Schlüssel beginnen (Master und alle Größen). */
  removeByPrefix(relKey: string): Promise<void>;
  publicUrl(relPath: string): string;
}

const localAdapter: StorageAdapter = {
  async put(relPath, data) {
    await mkdir(path.dirname(path.join(UPLOAD_DIR, relPath)), { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, relPath), data);
  },
  async removeByPrefix(relKey) {
    const full = path.join(UPLOAD_DIR, relKey);
    if (!full.startsWith(UPLOAD_DIR)) return;
    const dir = path.dirname(full);
    const base = path.basename(full);
    const names = await readdir(dir).catch(() => [] as string[]);
    for (const n of names) {
      if (n === base || n.startsWith(`${base}-`)) await unlink(path.join(dir, n)).catch(() => undefined);
    }
  },
  publicUrl(relPath) {
    return `/api/media/${relPath}`;
  },
};

const adapter: StorageAdapter = localAdapter;

export function uploadDir() {
  return UPLOAD_DIR;
}

/**
 * Nimmt ein Foto an, prüft es durch echtes Dekodieren (keine Signatur-Raterei), dreht es nach EXIF,
 * wirft Metadaten weg und legt es als WebP ab: ein Master mit höchstens 2000 px und feste Breiten
 * für Karten, Produktseite und Vorschauen. Ein Handyfoto mit 4 MB wird so zu rund 40 KB für die Karte.
 * Gespeichert wird der Schlüssel `ab/<name>`; die Dateien heißen `<schlüssel>-master.webp` und
 * `<schlüssel>-w<breite>.webp`.
 */
export async function storeImage(file: File): Promise<StoredImage> {
  if (file.size === 0) throw new Error("Leere Datei.");
  if (file.size > MAX_BYTES) throw new Error("Bild ist größer als 12 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  let meta: Metadata;
  try {
    meta = await sharp(buf, { limitInputPixels: MAX_PIXELS }).metadata();
  } catch {
    throw new Error("Das ist kein lesbares Bild. Bitte JPG, PNG, WebP oder GIF.");
  }
  if (!meta.width || !meta.height) throw new Error("Bildgröße nicht lesbar.");
  if (!["jpeg", "png", "webp", "gif", "heif", "avif", "tiff"].includes(meta.format ?? "")) throw new Error("Nur JPG, PNG, WebP oder GIF.");

  const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}`;
  const key = `${name.slice(0, 2)}/${name}`;
  const source = sharp(buf, { limitInputPixels: MAX_PIXELS }).rotate(); // EXIF-Drehung anwenden, Metadaten fallen weg
  const master = await source.clone().resize({ width: MASTER_WIDTH, height: MASTER_WIDTH, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
  await adapter.put(`${key}-master.webp`, master.data, "image/webp");
  for (const w of IMAGE_WIDTHS) {
    // Kleine Bilder werden nicht hochgerechnet; die kleinste Stufe gibt es immer, damit srcset nie leer ist.
    if (w > master.info.width && w !== IMAGE_WIDTHS[0]) continue;
    const variant = await source.clone().resize({ width: w, height: w, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    await adapter.put(`${key}-w${w}.webp`, variant, "image/webp");
  }
  return { path: key, mime: "image/webp", width: master.info.width, height: master.info.height };
}

export async function removeImage(relKey: string) {
  await adapter.removeByPrefix(relKey);
}

/** Öffentliche URL eines gespeicherten Bildes (oder einer Demo-Datei unter /public). */
export { imageUrl } from "./url";
