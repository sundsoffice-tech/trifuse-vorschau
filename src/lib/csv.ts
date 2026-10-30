/** CSV für Excel und Buchhaltungsprogramme im deutschsprachigen Raum: Semikolon, Komma als Dezimalzeichen, BOM. */
export type CsvCell = string | number | Date | null | undefined;

export function csvEuro(cents: number | null | undefined): string {
  return cents == null ? "" : (cents / 100).toFixed(2).replace(".", ",");
}

function cell(v: CsvCell): string {
  if (v == null) return "";
  const s = v instanceof Date ? v.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildCsv(header: string[], rows: CsvCell[][]): string {
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}
