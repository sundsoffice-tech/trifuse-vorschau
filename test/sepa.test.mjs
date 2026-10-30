import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { isValidIban, normalizeIban } from "../src/lib/iban.ts";
import { buildPain001, sepaText } from "../src/lib/sepa.ts";
import { buildCsv, csvEuro } from "../src/lib/csv.ts";

test("IBAN-Prüfziffer und Länge", () => {
  assert.ok(isValidIban("DE02 1203 0000 0000 2020 51"));
  assert.ok(isValidIban("DE75512108001245126199"));
  assert.ok(isValidIban("AT483200000012345864"));
  assert.ok(!isValidIban("DE02120300000000202052"), "falsche Prüfziffer");
  assert.ok(!isValidIban("DE0212030000000020205"), "zu kurz");
  assert.ok(!isValidIban("XX00"));
  assert.equal(normalizeIban(" de75 5121 "), "DE755121");
});

test("SEPA-Zeichensatz: Umlaute umgeschrieben, Rest bereinigt, Länge begrenzt", () => {
  assert.equal(sepaText("Auszahlung Oktober 2026, Ton & Tisch (Müller/Straße)"), "Auszahlung Oktober 2026, Ton + Tisch (Mueller/Strasse)");
  assert.equal(sepaText("Wiesenkram 🌿 „Hof“"), "Wiesenkram Hof");
  assert.equal(sepaText("x".repeat(200), 35).length, 35);
});

test("pain.001.001.09: Summen, Anzahl, Pflichtfelder, wohlgeformt", () => {
  const xml = buildPain001({
    msgId: "TRIFUSE-TEST-1",
    createdAt: new Date("2026-10-30T12:00:00Z"),
    executionDate: "2026-10-31",
    debtor: { name: "trifuse.store GbR", iban: "DE02120300000000202051" },
    transfers: [
      { endToEndId: "payout1", name: "Wiesenkram", iban: "DE75 5121 0800 1245 1261 99", amountCents: 637, remittance: "Auszahlung Oktober 2026, Wiesenkram" },
      { endToEndId: "payout2", name: "Lichtwerk MG", iban: "DE02120300000000202051", amountCents: 8160, remittance: "Auszahlung Oktober 2026, Lichtwerk MG" },
    ],
  });
  assert.match(xml, /<NbOfTxs>2<\/NbOfTxs>[\s\S]*<CtrlSum>87\.97<\/CtrlSum>/);
  assert.match(xml, /<InstdAmt Ccy="EUR">6\.37<\/InstdAmt>/);
  assert.match(xml, /<IBAN>DE75512108001245126199<\/IBAN>/);
  assert.match(xml, /<ReqdExctnDt><Dt>2026-10-31<\/Dt><\/ReqdExctnDt>/);
  assert.match(xml, /<DbtrAgt><FinInstnId><Othr><Id>NOTPROVIDED<\/Id><\/Othr><\/FinInstnId><\/DbtrAgt>/);
  assert.match(xml, /xmlns="urn:iso:std:iso:20022:tech:xsd:pain\.001\.001\.09"/);
  assert.throws(() => buildPain001({ msgId: "x", createdAt: new Date(), executionDate: "2026-10-31", debtor: { name: "a", iban: "b" }, transfers: [{ endToEndId: "e", name: "n", iban: "i", amountCents: 0, remittance: "r" }] }), /positiv/);
  // Wohlgeformtheit mit xmllint, wenn vorhanden (im Cloud-Container ja)
  try {
    const dir = mkdtempSync(path.join(tmpdir(), "sepa-"));
    const file = path.join(dir, "pain.xml");
    writeFileSync(file, xml);
    execFileSync("xmllint", ["--noout", file]);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
});

test("CSV: Semikolon, Komma, Anführungszeichen, BOM", () => {
  const csv = buildCsv(["Datum", "Text", "Betrag"], [[new Date(2026, 9, 30), 'Ton & Tisch; "Schale"', csvEuro(1234)]]);
  assert.ok(csv.startsWith("﻿Datum;Text;Betrag\r\n"));
  assert.ok(csv.includes('30.10.2026;"Ton & Tisch; ""Schale""";12,34\r\n'));
});
