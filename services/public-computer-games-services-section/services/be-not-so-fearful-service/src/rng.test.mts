// rng.test — the vendored FNV-1a -> mulberry32 stream must actually be deterministic and actually
// well-distributed enough to drive level generation (a stream that always returns ~0.5 would pass
// a naive "is it a number" test while being useless). Also proves the "subsystem-namespaced seed"
// discipline the header comment promises: two different namespaced seeds derived from the same
// root produce independent-looking streams, not the same stream twice.
import { test } from "node:test";
import assert from "node:assert/strict";
import { hashSeed, makeRng } from "./rng.mts";

test("rng: hashSeed is a pure, deterministic 32-bit unsigned fold", () => {
  assert.strictEqual(hashSeed("hello"), hashSeed("hello"));
  assert.notStrictEqual(hashSeed("hello"), hashSeed("hellp"));
  const h = hashSeed("bnsf:tier-1");
  assert.ok(Number.isInteger(h) && h >= 0 && h <= 0xffffffff);
});

test("rng: makeRng is deterministic across independent instantiations from the same seed", () => {
  const a = makeRng("extraction-run-42");
  const b = makeRng("extraction-run-42");
  const seqA = Array.from({ length: 20 }, () => a.next());
  const seqB = Array.from({ length: 20 }, () => b.next());
  assert.deepStrictEqual(seqA, seqB);
});

test("rng: distinct namespaced seeds derived from one root produce independent streams", () => {
  const geometry = makeRng("seed-7:geometry");
  const anomalies = makeRng("seed-7:anomalies");
  const a = Array.from({ length: 10 }, () => geometry.next());
  const b = Array.from({ length: 10 }, () => anomalies.next());
  assert.notDeepStrictEqual(a, b);
});

test("rng: next() stays within [0,1) over a large sample, with real spread (not a stuck generator)", () => {
  const r = makeRng("distribution-check");
  const samples = Array.from({ length: 5000 }, () => r.next());
  for (const s of samples) {
    assert.ok(s >= 0 && s < 1, `sample ${s} out of [0,1)`);
  }
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  assert.ok(Math.abs(mean - 0.5) < 0.03, `mean ${mean} should be close to 0.5 over 5000 samples`);
  const distinct = new Set(samples).size;
  assert.ok(distinct > 4900, `expected near-all-distinct samples, got ${distinct}/5000`);
});

test("rng: int(min,max) is inclusive on both ends and never escapes the range", () => {
  const r = makeRng("int-range-check");
  const seen = new Set<number>();
  for (let i = 0; i < 2000; i++) {
    const v = r.int(3, 7);
    assert.ok(v >= 3 && v <= 7 && Number.isInteger(v));
    seen.add(v);
  }
  assert.deepStrictEqual([...seen].sort(), [3, 4, 5, 6, 7]);
});

test("rng: chance(p) approximates its probability over many draws", () => {
  const r = makeRng("chance-check");
  let hits = 0;
  const n = 4000;
  for (let i = 0; i < n; i++) if (r.chance(0.25)) hits++;
  const rate = hits / n;
  assert.ok(Math.abs(rate - 0.25) < 0.03, `chance(0.25) rate ${rate} should be near 0.25 over ${n} draws`);
});

test("rng: pick returns undefined for empty input, and only ever items from the array otherwise", () => {
  const r = makeRng("pick-check");
  assert.strictEqual(r.pick([]), undefined);
  const items = ["a", "b", "c", "d"];
  for (let i = 0; i < 200; i++) {
    const picked = r.pick(items);
    assert.ok(picked !== undefined && items.includes(picked));
  }
});

test("rng: shuffle is a pure permutation (same multiset, original array untouched) and deterministic per-seed", () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8];
  const r1 = makeRng("shuffle-check");
  const shuffled = r1.shuffle(items);
  assert.deepStrictEqual(items, [1, 2, 3, 4, 5, 6, 7, 8], "shuffle must not mutate its input");
  assert.deepStrictEqual([...shuffled].sort((a, b) => a - b), items, "shuffle must be a permutation of the same multiset");

  const r2 = makeRng("shuffle-check");
  assert.deepStrictEqual(r2.shuffle(items), shuffled, "shuffle must be deterministic given the same seed");
});
