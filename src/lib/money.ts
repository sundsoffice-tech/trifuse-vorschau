const formatter = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

/** "12,90" oder "12.90" oder "12" -> 1290. Gibt null bei Unsinn zurück. */
export function parseEuroToCents(input: string): number | null {
  const cleaned = input.trim().replace(/\s/g, "").replace("€", "");
  if (!/^\d+([.,]\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.replace(",", ".").split(".");
  return parseInt(whole, 10) * 100 + parseInt((frac + "00").slice(0, 2), 10);
}

export function centsToEuroInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Provision kaufmännisch gerundet; Händleranteil ist der Rest, damit die Summe stimmt. */
export function splitLine(lineTotalCents: number, commissionPercent: number) {
  const commissionCents = Math.round((lineTotalCents * commissionPercent) / 100);
  return { commissionCents, vendorNetCents: lineTotalCents - commissionCents };
}
