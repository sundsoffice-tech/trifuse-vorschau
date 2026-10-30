import test from "node:test";
import assert from "node:assert/strict";
import { MemoryRateLimiter, formatRetry } from "../src/lib/rate-limit.ts";

test("Gleitendes Fenster: Grenze, Sperre, Freigabe nach Ablauf", () => {
  const l = new MemoryRateLimiter();
  const t0 = 1_000_000;
  for (let i = 0; i < 5; i++) assert.equal(l.hit("a", 5, 60_000, t0 + i).allowed, true);
  const blocked = l.hit("a", 5, 60_000, t0 + 10);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterMs, 60_000 - 10);
  assert.equal(l.hit("b", 5, 60_000, t0 + 10).allowed, true, "anderer Schlüssel unabhängig");
  assert.equal(l.peek("a", 5, 60_000, t0 + 20).allowed, false, "peek sieht die Sperre, ohne zu zählen");
  assert.equal(l.hit("a", 5, 60_000, t0 + 60_001).allowed, true, "nach Ablauf des ersten Treffers wieder frei");
});

test("Alte Schlüssel werden aufgeräumt", () => {
  const l = new MemoryRateLimiter();
  for (let i = 0; i < 100; i++) l.hit(`k${i}`, 3, 1000, 0);
  l.hit("neu", 3, 1000, 61_000);
  assert.equal(l.size, 1);
});

test("Wartezeit in Worten", () => {
  assert.equal(formatRetry(30_000), "einer Minute");
  assert.equal(formatRetry(5 * 60_000), "5 Minuten");
});
