/** IBAN ohne Leerzeichen, Großbuchstaben. */
export function normalizeIban(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

const lengths: Record<string, number> = { DE: 22, AT: 20, CH: 21, NL: 18, BE: 16, FR: 27, IT: 27, ES: 24, LU: 20, DK: 18, SE: 24, PL: 28, CZ: 24, GB: 22, IE: 22, PT: 25, FI: 18, NO: 15 };

/** Prüfziffer nach ISO 13616 (mod 97) plus Länge für die gängigen Länder. */
export function isValidIban(input: string): boolean {
  const iban = normalizeIban(input);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const expected = lengths[iban.slice(0, 2)];
  if (expected && iban.length !== expected) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const v = ch >= "A" ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of v) remainder = (remainder * 10 + Number(d)) % 97;
  }
  return remainder === 1;
}
