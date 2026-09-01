/**
 * `attention.test` — tier 3's pedagogy, made checkable: marginal yield is STRICTLY decreasing in
 * allocation (diminishing returns), and `marginalYield` is the literal derivative of `yield_`, not
 * an unrelated flavor number shaped to look decreasing. The test named
 * "marginalYield IS the derivative of yield_" is the one that proves the mechanic, not just the
 * shape — DESIGN.md §2's own claim about this tier.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FACULTY_IDS } from "./state.mts";
import { FACULTY_K, marginalYield, reallocate, summarizeAllocation, yield_ } from "./attention.mts";

test("pedagogy (tier 3, diminishing returns): marginalYield is strictly decreasing in allocation, for every faculty", () => {
  for (const f of FACULTY_IDS) {
    const samples = [1, 2, 4, 8, 16, 32].map((a) => marginalYield(f, a));
    for (let i = 1; i < samples.length; i++) {
      assert.ok(samples[i]! < samples[i - 1]!, `faculty ${f}: marginalYield(${samples[i]}) at a larger allocation must be strictly less than at a smaller one`);
    }
  }
});

test("pedagogy (tier 3): marginalYield(a=0) is +Infinity — the very first unit is worth the most, without dividing by zero into NaN", () => {
  for (const f of FACULTY_IDS) {
    assert.equal(marginalYield(f, 0), Infinity);
  }
});

test("marginalYield IS the numerical derivative of yield_ (within a small tolerance) — not an independently-authored 'looks decreasing' curve", () => {
  const h = 1e-6;
  for (const f of FACULTY_IDS) {
    for (const a of [0.5, 2, 10, 25]) {
      const numericDerivative = (yield_(f, a + h) - yield_(f, a - h)) / (2 * h);
      const analytic = marginalYield(f, a);
      const relErr = Math.abs(numericDerivative - analytic) / Math.max(1e-9, Math.abs(analytic));
      assert.ok(relErr < 1e-4, `faculty ${f} at a=${a}: numeric derivative ${numericDerivative} vs analytic marginalYield ${analytic}, rel err ${relErr}`);
    }
  }
});

test("yield_ and marginalYield reject negative allocation", () => {
  assert.throws(() => yield_("memory", -1), RangeError);
  assert.throws(() => marginalYield("memory", -1), RangeError);
});

test("FACULTY_K gives each faculty a distinct productivity constant — a real allocation DECISION, not three identical sliders", () => {
  const values = new Set(FACULTY_IDS.map((f) => FACULTY_K[f]));
  assert.equal(values.size, FACULTY_IDS.length);
});

test("reallocate never exceeds the pool: an over-request is scaled down proportionally, not refused outright", () => {
  const out = reallocate(10, { memory: 8, perception: 8, synthesis: 0 });
  const total = FACULTY_IDS.reduce((s, f) => s + out[f], 0);
  assert.ok(total <= 10 + 1e-9);
  assert.ok(Math.abs(out.memory - out.perception) < 1e-9, "proportional scaling preserves the requested ratio between faculties");
});

test("reallocate clamps negative requests to zero", () => {
  const out = reallocate(10, { memory: -5, perception: 3, synthesis: 0 });
  assert.equal(out.memory, 0);
  assert.equal(out.perception, 3);
});

test("summarizeAllocation's totalYield is tagged designed-flavor (an authored curve), never computed-from-your-graph", () => {
  const totals = summarizeAllocation({ memory: 4, perception: 2, synthesis: 1 });
  assert.equal(totals.totalYield.provenance, "designed-flavor");
  assert.equal(totals.totalAllocated, 7);
});
