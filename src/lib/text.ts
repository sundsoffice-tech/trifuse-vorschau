/** „1 Produkt“, „2 Produkte“: nie wieder „1 Produkte“ (Künstler-Fund 42). */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** IBAN in Vierergruppen, damit ein Zahlendreher auffällt (Künstler N20). */
export function formatIban(iban: string): string {
  return iban.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}
