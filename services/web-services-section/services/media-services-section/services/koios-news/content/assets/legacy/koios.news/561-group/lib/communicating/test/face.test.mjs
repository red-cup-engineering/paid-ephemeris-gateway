// Theorem-shaped tests for communicating's ACROSS / TRUTH boundary face — the local
// section animating (the holographic bulk) reads instead of faking the across face with
// a generic relating descend. Each name is a falsifiable claim about the face's identity:
// it is communicating's OWN meme/negate reading on the truth axis (≤_t, negation
// antitone), NOT a generic descend-then-section. See dev/docs/notes/2026-06-21-bulk-
// over-faces-local-section-threading.md.
import { test } from "node:test";
import assert from "node:assert/strict";

import { utterance, mark, isMeme } from "@emsenn/relating";
import {
  communicatingFace,
  membraneMeme,
  COMMUNICATING_FACE_AXIS,
} from "../dist/communicate/face.mjs";

/** A membrane utterance: speaker `who` asserts/denies the claim `what`. */
const said = (who, what) => utterance(mark(who), mark(what));

test("the empty membrane is the empty across face (all zero, truth axis)", () => {
  const face = communicatingFace([]);
  assert.equal(face.kind, "communicating.face");
  assert.equal(face.faculty, "communicating");
  assert.equal(face.direction, "across");
  assert.equal(face.axis, COMMUNICATING_FACE_AXIS);
  assert.equal(face.axis, "truth");
  assert.equal(face.cover, 0);
  assert.equal(face.held, 0);
  assert.equal(face.contested, 0);
  assert.equal(face.utterances, 0);
});

test("the thin triple is integers >= 0 (animating's Face contract)", () => {
  const face = communicatingFace([said("a", "sky-is-blue"), said("b", "not grass-is-red")]);
  for (const k of ["cover", "held", "contested", "utterances"]) {
    assert.ok(Number.isInteger(face[k]) && face[k] >= 0, `${k} is a non-negative integer`);
  }
});

test("a settled membrane utterance becomes a genuine communicating meme (truth-charged)", () => {
  // membraneMeme is the per-utterance meme projection — the reading is over communicating's
  // OWN meme carrier, not a bare descent state.
  const asserted = membraneMeme(said("a", "sky-is-blue"));
  assert.ok(isMeme(asserted), "an assertion settles into a well-formed meme");

  const denied = membraneMeme(said("a", "not sky-is-blue"));
  assert.ok(isMeme(denied), "a denial settles into a well-formed meme");
});

test("an assertion leans potential (truth-up); a denial leans active (truth-down) — negation antitone", () => {
  // One subject, one assertion: the across face holds a single FOR cell.
  const forFace = communicatingFace([said("a", "sky-is-blue")]);
  assert.equal(forFace.cover, 1);
  assert.equal(forFace.held, 1);
  assert.equal(forFace.contested, 0);
  assert.equal(forFace.belnap.potential, 1, "assertion leans potential (FOR)");
  assert.equal(forFace.belnap.active, 0);

  // One subject, one denial: the across face holds a single AGAINST cell.
  const againstFace = communicatingFace([said("a", "not sky-is-blue")]);
  assert.equal(againstFace.cover, 1);
  assert.equal(againstFace.held, 1);
  assert.equal(againstFace.contested, 0);
  assert.equal(againstFace.belnap.active, 1, "denial leans active (AGAINST) — negate, the truth-axis antitone generator");
  assert.equal(againstFace.belnap.potential, 0);
});

test("assert-vs-deny on the SAME subject is the contested (stable / held-contradiction) cell", () => {
  // The whole point: the truth axis carries a HELD contradiction when one membrane both
  // asserts and denies a subject — pooled to `stable` (⊤). This is NOT a generic descend
  // counting two distinct cells; it is the truth-axis negation antitone landing OPPOSED.
  const face = communicatingFace([said("a", "sky-is-blue"), said("b", "not sky-is-blue")]);
  assert.equal(face.cover, 1, "asserted and denied land on the SAME subject cell");
  assert.equal(face.held, 1, "the agent holds a (contradictory) truth direction");
  assert.equal(face.contested, 1, "the cell is a held contradiction — the across face's contested reading");
  assert.equal(face.belnap.stable, 1);
  assert.equal(face.belnap.potential, 0);
  assert.equal(face.belnap.active, 0);
});

test("distinct subjects are distinct cover cells; only the genuinely opposed one is contested", () => {
  const face = communicatingFace([
    said("a", "sky-is-blue"), // FOR sky-is-blue
    said("b", "grass-is-green"), // FOR grass-is-green
    said("c", "not grass-is-green"), // AGAINST grass-is-green -> contested
  ]);
  assert.equal(face.cover, 2, "two distinct subjects");
  assert.equal(face.held, 2, "both subjects hold a truth direction");
  assert.equal(face.contested, 1, "only grass-is-green is asserted-and-denied");
  assert.equal(face.belnap.potential, 1, "sky-is-blue stays a definite FOR");
  assert.equal(face.belnap.stable, 1, "grass-is-green is the held contradiction");
});

test("contested <= held <= cover always (the thin triple is a nested filtration)", () => {
  const face = communicatingFace([
    said("a", "p"), said("b", "not p"),
    said("c", "q"),
    said("d", "not r"),
  ]);
  assert.ok(face.contested <= face.held, "contested <= held");
  assert.ok(face.held <= face.cover, "held <= cover");
});
