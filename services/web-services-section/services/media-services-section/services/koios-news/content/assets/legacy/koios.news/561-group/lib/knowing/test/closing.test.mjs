// Theorem-shaped tests for knowing's semantic face: forming concepts (FCA).
// The formal context is a formal context; a concept is a closed (extent, intent) fixed point of
// the Galois closure, which IS the settling closure (RelMath.FCALambekCircle).
import { test } from "node:test";
import assert from "node:assert/strict";

import { formalContext, intentOf, extentOf, closeExtent, conceptsOf, conceptOfExtent, closureLaws } from "@emsenn/knowing";

// G = three documents, M = three frontmatter facts.
const ctx = formalContext(
  ["mark.md", "utterance.md", "logic.md"],
  ["introduces:method", "tag:logic", "tag:foundational"],
  [["mark.md", "tag:foundational"], ["utterance.md", "tag:foundational"], ["logic.md", "introduces:method"], ["logic.md", "tag:logic"]],
);

test("the derivation operators form a Galois connection (A ⊆ B' ⟺ B ⊆ A')", () => {
  const A = ["mark.md", "utterance.md"];
  const B = intentOf(ctx, A);                              // A'
  assert.deepEqual(B, ["tag:foundational"]);
  assert.ok(A.every((g) => extentOf(ctx, B).includes(g))); // A ⊆ B'  (B = A' ⟹ A ⊆ A'')
});

test("a concept is a closed (extent, intent) fixed point: A' = B, B' = A", () => {
  const c = conceptOfExtent(ctx, ["logic.md"]);
  assert.deepEqual(c.intent, ["introduces:method", "tag:logic"]);
  assert.deepEqual(c.extent, ["logic.md"]);
  // closed: extentOf(intent) = extent and intentOf(extent) = intent
  assert.deepEqual(extentOf(ctx, c.intent), c.extent);
  assert.deepEqual(intentOf(ctx, c.extent), c.intent);
});

test("the closure A ↦ A'' IS the settling closure: extensive, monotone, idempotent", () => {
  const w = closureLaws(ctx);
  assert.ok(w.extensive && w.monotone && w.idempotent);
  // a direct idempotence check: A'' = A''''
  const A = ["mark.md"];
  assert.deepEqual(closeExtent(ctx, A), closeExtent(ctx, closeExtent(ctx, A)));
});

test("conceptsOf returns genuine concepts — every entry is closed", () => {
  const concepts = conceptsOf(ctx);
  assert.ok(concepts.length >= 3);
  for (const c of concepts) {
    assert.equal(c.kind, "knowing.closing.concept");
    assert.deepEqual(extentOf(ctx, c.intent), c.extent);   // closed pair
    assert.deepEqual(intentOf(ctx, c.extent), c.intent);
  }
});
