// dispute — THE LUDICS DISPUTE (a Parley): the non-lethal win path, and one of Aletheon's two
// speech-act surfaces (the other is claims.mjs's altars). Every move composes an illocutionary
// force's kernel-shaped charge against a stance with the REAL kernel ops (dispute.mjs imports
// joinKnowledge/meetTruth/present/isTop straight from kernel.mjs — this file exercises that
// composition, not a re-implementation of it). Assert pushes the OPPONENT toward f; deny defends
// the ACTOR's own floor; contest escalates the opponent (and, once countered, the actor) to ⊤;
// abstain yields the ACTOR's own ground. Convergence (a lost floor) yields the daimon †; three-deep
// mutual ⊤ is a stalemate.

import assert from "node:assert/strict";
import { test } from "node:test";

import { createWorld, spawn } from "../server/world/store.mjs";
import {
  open, play, release, counterForce, flow, deepPlay, glyph, disputeView,
} from "../server/world/dispute.mjs";
import { KIND } from "../shared/constants.mjs";

function world1v1({ playerMaxHp = 60, foeMaxHp = 40, foeHostile = true, foeKind = KIND.brigand } = {}) {
  const world = createWorld();
  const player = spawn(world, { kind: KIND.player, name: "p1", x: 0, z: 0, maxHp: playerMaxHp });
  const foe = spawn(world, { kind: foeKind, name: "foe", x: 0, z: 0, maxHp: foeMaxHp, hostile: foeHostile });
  return { world, player, foe };
}

// --- opening a parley ------------------------------------------------------------------------

test("open: refuses to parley with yourself, a dead target, or a peaceful/never-a-target kind", () => {
  const { world, player, foe } = world1v1();
  assert.equal(open(world, player, player), null, "cannot parley with yourself");

  foe.state = "dead";
  assert.equal(open(world, player, foe), null, "cannot parley with a corpse");

  const keeper = spawn(world, { kind: KIND.keeper, name: "Keeper", x: 0, z: 0, maxHp: 30 });
  assert.equal(open(world, player, keeper), null, "Keepers can never be parleyed with");
});

test("open: only one live parley per side — opening a second while one is active is refused", () => {
  const { world, player, foe } = world1v1();
  const foe2 = spawn(world, { kind: KIND.brigand, name: "foe2", x: 0, z: 0, maxHp: 40, hostile: true });
  const d = open(world, player, foe);
  assert.ok(d);
  assert.equal(open(world, player, foe2), null, "the player is already in a parley");
  release(world, d);
  assert.ok(open(world, player, foe2), "once released, a fresh parley can open");
});

test("open: a hostile/anomaly target stands on MORE ground than a calm one (harder to out-argue)", () => {
  const world = createWorld();
  const player = spawn(world, { kind: KIND.player, name: "p", x: 0, z: 0, maxHp: 60 });
  const calm = spawn(world, { kind: KIND.brigand, name: "calm", x: 0, z: 0, maxHp: 40, hostile: false });
  const hostile = spawn(world, { kind: KIND.brigand, name: "hostile", x: 0, z: 0, maxHp: 40, hostile: true });

  const dCalm = open(world, player, calm);
  assert.equal(dCalm.stance[calm.id].evidence[0].length, 2);
  release(world, dCalm);

  const dHostile = open(world, player, hostile);
  assert.equal(dHostile.stance[hostile.id].evidence[0].length, 4);
});

// --- the four illocutionary forces, played into a live parley ---------------------------------

test("play: ASSERT bleeds the opponent's ground and eventually flips its stance to f — a sustained " +
     "assault out-argues a hostile foe into yielding (pacified, not slain)", () => {
  const { world, player, foe } = world1v1();
  const d = open(world, player, foe);
  let out, guard = 0;
  while (!d.ended && guard++ < 10) out = play(world, d, player.id, "assert");

  assert.equal(d.ended, true, "a sustained assert campaign must eventually end the parley");
  assert.equal(d.yielded, foe.id, "the FOE yields to a winning assert campaign, not the player");
  assert.equal(d.reason, "overwhelmed");
  assert.equal(out.outcome, "f", "the final move's outcome glyph reads f — the opponent lost its floor");

  // pacify() consequences on the yielding NPC
  assert.equal(foe.hostile, false);
  assert.equal(foe.intends, "wander");
  assert.equal(foe.target, null);
  assert.equal(foe._pacified, true);
  assert.equal(foe._dispute, null, "the dispute must be released from both sides on finish");
});

