/**
 * Grundpreis nach § 4 Preisangabenverordnung: Waren nach Gewicht, Volumen, Länge oder Fläche tragen den
 * Preis je Kilogramm, Liter, Meter oder Quadratmeter; bis 250 g oder 250 ml darf je 100 g oder 100 ml
 * angegeben werden. Bei Mehrstück-Packungen zeigen wir den Preis je Stück.
 */
export const CONTENT_UNITS = [
  { code: "g", label: "Gramm (g)" },
  { code: "kg", label: "Kilogramm (kg)" },
  { code: "ml", label: "Milliliter (ml)" },
  { code: "l", label: "Liter (l)" },
  { code: "m", label: "Meter (m)" },
  { code: "m2", label: "Quadratmeter (m²)" },
  { code: "stueck", label: "Stück (Set oder Packung)" },
] as const;
export type ContentUnit = (typeof CONTENT_UNITS)[number]["code"];

export function isContentUnit(v: string): v is ContentUnit {
  return CONTENT_UNITS.some((u) => u.code === v);
}

export type BasePrice = { cents: number; per: string };

/** Liefert null, wenn kein Grundpreis nötig ist (keine Angabe, oder ein einzelnes Stück). */
export function basePrice(priceCents: number, amount: number | null | undefined, unit: string | null | undefined): BasePrice | null {
  if (!amount || amount <= 0 || !unit || !isContentUnit(unit)) return null;
  const perUnit = (divisor: number, per: string): BasePrice => ({ cents: Math.round(priceCents / divisor), per });
  switch (unit) {
    case "g":
      return amount <= 250 ? perUnit(amount / 100, "100 g") : perUnit(amount / 1000, "kg");
    case "kg":
      return perUnit(amount, "kg");
    case "ml":
      return amount <= 250 ? perUnit(amount / 100, "100 ml") : perUnit(amount / 1000, "l");
    case "l":
      return perUnit(amount, "l");
    case "m":
      return perUnit(amount, "m");
    case "m2":
      return perUnit(amount, "m²");
    case "stueck":
      return amount > 1 ? perUnit(amount, "Stück") : null;
  }
}

const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export function formatBasePrice(bp: BasePrice | null): string {
  return bp ? `${euro.format(bp.cents / 100)}/${bp.per}` : "";
}

/** "500" oder "0,75" -> Zahl; null bei Unsinn. */
export function parseAmount(input: string): number | null {
  const cleaned = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,3})?$/.test(cleaned)) return null;
  const n = parseFloat(cleaned);
  return n > 0 ? n : null;
}

export function formatAmount(amount: number | null | undefined, unit: string | null | undefined): string {
  if (!amount || !unit) return "";
  const label = unit === "m2" ? "m²" : unit === "stueck" ? "Stück" : unit;
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 3 }).format(amount)} ${label}`;
}
