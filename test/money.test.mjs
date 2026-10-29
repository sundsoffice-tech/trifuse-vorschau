import test from "node:test";
import assert from "node:assert/strict";
import { parseEuroToCents, splitLine, centsToEuroInput } from "../src/lib/money.ts";
import { slugify } from "../src/lib/slug.ts";
import { statusAfterVendorSubmit } from "./helpers/status.mjs";

test("Euro-Eingaben werden korrekt in Cent gewandelt", () => {
  assert.equal(parseEuroToCents("12,90"), 1290);
  assert.equal(parseEuroToCents("12.9"), 1290);
  assert.equal(parseEuroToCents("12"), 1200);
  assert.equal(parseEuroToCents(" 1.234 "), null);
  assert.equal(parseEuroToCents("abc"), null);
  assert.equal(parseEuroToCents("-5"), null);
  assert.equal(centsToEuroInput(1290), "12,90");
});

test("Provision und Haendleranteil ergeben immer den Bruttobetrag", () => {
  for (const [total, pct] of [[1890, 15], [1, 15], [333, 33.3], [9999, 0], [5000, 100], [1250, 12.5]]) {
    const { commissionCents, vendorNetCents } = splitLine(total, pct);
    assert.equal(commissionCents + vendorNetCents, total, `${total} @ ${pct}%`);
    assert.ok(commissionCents >= 0 && vendorNetCents >= 0);
  }
  assert.deepEqual(splitLine(1890, 15), { commissionCents: 284, vendorNetCents: 1606 });
});

test("Slugs sind URL-tauglich und deutsch-freundlich", () => {
  assert.equal(slugify("Müsli-Schale Salbei"), "muesli-schale-salbei");
  assert.equal(slugify("  Groß & Klein!! "), "gross-klein");
  assert.equal(slugify("???"), "eintrag");
});

test("Status nach Haendler-Speichern", () => {
  assert.equal(statusAfterVendorSubmit(false, false), "DRAFT");
  assert.equal(statusAfterVendorSubmit(false, false, "ACTIVE"), "ACTIVE");
  assert.equal(statusAfterVendorSubmit(true, false), "PENDING");
  assert.equal(statusAfterVendorSubmit(true, true), "ACTIVE");
  assert.equal(statusAfterVendorSubmit(true, false, "REJECTED"), "PENDING");
});
