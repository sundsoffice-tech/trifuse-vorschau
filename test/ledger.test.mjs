import test from "node:test";
import assert from "node:assert/strict";
import { reversalAmounts, sumFrozen } from "../src/lib/ledger.ts";
import { splitLine } from "../src/lib/money.ts";

test("Teil-Rückbuchungen ergeben zusammen exakt die Position", () => {
  for (const [qty, unit, pct] of [[3, 890, 15], [7, 333, 33.3], [2, 1, 15], [5, 1999, 12.5], [1, 4500, 0]]) {
    const lineTotalCents = qty * unit;
    const { commissionCents } = splitLine(lineTotalCents, pct);
    const item = { quantity: qty, lineTotalCents, commissionCents };
    const parts = [];
    for (let i = 0; i < qty; i++) {
      const done = sumFrozen(parts);
      const r = reversalAmounts(item, done, 1);
      assert.equal(r.lineTotalCents - r.commissionCents, r.vendorNetCents);
      assert.ok(r.lineTotalCents >= 0 && r.commissionCents >= 0 && r.vendorNetCents >= 0, `${qty}x${unit} @ ${pct}: Teil ${i}`);
      parts.push({ quantity: 1, ...r });
    }
    const all = sumFrozen(parts);
    assert.equal(all.lineTotalCents, lineTotalCents, `Verkaufspreis ${qty}x${unit}`);
    assert.equal(all.commissionCents, commissionCents, `Provision ${qty}x${unit} @ ${pct}`);
    assert.equal(parts.reduce((s, p) => s + p.vendorNetCents, 0), lineTotalCents - commissionCents);
  }
});

test("Mehr als offen geht nicht, Null geht nicht", () => {
  const item = { quantity: 2, lineTotalCents: 2000, commissionCents: 300 };
  assert.throws(() => reversalAmounts(item, { quantity: 0, lineTotalCents: 0, commissionCents: 0 }, 3), /nur noch 2 Stück/);
  assert.throws(() => reversalAmounts(item, { quantity: 2, lineTotalCents: 2000, commissionCents: 300 }, 1), /nur noch 0 Stück/);
  assert.throws(() => reversalAmounts(item, { quantity: 0, lineTotalCents: 0, commissionCents: 0 }, 0), /mindestens 1/);
  assert.deepEqual(reversalAmounts(item, { quantity: 0, lineTotalCents: 0, commissionCents: 0 }, 2), { lineTotalCents: 2000, commissionCents: 300, vendorNetCents: 1700 });
});
