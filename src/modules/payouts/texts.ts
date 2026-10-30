/** Verwendungszweck einer Auszahlung, so wie er auf dem Kontoauszug des Machers steht. */
export function payoutReference(createdAt: Date, vendorName: string): string {
  const monat = createdAt.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  return `Auszahlung ${monat}, ${vendorName}`;
}
