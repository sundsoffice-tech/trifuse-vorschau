import test from "node:test";
import assert from "node:assert/strict";
import { basePrice, formatBasePrice, parseAmount } from "../src/lib/grundpreis.ts";

const plain = (s) => s.replace(/ /g, " ");

test("Grundpreis nach PAngV: kg/l ab 250, sonst je 100", () => {
  assert.deepEqual(basePrice(890, 500, "g"), { cents: 1780, per: "kg" });
  assert.deepEqual(basePrice(590, 100, "g"), { cents: 590, per: "100 g" });
  assert.deepEqual(basePrice(690, 50, "g"), { cents: 1380, per: "100 g" });
  assert.deepEqual(basePrice(450, 10, "ml"), { cents: 4500, per: "100 ml" });
  assert.deepEqual(basePrice(1200, 0.75, "l"), { cents: 1600, per: "l" });
  assert.deepEqual(basePrice(1450, 6, "stueck"), { cents: 242, per: "Stück" });
  assert.equal(basePrice(1450, 1, "stueck"), null);
  assert.equal(basePrice(1450, null, null), null);
  assert.equal(basePrice(1450, 5, "unsinn"), null);
  assert.equal(plain(formatBasePrice(basePrice(890, 500, "g"))), "17,80 €/kg");
});

test("Mengen-Eingabe akzeptiert Komma und lehnt Unsinn ab", () => {
  assert.equal(parseAmount("500"), 500);
  assert.equal(parseAmount("0,75"), 0.75);
  assert.equal(parseAmount("0"), null);
  assert.equal(parseAmount("abc"), null);
});
