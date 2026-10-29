import { splitLine } from "./money";

/** Anteil des Machers an einem Bruttopreis, in Cent. */
export function makerShareCents(priceCents: number, commissionPercent: number): number {
  return splitLine(priceCents, commissionPercent).vendorNetCents;
}

/** Vorname aus „Hanna Vogt“; für die Zeile „gehen an Hanna“. Fällt auf den Markennamen zurück. */
export function makerFirstName(contactName: string | null | undefined, fallback: string): string {
  const first = contactName?.trim().split(/\s+/)[0];
  return first && first.length > 1 ? first : fallback;
}
