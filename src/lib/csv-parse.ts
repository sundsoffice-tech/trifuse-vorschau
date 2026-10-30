/** CSV lesen (Semikolon oder Komma, Anführungszeichen, BOM, CRLF). Erste Zeile sind die Spaltennamen. */
export function parseCsv(text: string): { header: string[]; rows: Record<string, string>[] } {
  const src = text.replace(/^\ufeff/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const records: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); records.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); records.push(row); }
  const nonEmpty = records.filter((r) => r.some((v) => v.trim() !== ""));
  const header = (nonEmpty.shift() ?? []).map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows = nonEmpty.map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
  return { header, rows };
}
