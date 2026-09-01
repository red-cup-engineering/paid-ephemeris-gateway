import { test } from "node:test";
import assert from "node:assert/strict";
import { authored, combine, computed, isAuthored, isComputed } from "./provenance.mts";

test("computed() tags exactly 'computed-from-your-graph', authored() tags exactly 'designed-flavor' — there is no third provenance", () => {
  const c = computed(1, "a real readout");
  const a = authored(1, "a chosen curve");
  assert.equal(c.provenance, "computed-from-your-graph");
  assert.equal(a.provenance, "designed-flavor");
  assert.equal(isComputed(c), true);
  assert.equal(isAuthored(c), false);
  assert.equal(isComputed(a), false);
  assert.equal(isAuthored(a), true);
});

test("every Tagged value carries a nonempty label — an untagged-but-typed value is the exact failure mode this module exists to prevent", () => {
  const c = computed(1, "label");
  assert.ok(c.label.length > 0);
});

test("combine() always yields 'designed-flavor', even when both inputs were computed — a value touched by any authored input is no longer a pure readout", () => {
  const a = computed(3, "from the graph");
  const b = computed(4, "also from the graph");
  const result = combine(a, b, (x, y) => x + y, "sum of two computed values, still combined by an authored rule");
  assert.equal(result.provenance, "designed-flavor");
  assert.equal(result.value, 7);
});
