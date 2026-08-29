// claims — CLAIM ALTARS, Aletheon's other speech-act surface (alongside dispute.mjs's parleys): a
// standing altar carries a claim cell whose truth is CO-AUTHORED by players staking one of the four
// illocutionary forces. ASSERT stakes a positive witness, DENY a negative, CONTEST both at once,
// ABSTAIN retracts the staker's own last stake. The cell is settled by folding the accumulated
// witnesses through computer's real EAVT substrate (`fold`/`section`), read as t (sanctuary) / f
// (dormant) / ⊤ (erupt) / ⊥ (unknown) — the same four-value reading value.mjs and dispute.mjs use.
// The marks staked are CONSERVED: spent by the staker, standing in the altar, returned on abstain.

import assert from "node:assert/strict";
import { test } from "node:test";

import { createWorld, spawn, get } from "../server/world/store.mjs";
import {
  makeClaim, resettleClaim, readClaim, claimGlyph, stake, erupt, decayContest,
  payDividend, stepAltars, claimView, nearestAltar, STAKE,
} from "../server/world/claims.mjs";
import { KIND, MARK } from "../shared/constants.mjs";

function altarWorld() {
  const world = createWorld();
  const altar = spawn(world, { kind: KIND.altar, name: "Test Altar", x: 0, z: 0, maxHp: 1, hostile: false });
  altar.claim = makeClaim();
  return { world, altar };
}

function player(world, marks = 10) {
  const p = spawn(world, { kind: KIND.player, name: "staker", x: 0, z: 0, maxHp: 60 });
  p.marks = marks;
  return p;
}

// --- a fresh claim --------------------------------------------------------------------------

test("makeClaim: a fresh claim is ⊥ (unknown) — no evidence staked yet", () => {
  const claim = makeClaim();
  assert.equal(resettleClaim(claim), "unknown");
  assert.equal(claimGlyph(claim), "⊥");
  assert.equal(readClaim(null), "unknown");
});

// --- the four illocutionary forces as STAKES -----------------------------------------------

test("stake: ASSERT alone settles the altar to t — a SANCTUARY", () => {
  const { world, altar } = altarWorld();
  const p = player(world);
  const out = stake(world, altar, p, "assert");
  assert.equal(out.ok, true);
  assert.equal(out.state, "sanctuary");
  assert.equal(altar.claim.state, "sanctuary");
  assert.equal(claimGlyph(altar.claim), "t");
  assert.equal(p.marks, 10 - STAKE.assert[0] - STAKE.assert[1], "assert costs exactly one mark");
});

test("stake: DENY alone settles the altar to f — dormant", () => {
  const { world, altar } = altarWorld();
  const p = player(world);
  const out = stake(world, altar, p, "deny");
  assert.equal(out.state, "dormant");
  assert.equal(claimGlyph(altar.claim), "f");
});

test("stake: CONTEST alone (both faces at once) settles the altar straight to ⊤ — erupt", () => {
  const { world, altar } = altarWorld();
  const p = player(world, 10);
  const out = stake(world, altar, p, "contest");
  assert.equal(out.state, "erupt");
  assert.equal(claimGlyph(altar.claim), "⊤");
  assert.equal(p.marks, 10 - (STAKE.contest[0] + STAKE.contest[1]), "contest costs a mark on EACH face (2 total)");
});

test("stake: an ASSERT and a DENY from two different players on the SAME altar accumulate to ⊤ — " +
     "the knowledge-join of assert ∨ₖ deny, exactly illocution.mjs's header algebra", () => {
  const { world, altar } = altarWorld();
  const asserter = player(world), denier = player(world);
  stake(world, altar, asserter, "assert");
  const out = stake(world, altar, denier, "deny");
  assert.equal(out.state, "erupt", "assert then deny on the same claim must contradict to ⊤, not cancel to ⊥");
});

test("stake: ABSTAIN retracts the STAKER'S OWN most recent stake — the marks are conserved back to " +
     "the player, and the witness is removed from the claim's evidence", () => {
  const { world, altar } = altarWorld();
  const p = player(world, 10);
  stake(world, altar, p, "assert");
  assert.equal(p.marks, 9);
  assert.equal(altar.claim.pos.length, 1);

  const out = stake(world, altar, p, "abstain");
  assert.equal(out.ok, true);
  assert.equal(p.marks, 10, "the spent mark is conserved back to the retracting player");
  assert.equal(altar.claim.pos.length, 0);
  assert.equal(altar.claim.state, "unknown", "with the sole positive witness retracted and none staked, ⊥ again");
});

test("stake: ABSTAIN with nothing to retract fails cleanly, no marks move", () => {
  const { world, altar } = altarWorld();
  const p = player(world, 10);
  const out = stake(world, altar, p, "abstain");
  assert.equal(out.ok, false);
  assert.equal(out.reason, "nothing-to-retract");
  assert.equal(p.marks, 10);
});

test("stake: insufficient marks refuses the stake and spends nothing", () => {
  const { world, altar } = altarWorld();
  const p = player(world, 0);
  const out = stake(world, altar, p, "assert");
  assert.equal(out.ok, false);
  assert.equal(out.reason, "no-marks");
  assert.equal(p.marks, 0);
  assert.equal(altar.claim.state, "unknown", "a refused stake must not touch the claim at all");
});

test("stake: an unrecognized force is refused as bad-force", () => {
  const { world, altar } = altarWorld();
  const p = player(world, 10);
  const out = stake(world, altar, p, "shout");
  assert.equal(out.ok, false);
  assert.equal(out.reason, "bad-force");
});