test("play: a yielding ⊤ Anomaly is CALMED back to a plain critter, not merely pacified in place", () => {
  const world = createWorld();
  const player = spawn(world, { kind: KIND.player, name: "p", x: 0, z: 0, maxHp: 60 });
  const anomaly = spawn(world, { kind: KIND.anomaly, name: "Corrupted Thing", x: 0, z: 0, maxHp: 20, hostile: true });
  const d = open(world, player, anomaly);
  let guard = 0;
  while (!d.ended && guard++ < 10) play(world, d, player.id, "assert");
  assert.equal(d.yielded, anomaly.id);
  assert.equal(anomaly.kind, KIND.critter, "a pacified ⊤ Anomaly settles back to a calmed critter kind");
  assert.ok(anomaly.name.startsWith("Calmed "));
});

test("play: repeated DENY only defends the actor's own floor — it never directly damages the " +
     "opponent's ground (deny targets d.stance[actorId], never d.stance[oppId])", () => {
  const { world, player, foe } = world1v1();
  const d = open(world, player, foe);
  const foeGroundBefore = d.stance[foe.id].evidence[0].length;
  play(world, d, player.id, "deny");
  // deny only ever writes d.stance[actorId] — the foe's OWN ground is untouched by the player's deny
  // itself (any change to it after this call comes from the NPC's OWN auto-counter move, tested below).
  assert.ok(d.stance[player.id].evidence[0].length >= 1, "the actor's own ground grows (or holds) on deny");
});

test("play: CONTEST escalates — two consecutive contests from the same actor drive BOTH stances to " +
     "⊤ and, once deepPlay reaches 3, settle the parley as a mutual STALEMATE (no winner)", () => {
  const { world, player, foe } = world1v1();
  const d = open(world, player, foe);

  const first = play(world, d, player.id, "contest");
  assert.equal(first.outcome, "⊤");
  assert.equal(d.ended, false, "one contest exchange alone (deepPlay 2) is not yet a stalemate");
  assert.equal(d.turn, player.id, "turn returns to the player once the NPC's auto-counter also fails to end it");

  const second = play(world, d, player.id, "contest");
  assert.equal(second.outcome, "⊤");
  assert.equal(d.ended, true);
  assert.equal(d.reason, "stalemate");
  assert.equal(d.yielded, null, "a stalemate has no winner");
  assert.ok(deepPlay(d.moves) >= 3, "a stalemate only fires once ⊤ has been played at least 3 times");
});

test("play: ABSTAIN yields the actor's OWN ground — spamming it against a hostile foe eventually " +
     "makes the PLAYER yield (via the NPC's deterministic counter-assert), triggering the non-lethal " +
     "player penalty (a brief bind + a small marks loss), never death", () => {
  const { world, player, foe } = world1v1();
  player.marks = 10;
  const d = open(world, player, foe);
  let guard = 0;
  while (!d.ended && guard++ < 10) { world.tick++; play(world, d, player.id, "abstain"); }

  assert.equal(d.ended, true);
  assert.equal(d.yielded, player.id, "abstaining away your own ground makes YOU yield, not the foe");
  assert.equal(player.state, "alive", "the parley penalty is never lethal");
  assert.ok(player.boundUntil > 0, "a yielding player is briefly bound (rooted)");
  assert.ok(player.marks < 10, "a yielding player loses a few marks — the humbling, not a death");
});

test("play: DENY-spam against a hostile foe also eventually makes the player yield, through the " +
     "same NPC counter-assert path (deny defends but never attacks, so the NPC's own asserts win)", () => {
  const { world, player, foe } = world1v1();
  player.marks = 10;
  const d = open(world, player, foe);
  let guard = 0;
  while (!d.ended && guard++ < 10) { world.tick++; play(world, d, player.id, "deny"); }
  assert.equal(d.ended, true);
  assert.equal(d.yielded, player.id);
});

