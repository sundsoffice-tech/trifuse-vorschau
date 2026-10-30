import "server-only";
import { db } from "@/lib/db";
import { parseCsv } from "@/lib/csv-parse";
import { parseEuroToCents } from "@/lib/money";
import { parseAmount, isContentUnit } from "@/lib/grundpreis";
import { createProduct, type ProductInput } from "./product-service";
import type { ProductStatus } from "@prisma/client";

export const IMPORT_COLUMNS = ["macher", "titel", "beschreibung", "preis", "bestand", "art", "artikelnummer", "versand", "inhalt_menge", "inhalt_einheit", "status"] as const;
export const IMPORT_EXAMPLE = `macher;titel;beschreibung;preis;bestand;art;artikelnummer;versand;inhalt_menge;inhalt_einheit;status
wiesenkram;Lindenhonig 250 g;Mild und hell, aus eigener Imkerei.;6,90;20;geschenke;WK-LH-250;lager;250;g;shop
tonundtisch@example.com;Espressotasse Salbei;Steinzeug, 80 ml, spülmaschinenfest.;18,00;8;kueche;;selbst;;;entwurf`;

export type ImportRow = { line: number; input: Record<string, string>; vendorId?: string; vendorName?: string; data?: ProductInput; status?: ProductStatus; errors: string[] };

/** Prüft jede Zeile; nichts wird geschrieben. Macher über Slug oder E-Mail, Art über Slug oder Namen. */
export async function checkImport(text: string): Promise<{ rows: ImportRow[]; missing: string[] }> {
  const { header, rows } = parseCsv(text);
  const missing = ["macher", "titel", "preis"].filter((c) => !header.includes(c));
  if (missing.length) return { rows: [], missing };
  const [vendors, categories] = await Promise.all([db.vendor.findMany({ select: { id: true, slug: true, email: true, name: true, status: true } }), db.category.findMany({ select: { id: true, slug: true, name: true } })]);
  const out: ImportRow[] = rows.map((input, idx) => {
    const errors: string[] = [];
    const key = input.macher.toLowerCase();
    const vendor = vendors.find((v) => v.slug === key || v.email.toLowerCase() === key || v.name.toLowerCase() === key);
    if (!vendor) errors.push(`Macher „${input.macher}“ nicht gefunden (Slug, E-Mail oder Name).`);
    else if (vendor.status !== "ACTIVE") errors.push(`Macher ${vendor.name} ist nicht aktiv.`);
    const title = input.titel;
    if (title.length < 3) errors.push("Titel zu kurz.");
    const priceCents = parseEuroToCents(input.preis);
    if (priceCents == null || priceCents <= 0) errors.push(`Preis „${input.preis}“ unlesbar.`);
    const stock = input.bestand === "" ? 0 : parseInt(input.bestand, 10);
    if (!Number.isInteger(stock) || stock < 0) errors.push(`Bestand „${input.bestand}“ unlesbar.`);
    const catKey = (input.art ?? "").toLowerCase();
    const category = catKey ? categories.find((c) => c.slug === catKey || c.name.toLowerCase() === catKey) : null;
    if (!category) errors.push(catKey ? `Art „${input.art}“ nicht gefunden.` : "Art fehlt.");
    const versand = (input.versand ?? "lager").toLowerCase();
    if (!["lager", "selbst", ""].includes(versand)) errors.push(`Versand „${input.versand}“: lager oder selbst.`);
    const amountRaw = input.inhalt_menge ?? "";
    const unitRaw = (input.inhalt_einheit ?? "").toLowerCase();
    const contentAmount = amountRaw ? parseAmount(amountRaw) : null;
    if (amountRaw && contentAmount == null) errors.push(`Inhalt „${amountRaw}“ unlesbar.`);
    if (amountRaw && !isContentUnit(unitRaw)) errors.push(`Einheit „${unitRaw}“: g, kg, ml, l, m, m2 oder stueck.`);
    const statusRaw = (input.status ?? "entwurf").toLowerCase();
    const status: ProductStatus = statusRaw === "shop" ? "ACTIVE" : statusRaw === "freigabe" ? "PENDING" : "DRAFT";
    if (!["shop", "freigabe", "entwurf", ""].includes(statusRaw)) errors.push(`Status „${input.status}“: shop, freigabe oder entwurf.`);
    const row: ImportRow = { line: idx + 2, input, errors };
    if (errors.length === 0 && vendor && category) {
      row.vendorId = vendor.id;
      row.vendorName = vendor.name;
      row.status = status;
      row.data = {
        title, description: (input.beschreibung ?? "").slice(0, 5000), priceCents: priceCents!, compareAtCents: null, stock, sku: (input.artikelnummer ?? "").slice(0, 60),
        categoryId: category.id, shippingBy: versand === "selbst" ? "VENDOR" : "WAREHOUSE", weightGrams: null,
        contentAmount, contentUnit: amountRaw && isContentUnit(unitRaw) ? unitRaw : null,
      };
    }
    return row;
  });
  return { rows: out, missing: [] };
}

/** Legt alle fehlerfreien Zeilen an. Zeilen mit Fehlern bleiben liegen; der Rest geht trotzdem durch. */
export async function runImport(text: string): Promise<{ created: number; skipped: number; rows: ImportRow[] }> {
  const { rows, missing } = await checkImport(text);
  if (missing.length) throw new Error(`Spalten fehlen: ${missing.join(", ")}`);
  let created = 0;
  for (const r of rows) {
    if (!r.data || !r.vendorId || !r.status) continue;
    await createProduct(r.vendorId, r.data, r.status);
    created++;
  }
  return { created, skipped: rows.length - created, rows };
}
