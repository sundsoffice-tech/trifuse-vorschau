/**
 * Herstellerangaben nach der EU-Produktsicherheitsverordnung (GPSR, gilt seit 13.12.2024): Name, Postanschrift
 * und elektronische Kontaktadresse des Herstellers müssen beim Online-Angebot stehen. Fehlen eigene Angaben,
 * gilt der Macher selbst, sofern seine Anschrift vollständig ist.
 */
export type VendorForManufacturer = { name: string; email: string; addressLine: string; postalCode: string; city: string; manufacturerName: string; manufacturerAddress: string; manufacturerEmail: string };

export function manufacturerInfo(v: VendorForManufacturer): { name: string; address: string; email: string } | null {
  const name = v.manufacturerName || v.name;
  const address = v.manufacturerAddress || (v.addressLine && v.postalCode && v.city ? `${v.addressLine}, ${v.postalCode} ${v.city}` : "");
  const email = v.manufacturerEmail || v.email;
  if (!name || !address || !email) return null;
  return { name, address, email };
}
