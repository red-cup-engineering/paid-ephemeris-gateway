// Theorem-shaped tests for knowing's syntactic face: find = proof search (Curry–Howard).
// To know a proposition is to hold a proof — a CHL.Tm term of its type — and every
// witness `find` returns is certified by relating's hasTy (the trusted floor).
import { test } from "node:test";
import assert from "node:assert/strict";

import { ty, hasTy } from "@emsenn/relating";
import { find, inhabit } from "@emsenn/knowing";

const A = ty.base(), U = ty.unit();

test("knowing a propositional tautology = finding its proof (A → A by λx.x)", () => {
  const j = find(ty.arrow(A, A));
  assert.equal(j.kind, "knowing.proving.proof:witness");
  assert.deepEqual(j.proof, ["lam", ["var", 0]]);
  assert.ok(hasTy([], j.proof, ty.arrow(A, A)));          // the witness genuinely type-checks
});

test("every witness find returns is hasTy-certified at its proposition", () => {
  const props = [
    ty.unit(),
    ty.arrow(A, ty.arrow(U, A)),                          // K
    ty.arrow(ty.prod(ty.arrow(A, U), A), U),              // modus ponens, ((A→B)×A)→B
    ty.prod(ty.arrow(A, A), ty.unit()),
  ];
  for (const p of props) {
    const j = find(p);
    assert.equal(j.kind, "knowing.proving.proof:witness", JSON.stringify(p));
    assert.ok(hasTy(j.context, j.proof, p), JSON.stringify(p));
  }
});

test("an unprovable proposition yields an obstruction, never a bogus proof", () => {
  const j = find(A);                                       // a bare atom is not provable in the empty context
  assert.equal(j.kind, "knowing.proving.proof-obstruction");
  assert.equal(inhabit([], A), null);
});

test("a hypothesis context lets a goal be known (A ⊢ A×A by ⟨x,x⟩)", () => {
  const j = find(ty.prod(A, A), [A]);
  assert.equal(j.kind, "knowing.proving.proof:witness");
  assert.ok(hasTy([A], j.proof, ty.prod(A, A)));
});
