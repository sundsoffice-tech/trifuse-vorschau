import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

// Fester Ort unter dem Projektordner (im Container als Volume einhängen).
const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const MAX_BYTES = 5 * 1024 * 1024;

const signatures: Array<{ mime: string; ext: string; test: (b: Buffer) => boolean }> = [
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/webp", ext: "webp", test: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
  { mime: "image/gif", ext: "gif", test: (b) => b.subarray(0, 4).toString() === "GIF8" },
];

export type StoredImage = { path: string; mime: string };

export function uploadDir() {
  return UPLOAD_DIR;
}

export async function storeImage(file: File): Promise<StoredImage> {
  if (file.size === 0) throw new Error("Leere Datei.");
  if (file.size > MAX_BYTES) throw new Error("Bild ist größer als 5 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const sig = signatures.find((s) => s.test(buf));
  if (!sig) throw new Error("Nur JPG, PNG, WebP oder GIF.");
  const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.${sig.ext}`;
  const sub = name.slice(0, 2);
  await mkdir(path.join(UPLOAD_DIR, sub), { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, sub, name), buf);
  return { path: `${sub}/${name}`, mime: sig.mime };
}

export async function removeImage(relPath: string) {
  const full = path.join(UPLOAD_DIR, relPath);
  if (!full.startsWith(UPLOAD_DIR)) return;
  await unlink(full).catch(() => undefined);
}

/** Öffentliche URL eines gespeicherten Bildes (oder einer Demo-Datei unter /public). */
export function imageUrl(relPath: string | null | undefined): string {
  if (!relPath) return "/demo/platzhalter.svg";
  if (relPath.startsWith("/")) return relPath;
  return `/api/media/${relPath}`;
}
