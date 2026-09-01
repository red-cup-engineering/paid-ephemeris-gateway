import { test } from "node:test";
import assert from "node:assert/strict";
import { authored, combine, computed, isAuthored, isComputed } from "./provenance.mts";

test("computed() tags computed-from-your-graph and carries a label", () => {
  const t = computed(1.6180339887, "power iteration over your graph");
  assert.equal(t.value, 1.6180339887);
  assert.equal(t.provenance, "computed-from-your-graph");
  assert.equal(isComputed(t), true);
  assert.equal(isAuthored(t), false);
});

test("authored() tags designed-flavor", () => {
  const t = authored(1.1, "starting-cash prestige bonus curve");
  assert.equal(t.provenance, "designed-flavor");
  assert.equal(isAuthored(t), true);
  assert.equal(isComputed(t), false);
});

test("combine() of a computed and an authored value is always designed-flavor, never computed", () => {
  const lambda = computed(0.667, "dominant eigenvalue");
  const bonus = authored(1.2, "prestige bonus");
  const blended = combine(lambda, bonus, (l, b) => l * b, "lambda x prestige bonus");
  assert.equal(blended.provenance, "designed-flavor");
  assert.ok(Math.abs(blended.value - 0.8004) < 1e-9);
});

test("combine() of two computed values is still designed-flavor (the rule is about the OPERATION, not just the inputs)", () => {
  const a = computed(2, "a");
  const b = computed(3, "b");
  const c = combine(a, b, (x, y) => x + y, "a+b");
  assert.equal(c.provenance, "designed-flavor");
});
