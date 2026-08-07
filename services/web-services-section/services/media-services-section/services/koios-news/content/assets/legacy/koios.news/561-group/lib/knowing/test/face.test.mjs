// Theorem-shaped tests for knowing's INSIDE face on the KNOWLEDGE axis (≤_k), run
// against the built dist. Each name is a falsifiable claim from
// dev/docs/notes/2026-06-21-bulk-over-faces-local-section-threading.md: knowing's
// inside face is its OWN comonad accumulation (foldSection over ≤_k), NOT a generic
// relating descend — the held section's depth IS the memory, and the ≤_k TOP ("told
// both") cells are exactly the contested ones.
import { test } from "node:test";
import assert from "node:assert/strict";

import { utterance, mark } from "@emsenn/relating";
import { knowingFace } from "../dist/index.mjs";

const utt = (subject, claim) => utterance(mark(subject), mark(claim));

test("the face contract: knowingFace yields the thin triad on the knowledge axis", () => {
  const face = knowingFace([utt("alice", "knows-lean"), utt("bob", "knows-ts")]);
  assert.equal(face.kind, "knowing.face");
  assert.equal(face.faculty, "knowing");
  assert.equal(face.direction, "inside");
  assert.equal(face.axis, "knowledge");
  // every thin field is an integer ≥ 0 (the bulk's Face contract).
  for (const k of ["cover", "held", "contested", "depth"]) {
    assert.ok(Number.isInteger(face[k]) && face[k] >= 0, `${k} is a non-negative integer`);
  }
});

test("the empty membrane glues the zero section (cover = held = contested = 0)", () => {
  const face = knowingFace([]);
  assert.equal(face.cover, 0);
  assert.equal(face.held, 0);
  assert.equal(face.contested, 0);
  assert.equal(face.depth, 0);
  assert.equal(face.aggregate, "absurd"); // the ≤_k bottom ⊥
});

test("absorption above ⊥: each distinct for-utterance is a held (settled) cell, none contested", () => {
  const face = knowingFace([utt("alice", "knows-lean"), utt("bob", "knows-ts")]);
  assert.equal(face.cover, 2);
  assert.equal(face.held, 2); // both accumulated above the ≤_k bottom ⊥
  assert.equal(face.depth, 2); // the depth IS the memory
  assert.equal(face.contested, 0); // no held contradiction
  assert.equal(face.aggregate, "potential"); // for-only ⇒ ≤_k join stays potential
  assert.equal(face.belnap.potential, 2);
});

test("told both ⇒ ≤_k TOP ⊤: a for AND an against on the same cell folds to a contested (stable) cell", () => {
  // same subject·claim asserted once for, once against (a negated claim on the same cell).
  const face = knowingFace([utt("alice", "trustworthy"), utt("alice", "not trustworthy")]);
  // the two utterances share a cell (subject alice, predicate from the negated/affirmed
  // claim — the negation is read off the claim mark, the cell is the same locus), so the
  // ≤_k fold accumulates BOTH sides → stable (⊤, told both).
  assert.equal(face.contested, 1, "the told-both cell is contested");
  assert.equal(face.belnap.stable, 1);
  assert.equal(face.aggregate, "stable"); // the ≤_k top ⊤
});

test("the reading is the comonad fold, not a flat count: coincident for-utterances fold to ONE held cell", () => {
  const face = knowingFace([utt("alice", "knows-lean"), utt("alice", "knows-lean"), utt("alice", "knows-lean")]);
  assert.equal(face.cover, 1, "three coincident utterances fold to one ≤_k cell");
  assert.equal(face.held, 1);
  assert.equal(face.contested, 0);
});