test("stake: refuses a non-altar target", () => {
  const world = createWorld();
  const notAnAltar = spawn(world, { kind: KIND.critter, name: "critter", x: 0, z: 0, maxHp: 10 });
  const p = player(world, 10);
  assert.equal(stake(world, notAnAltar, p, "assert").reason, "no-altar");
});

test("stake: refuses a non-player staker (an NPC cannot stake a claim)", () => {
  const { world, altar } = altarWorld();
  const npc = spawn(world, { kind: KIND.brigand, name: "npc", x: 0, z: 0, maxHp: 10, hostile: true });
  const out = stake(world, altar, npc, "assert");
  assert.equal(out.ok, false);
  assert.equal(out.reason, "no-player");
});

// --- eruption / decay / dividend consequences ----------------------------------------------

test("erupt: a ⊤-settled altar can raise a REAL Corrupted Anomaly at its position (via the same " +
     "slay-then-corrupt path seed.mjs uses) — idempotent while the eruption still lives", () => {
  const { world, altar } = altarWorld();
  const p = player(world, 10);
  stake(world, altar, p, "contest");
  assert.equal(altar.claim.state, "erupt");

  const anomaly = erupt(world, altar);
  assert.ok(anomaly);
  assert.equal(anomaly.kind, KIND.anomaly);
  assert.equal(anomaly.state, "anomaly");
  assert.equal(altar.eruptionId, anomaly.id);

  const again = erupt(world, altar);
  assert.equal(again.id, anomaly.id, "erupt() must not spawn a second Anomaly while one is already live");
});

test("decayContest: dropping the negative-face witnesses lets a once-erupted altar settle back " +
     "toward t (sanctuary), and clears the eruption link", () => {
  const { world, altar } = altarWorld();
  const p = player(world, 10);
  stake(world, altar, p, "contest"); // asserts AND denies at once → ⊤
  erupt(world, altar);
  assert.equal(altar.claim.state, "erupt");

  decayContest(world, altar);
  assert.equal(altar.claim.neg.length, 0, "the negative-face witnesses are dropped, the positive ground kept");
  assert.equal(altar.claim.state, "sanctuary", "with only positive ground left, the altar reads t");
  assert.equal(altar.eruptionId, null);
});

test("payDividend: a sanctuary altar pays its positive claimants a small marks dividend; a non-" +
     "sanctuary altar pays nothing", () => {
  const { world, altar } = altarWorld();
  const p1 = player(world, 10);
  const p2 = spawn(world, { kind: KIND.player, name: "p2", x: 0, z: 0, maxHp: 60 });
  p2.marks = 10;
  stake(world, altar, p1, "assert");
  stake(world, altar, p2, "assert");
  assert.equal(altar.claim.state, "sanctuary");

  const paid = payDividend(world, altar);
  assert.equal(paid.length, 2);
  assert.equal(p1.marks, 9 + MARK.altarDividend);
  assert.equal(p2.marks, 9 + MARK.altarDividend);

  const { world: w2, altar: dormantAltar } = altarWorld();
  const p3 = player(w2, 10);
  stake(w2, dormantAltar, p3, "deny");
  const paidNone = payDividend(w2, dormantAltar);
  assert.equal(paidNone.length, 0);
  assert.equal(p3.marks, 9, "a dormant altar's would-be claimant is not paid");
});

test("stepAltars: a ⊤ altar with no live eruption erupts on the next step; once the Anomaly is " +
     "cleared, the NEXT step decays the contest back toward t", () => {
  const { world, altar } = altarWorld();
  const p = player(world, 10);
  stake(world, altar, p, "contest");
  assert.equal(altar.claim.state, "erupt");
  assert.equal(altar.eruptionId, undefined);

  stepAltars(world);
  assert.ok(altar.eruptionId, "stepAltars must raise the eruption for a ⊤ altar with none live");
  const anomalyId = altar.eruptionId;

  // clear the eruption the way a player would (banish/kill it out of the world) and re-step
  world.entities.delete(anomalyId);
  stepAltars(world);
  assert.equal(altar.eruptionId, null, "a cleared eruption must be decayed away, not left dangling");
  assert.equal(altar.claim.state, "sanctuary", "after decay, the surviving positive ground reads t");
});

// --- reads ------------------------------------------------------------------------------------

test("nearestAltar: finds the closest altar within range, or null when none qualify", () => {
  const world = createWorld();
  const near = spawn(world, { kind: KIND.altar, name: "Near", x: 1, z: 0, maxHp: 1 });
  near.claim = makeClaim();
  const far = spawn(world, { kind: KIND.altar, name: "Far", x: 100, z: 0, maxHp: 1 });
  far.claim = makeClaim();
  const p = spawn(world, { kind: KIND.player, name: "p", x: 0, z: 0, maxHp: 60 });

  const found = nearestAltar(world, p);
  assert.equal(found.id, near.id);
  assert.equal(nearestAltar(world, p, 0.5), null, "outside every altar's range yields null");
});

test("claimView: the wire projection carries the glyph, both evidence counts, and the settled state", () => {
  const { world, altar } = altarWorld();
  const p = player(world, 10);
  stake(world, altar, p, "assert");
  const v = claimView(altar);
  assert.equal(v.id, altar.id);
  assert.equal(v.glyph, "t");
  assert.equal(v.pos, 1);
  assert.equal(v.neg, 0);
  assert.equal(v.state, "sanctuary");
});
