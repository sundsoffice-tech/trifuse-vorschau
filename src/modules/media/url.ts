/** Clientseitig nutzbare Variante ohne Dateisystemzugriff. */
export function imageUrl(relPath: string | null | undefined): string {
  if (!relPath) return "/demo/platzhalter.svg";
  if (relPath.startsWith("/")) return relPath;
  return `/api/media/${relPath}`;
}
