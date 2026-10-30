// Clientseitig nutzbare Helfer ohne Dateisystemzugriff.
// Neue Uploads sind Schlüssel ohne Endung (`ab/xyz`) mit Dateien `-master.webp` und `-w<breite>.webp`;
// ältere Uploads tragen noch eine Endung und haben nur eine Datei. Demo-Bilder liegen unter /public.

export const IMAGE_WIDTHS = [320, 640, 1280] as const;
export const MASTER_WIDTH = 2000;

const hasExtension = (p: string) => /\.[a-z0-9]{3,4}$/i.test(p);

export function imageSrc(relPath: string | null | undefined, width: (typeof IMAGE_WIDTHS)[number] | "master" = 640): string {
  if (!relPath) return "/demo/platzhalter.svg";
  if (relPath.startsWith("/")) return relPath;
  if (hasExtension(relPath)) return `/api/media/${relPath}`;
  return `/api/media/${relPath}-${width === "master" ? "master" : `w${width}`}.webp`;
}

/** srcset für Browser, die die passende Breite selbst wählen; leer bei Demo- und Altbildern. */
export function imageSrcSet(relPath: string | null | undefined): string | undefined {
  if (!relPath || relPath.startsWith("/") || hasExtension(relPath)) return undefined;
  return IMAGE_WIDTHS.map((w) => `/api/media/${relPath}-w${w}.webp ${w}w`).join(", ");
}

/** Standardbild (640 px) für Karten und Listen. */
export function imageUrl(relPath: string | null | undefined): string {
  return imageSrc(relPath, 640);
}

export function imageVariants(relPath: string | null | undefined) {
  if (!relPath) return null;
  if (relPath.startsWith("/") || hasExtension(relPath)) return { w640: imageSrc(relPath) };
  return Object.fromEntries([...IMAGE_WIDTHS.map((w) => [`w${w}`, imageSrc(relPath, w)]), ["master", imageSrc(relPath, "master")]]);
}
