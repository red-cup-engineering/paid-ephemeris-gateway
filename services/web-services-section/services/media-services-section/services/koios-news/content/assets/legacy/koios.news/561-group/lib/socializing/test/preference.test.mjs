// Theorem-shaped tests for socializing's COLLECTIVE-PREFERENCE aggregation — the corpus's
// escape from ARROW'S IMPOSSIBILITY / the CONDORCET PARADOX, built on a layer-1 capability:
// a Condorcet cycle IS a non-trivial periodic orbit, and the monotone ≤_k settling provably
// has none (closure-monad-no-non-trivial-periodic-orbits.md). Run against the built dist.
import { test } from "node:test";
import assert from "node:assert/strict";

import { aggregatePreferences } from "../dist/index.mjs";
import { admitSeed, descend } from "@emsenn/animating";

const membrane = (seed) => descend(admitSeed(seed)).utterances;

test("the Condorcet PARADOX is dissolved: majority rule cycles, the ≤_k aggregation does NOT", () => {
  // the classic profile: v1 A≻B≻C, v2 B≻C≻A, v3 C≻A≻B. Each pair has a 2–1 majority and the
  // majorities CYCLE (A≻B, B≻C, C≻A) — the Condorcet paradox / the face of Arrow's impossibility.
  const profile =
    "v1|A>B\nv1|B>C\nv1|A>C\n" +
    "v2|B>C\nv2|C>A\nv2|B>A\n" +
    "v3|C>A\nv3|A>B\nv3|C>B";
  const r = aggregatePreferences(membrane(profile));
  assert.equal(r.kind, "socializing.collective-preference");

  // majority rule WOULD produce the intransitive cycle — a genuine paradox.
  assert.equal(r.majorityCyclic, true, "majority resolution of every pair closes a directed cycle");

  // the bilattice holds every split pair as ⊤ INCOMPARABLE instead of orienting it…
  assert.equal(r.contested, 3, "all three split pairs settle to ⊤ (incomparable)");
  assert.equal(r.decided, 0);
  assert.ok(r.pairs.every((p) => p.winner === "incomparable"));

  // …so the social preference is ACYCLIC — NO Condorcet cycle. The no-non-trivial-periodic-orbit
  // theorem guarantees it: a cycle is a periodic orbit the monotone ≤_k settling cannot have.
  assert.equal(r.acyclic, true, "the partial social order has no Condorcet cycle");
  // the price is honest: completeness is relaxed (Arrow's escape), not non-dictatorship/transitivity.
  assert.equal(r.complete, false, "the order is PARTIAL — completeness dropped, the bilattice's ⊤");
});

test("a coherent society yields a CLEAN complete total order (no false dissent)", () => {
  // everyone shares A≻B≻C — no split, so every pair decides a clean direction.
  const agreed = "v1|A>B\nv1|B>C\nv1|A>C\nv2|A>B\nv2|B>C\nv2|A>C";
  const r = aggregatePreferences(membrane(agreed));
  assert.equal(r.decided, 3);
  assert.equal(r.contested, 0);
  assert.equal(r.acyclic, true);
  assert.equal(r.complete, true, "unanimous direction on every pair ⇒ a complete total order");
  assert.equal(r.majorityCyclic, false, "no paradox to avoid here");
  assert.deepEqual(r.pairs.map((p) => p.winner), ["a", "a", "a"]); // A≻B, A≻C, B≻C
});

test("a partial split: some pairs decided, the genuinely-contested ones held ⊤ — still acyclic", () => {
  // agreement on A≻B and B≻C, but a split on A vs C → that one pair is ⊤, the order stays acyclic.
  const mixed = "v1|A>B\nv2|A>B\nv1|B>C\nv2|B>C\nv1|A>C\nv2|C>A";
  const r = aggregatePreferences(membrane(mixed));
  assert.equal(r.decided, 2, "A/B and B/C decide cleanly");
  assert.equal(r.contested, 1, "A/C is split → held ⊤ incomparable");
  assert.equal(r.acyclic, true);
  assert.equal(r.complete, false);
});
