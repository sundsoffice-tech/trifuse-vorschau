import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "../src/lib/csv-parse.ts";

test("CSV mit Semikolon, Anführungszeichen, BOM und CRLF", () => {
  const { header, rows } = parseCsv('\ufeffMacher;Titel;Preis\r\nwiesenkram;"Honig; mild";6,90\r\n"ton";"Tasse ""Salbei""";18\r\n\r\n');
  assert.deepEqual(header, ["macher", "titel", "preis"]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].titel, "Honig; mild");
  assert.equal(rows[1].titel, 'Tasse "Salbei"');
});

test("CSV mit Komma und fehlenden Zellen", () => {
  const { rows } = parseCsv("macher,titel,preis,bestand\nwiesenkram,Tee,4.50\n");
  assert.equal(rows[0].bestand, "");
  assert.equal(rows[0].preis, "4.50");
});