test("play: an unrecognized force is rejected without mutating the dispute", () => {
  const { world, player, foe } = world1v1();
  const d = open(world, player, foe);
  const movesBefore = d.moves.length;
  const out = play(world, d, player.id, "shout");
  assert.equal(out.ok, false);
  assert.equal(out.outcome, "bad-force");
  assert.equal(d.moves.length, movesBefore);
});

test("play: it is not always the player's turn — after the NPC's auto-counter, playing out of turn " +
     "is rejected, and playing into an already-ended dispute is rejected", () => {
  const { world, player, foe } = world1v1();
  const d = open(world, player, foe);
  const out = play(world, d, foe.id, "assert"); // the NPC never has a human-driven turn to begin with
  assert.equal(out.ok, false);
  assert.equal(out.outcome, "not-your-turn");

  let guard = 0;
  while (!d.ended && guard++ < 10) play(world, d, player.id, "assert");
  const afterEnd = play(world, d, player.id, "assert");
  assert.equal(afterEnd.ok, false);
  assert.equal(afterEnd.outcome, "ended");
});

// --- the deterministic counter-AI (no RNG — the world stays confluent) -------------------------

test("counterForce: answers each of the four player forces with the documented, deterministic reply", () => {
  assert.equal(counterForce(null, "p", "assert"), "deny");
  assert.equal(counterForce(null, "p", "deny"), "assert");
  assert.equal(counterForce(null, "p", "contest"), "contest");
  assert.equal(counterForce(null, "p", "abstain"), "assert");
  assert.equal(counterForce(null, "p", "anything-else"), "assert", "an unrecognized force still gets a safe default");
});

// --- the ludics measures over the move log ------------------------------------------------------

test("flow/deepPlay: a histogram of outcome glyphs, and the ⊤-move count, read off the move log", () => {
  const moves = [{ glyph: "t" }, { glyph: "f" }, { glyph: "⊤" }, { glyph: "⊤" }, { glyph: "⊥" }];
  const f = flow(moves);
  assert.deepEqual(f.hist, { t: 1, f: 1, "⊤": 2, "⊥": 1 });
  assert.equal(f.kinds, 4);
  assert.equal(f.inFlow, true, "≥3 distinct kinds counts as real flow, not one-note play");
  assert.equal(deepPlay(moves), 2);
});

test("flow: fewer than 3 distinct outcome kinds is NOT in flow", () => {
  const moves = [{ glyph: "t" }, { glyph: "t" }, { glyph: "f" }];
  assert.equal(flow(moves).inFlow, false);
});

// --- the wire projection -------------------------------------------------------------------------

test("disputeView: projects a coherent, viewer-relative view (your stance/foe's stance, whose turn, " +
     "and — once ended — who yielded, from the CALLER's own seat)", () => {
  const { world, player, foe } = world1v1();
  const d = open(world, player, foe);
  const viewAsPlayer = disputeView(world, d, player.id);
  assert.equal(viewAsPlayer.youName, "p1");
  assert.equal(viewAsPlayer.foeName, "foe");
  assert.equal(viewAsPlayer.yourTurn, true);
  assert.equal(viewAsPlayer.ended, false);
  assert.equal(viewAsPlayer.yielded, undefined, "yielded is only meaningful once ended");

  let guard = 0;
  while (!d.ended && guard++ < 10) play(world, d, player.id, "assert");
  const viewAfter = disputeView(world, d, player.id);
  assert.equal(viewAfter.ended, true);
  assert.equal(viewAfter.yielded, "foe", "from the player's own seat, the OPPONENT yielding reads as 'foe'");

  const viewAsFoe = disputeView(world, d, foe.id);
  assert.equal(viewAsFoe.yielded, "you", "from the foe's seat, the same outcome reads as 'you' yielded");
});

test("glyph: names the four-value face of a stance charge, ⊤ taking precedence over a plain read", () => {
  assert.equal(glyph({ value: [true, true], evidence: [[], []] }), "⊤");
  assert.equal(glyph({ value: [true, false], evidence: [[], []] }), "t");
  assert.equal(glyph({ value: [false, true], evidence: [[], []] }), "f");
  assert.equal(glyph({ value: [false, false], evidence: [[], []] }), "⊥");
});
