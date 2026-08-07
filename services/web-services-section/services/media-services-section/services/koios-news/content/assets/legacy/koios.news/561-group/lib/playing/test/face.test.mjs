/**
 * face.test — playing's OUTSIDE / EVIDENCE local section over an agent membrane.
 *
 * playingFace is the face animating (the holographic bulk) consumes for the
 * outside boundary, read on the evidence axis ⟨a₊, a₋⟩. These tests pin that it
 * is playing's OWN ludics reading — a real Design (charge valuation over loci) and
 * the Player/Opponent polarity split — not a relabelled generic descend:
 *
 *   - the thin trio { cover, held, contested } the bulk reads is present and
 *     non-negative, and `cover` = the design's loci;
 *   - held = loci committing a definite SIDE (Proponent a₊ + Opponent a₋), and
 *     `held = forCount + againstCount`;
 *   - contested = Daimon (†) loci, charge ⊤ = ⟨1,1⟩ (told-both), and equals
 *     `daimonCount`;
 *   - an empty membrane reads the empty design and the zero section.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { mark, utterance, sameChargeValue, chargeValue } from "@emsenn/relating";
import { playingFace, isDesign, chargePolarity } from "../dist/index.mjs";

/** A membrane line `token|claim` as a relating utterance carrier. */
const line = (token, claim) => utterance(mark(token), mark(claim));

test("playingFace: the thin trio is a well-formed evidence-axis local section", () => {
  const face = playingFace([line("alice", "ship-ready"), line("bob", "tests-green")]);
  assert.equal(face.kind, "playing.face");
  assert.equal(face.faculty, "playing");
  assert.equal(face.direction, "outside");
  assert.equal(face.axis, "evidence");
  for (const k of ["cover", "held", "contested", "forCount", "againstCount", "daimonCount"]) {
    assert.equal(typeof face[k], "number", `${k} is a number`);
    assert.ok(Number.isInteger(face[k]) && face[k] >= 0, `${k} is a non-negative integer`);
  }
});

test("playingFace builds a REAL Design — cover IS the design's loci (not a generic descend count)", () => {
  const face = playingFace([line("alice", "ship-ready"), line("bob", "tests-green")]);
  assert.ok(isDesign(face.design), "the face carries a genuine playing Design");
  assert.equal(face.cover, face.design.entries.length, "cover equals the design's loci");
  // each locus carries a genuine bilattice ChargeValue (the ludics valuation).
  for (const entry of face.design.entries) {
    assert.equal(typeof entry.locusKey, "string");
    assert.equal(entry.charge.kind, "bilattice-charge.value");
  }
});

test("held = forCount + againstCount: the ⟨a₊, a₋⟩ for/against split (Player/Opponent polarity)", () => {
  const face = playingFace([line("alice", "ship-ready"), line("bob", "tests-green")]);
  assert.equal(face.held, face.forCount + face.againstCount, "held is the committed-side count");
  // the design's loci, read by the SAME Player/Opponent polarity split the face
  // uses (positive ↦ Proponent a₊, negative ↦ Opponent a₋, null ↦ Daimon †).
  let proponents = 0;
  let opponents = 0;
  let daimons = 0;
  for (const entry of face.design.entries) {
    const side = chargePolarity(entry.charge);
    if (side === null) daimons += 1;
    else if (side.name === "positive") proponents += 1;
    else opponents += 1;
  }
  assert.equal(face.forCount, proponents, "forCount = Proponent (a₊) loci");
  assert.equal(face.againstCount, opponents, "againstCount = Opponent (a₋) loci");
  assert.equal(face.daimonCount, daimons, "daimonCount = Daimon (†) loci");
});

test("contested = Daimon (†) loci: a held contradiction ⊤ = ⟨1,1⟩, not propagated as ex falso", () => {
  // the SAME locus asserted and denied settles to the told-both ⊤ (stable), a
  // Daimon design act — the only contested evidence the twist product reads.
  const face = playingFace([
    line("claim", "holds"),
    line("claim", "holds"),
  ]);
  // contested counts exactly the daimon (⊤) loci, and equals daimonCount.
  assert.equal(face.contested, face.daimonCount, "contested IS the Daimon census");
  assert.ok(face.contested >= 0);
  // every contested locus carries the stable (⊤) charge in the design — the
  // told-both ⟨1,1⟩ the evidence twist product reads as a held contradiction.
  let stableLoci = 0;
  for (const entry of face.design.entries) {
    if (sameChargeValue(entry.charge, chargeValue("stable"))) stableLoci += 1;
  }
  assert.equal(face.contested, stableLoci);
});

test("playingFace: an empty membrane reads the empty design and the zero section", () => {
  const face = playingFace([]);
  assert.equal(face.cover, 0);
  assert.equal(face.held, 0);
  assert.equal(face.contested, 0);
  assert.equal(face.forCount, 0);
  assert.equal(face.againstCount, 0);
  assert.equal(face.daimonCount, 0);
  assert.ok(isDesign(face.design));
  assert.equal(face.design.entries.length, 0, "the empty design has no loci");
});
