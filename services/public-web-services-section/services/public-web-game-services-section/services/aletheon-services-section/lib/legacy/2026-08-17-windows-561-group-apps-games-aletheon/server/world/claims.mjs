// [claims] claims — CLAIM ALTARS: the keystone that makes the WORLD player-authored. An Altar is a
// standing, peaceful, immobile node (like a Keeper or a Cairn) that carries a CLAIM CELL — a
// bilattice cell whose truth is co-authored by players who STAKE evidence through the four
// illocutionary forces. The cell is settled by the REAL kernel (joinKnowledge of the accumulated
// evidence, read with present / isTop), exactly as a creature's life cell is — but here the evidence
// is not combat, it is SPEECH, and the witnesses are CONSERVED MARKS the players move into the altar.
//
// GROUNDING (the same algebra value.mjs / dispute.mjs run on):
//   - A charge is { value:[pos,neg], evidence:[posWitnesses, negWitnesses] } — the kernel shape.
//   - ASSERT stakes a POSITIVE witness (toward t); DENY a NEGATIVE (toward f); CONTEST BOTH (toward
//     ⊤ — assert AND deny the same cell); ABSTAIN retracts the staker's own last stake (⊥, no act).
//   - The settled cell is joinKnowledge over every staked witness — the knowledge-order lub, the
//     same fold value.vital does. The four-value face is read with present / isTop.
//
// CONSEQUENCES weave through the EXISTING systems (field.mjs corruption/economy/ecology):
//   - settles to t (positive dominates) → SANCTUARY: drains tension strongly (field.mjs), pays a
//     small marks DIVIDEND back to its claimants, counts as safe.
//   - settles to ⊤ (both faces strong) → ERUPTION: a real ⊤ Anomaly is spawned at the altar (via
//     the real combat slay→raise path), and the altar radiates tension; clearing the Anomaly lets
//     the contested evidence decay so the altar can return to t.
//   - settles to f or ⊥ → dormant (neutral).
//
// The marks staked are CONSERVED: they leave the player and STAND in the altar's evidence (tracked
// per staker so ABSTAIN can retract and the SANCTUARY dividend can pay). One mark per stake face.

import { KIND, MARK } from "../../shared/constants.mjs";
import { fold, section } from "@561-group/computer/posix-holography/eavt-substrate";
import { spawn, settleEntity, append, get } from "./store.mjs";
import { corrupt } from "./combat.mjs";
import { gradePosition } from "./spacetime.mjs";

// a witness is any small datum the kernel unions losslessly; we tag the staker + force + tick.
const witness = (player, force, tick) => ({ src: "stake", player, force, t: tick });

// the marks a force stakes onto each face: assert→[+1,0], deny→[0,+1], contest→[+1,+1].
export const STAKE = Object.freeze({
  assert:  [1, 0],
  deny:    [0, 1],
  contest: [1, 1],
});

// --- the altar's claim cell --------------------------------------------------------------------
// makeClaim — a fresh claim cell. `stakes` is the conserved record of who staked what (so ABSTAIN
// can retract a player's last stake, and the SANCTUARY dividend can pay its claimants back). `pos`
// and `neg` are the accumulated witness lists (the conserved marks on each face).
export function makeClaim() {
  // pos/neg: the conserved witness marks on each face (source of truth). folded/section/cell: the
  // substrate projection (set by resettleClaim). state: the named four-value face. ⊥ until first stake.
  return { pos: [], neg: [], stakes: [], folded: null, section: null, cell: null, state: "unknown" };
}

// the claim-cell predicate and its CONVERSE: a positive stake AFFIRMS (altar, CLAIM_PRED, "claim"); a
// negative stake (deny/contest) is the CONVERSE predication on the same cell, NEVER a polarity field —
// the eavt/substrate discipline. The converse map orients both predications onto the one positive cell,
// where assert+deny accumulate to ⊤ (a HELD value, not an error).
const CLAIM_PRED = "claims-real";   // the positive face — "this altar's claim is real"
const CLAIM_DENY = "denies-real";   // the converse — "this altar's claim is not real"
const CLAIM_OBJ = "claim";
const CONVERSE = { [CLAIM_DENY]: CLAIM_PRED };

// claimRows — project a claim's accumulated witnesses to an append-only {e,a,v,t} trace: one row per
// conserved mark, positive marks on CLAIM_PRED, negative marks on the CONVERSE CLAIM_DENY. The witness's
// tick is the row's t (its provenance). This is the trace the substrate folds — the conserved marks
// (claim.pos / claim.neg) are the source of truth; the rows are their eavt presentation.
function claimRows(subject, claim) {
  const rows = [];
  for (const w of claim.pos) rows.push({ e: subject, a: CLAIM_PRED, v: CLAIM_OBJ, t: w.t });
  for (const w of claim.neg) rows.push({ e: subject, a: CLAIM_DENY, v: CLAIM_OBJ, t: w.t });
  return rows;
}

// resettleClaim — fold the claim's evidence trace through computer's SUBSTRATE (substrate.fold folds the
// rows with math's joinKnowledge over a lossless evidence carrier), then route the settled cell through
// the canonical belief PROJECTION (substrate.section -> {affirmed, denied, contradicted}) — the same
// shape predicate-algebra believe/recall yields, driven off the fold. This is the ONLY place the altar's
// folded section / state are written; pos/neg (the conserved marks) stay the source the rows project.
export function resettleClaim(claim) {
  const subject = "altar-claim"; // a stable subject id — the fold is over THIS altar's own rows only
  claim.folded = fold(subject, claimRows(subject, claim), { converse: CONVERSE });
  claim.section = section(claim.folded);
  claim.cell = claim.folded.fiber[0] ?? null; // the single (CLAIM_PRED, "claim") cell, or null (⊥)
  claim.state = readClaim(claim.section);
  return claim.state;
}

// readClaim — name the settled face from the substrate SECTION (the canonical t/f/⊤ projection the wire
// + consequences read). contradicted = ⊤ (asserted AND denied), affirmed = t, denied = f, neither = ⊥.
export function readClaim(sec) {
  if (!sec) return "unknown";
  if (sec.contradicted.length) return "erupt";    // ⊤ — asserted AND denied: a contested-value site
  if (sec.affirmed.length) return "sanctuary";    // t — positive dominates: a safe, draining altar
  if (sec.denied.length) return "dormant";        // f — denied down: dormant
  return "unknown";                               // ⊥ — no evidence yet
}

// claimGlyph — the bare bilattice mark for the wire / HUD (t / f / ⊤ / ⊥), read off the folded cell.
export function claimGlyph(claim) {
  const c = claim.cell;
  if (!c) return "⊥";
  const { pos, neg } = c.value;
  if (pos && neg) return "⊤";
  if (pos) return "t";
  if (neg) return "f";
  return "⊥";
}

// --- placing altars --------------------------------------------------------------------------
// seedAltars — place one Altar on each grade ring (the grades the manifold lays down), so the world
// has co-authorable sites from the heart to the rim. Each altar is peaceful + immobile and carries
// a fresh claim cell. Called from seed.mjs.
export function seedAltars(world) {
  const altars = [];
  for (let grade = 0; grade <= 4; grade++) {
    const { x, z } = gradePosition(grade, grade, 5); // a distinct angular rank per ring, spread out
    const a = spawn(world, { kind: KIND.altar, name: `Altar of Grade ${grade}`, x, z, maxHp: 1, hostile: false });
    a.claim = makeClaim();
    a.grade = grade;
    altars.push(a);
  }
  return altars;
}

// --- staking ---------------------------------------------------------------------------------
const STAKE_RANGE = 8; // world units — a player must stand near the altar to stake at it

// nearestAltar — the closest altar within STAKE_RANGE of `e`, or null (the server-side reach query).
export function nearestAltar(world, e, range = STAKE_RANGE) {
  let best = null, bd = range * range;
  for (const o of world.entities.values()) {
    if (o.kind !== KIND.altar) continue;
    const dx = o.x - e.x, dz = o.z - e.z, d = dx * dx + dz * dz;
    if (d <= bd) { bd = d; best = o; }
  }
  return best;
}

// stake — a player stakes `force` (assert / deny / contest / abstain) at `altar`. The marks SPENT
// move INTO the altar's evidence (conserved). ASSERT/DENY/CONTEST add witnesses; ABSTAIN retracts
// the player's OWN last stake (its marks return to the player). Re-settles the cell via the real
// kernel after the change. Returns { ok, reason?, state } — state is the new settled face name.
export function stake(world, altar, player, force) {
  if (!altar || altar.kind !== KIND.altar || !altar.claim) return { ok: false, reason: "no-altar" };
  if (!player || player.kind !== KIND.player) return { ok: false, reason: "no-player" };
  const claim = altar.claim;

  if (force === "abstain") {
    // retract the player's most recent stake: the conserved marks return to the player.
    const idx = lastStakeIndexOf(claim, player.id);
    if (idx < 0) return { ok: false, reason: "nothing-to-retract" };
    const s = claim.stakes.splice(idx, 1)[0];
    removeWitness(claim.pos, player.id, s.tick);
    removeWitness(claim.neg, player.id, s.tick);
    player.marks = (player.marks || 0) + s.marks; // conserved — the marks come back
    player.dirty = true;
  } else {
    const cost = STAKE[force];
    if (!cost) return { ok: false, reason: "bad-force" };
    const need = cost[0] + cost[1]; // contest costs 2 (a mark on each face), assert/deny 1
    if ((player.marks || 0) < need) return { ok: false, reason: "no-marks" };
    player.marks -= need;            // SPENT — the marks leave the player
    player.dirty = true;
    const w = witness(player.id, force, world.tick);
    for (let k = 0; k < cost[0]; k++) claim.pos.push(w); // positive-face witnesses (the marks stand here)
    for (let k = 0; k < cost[1]; k++) claim.neg.push(w); // negative-face witnesses
    claim.stakes.push({ player: player.id, force, marks: need, tick: world.tick });
  }

  const state = resettleClaim(claim);
  altar.dirty = true;
  append(world, { e: altar.id, a: "claimed", v: { by: player.id, force, state } });
  return { ok: true, state };
}

// lastStakeIndexOf — the index of the player's most recent stake in the claim log, or -1.
function lastStakeIndexOf(claim, playerId) {
  for (let i = claim.stakes.length - 1; i >= 0; i--) if (claim.stakes[i].player === playerId) return i;
  return -1;
}

// removeWitness — drop ONE witness matching this player+tick from a face's witness list (the very
// mark a retracted stake put there). Mutates the list in place.
function removeWitness(list, playerId, tick) {
  const i = list.findIndex((w) => w.player === playerId && w.t === tick);
  if (i >= 0) list.splice(i, 1);
}

// --- the ERUPTION: a ⊤ claim spawns a real ⊤ Anomaly --------------------------------------------
// erupt — when an altar's claim settles to ⊤ (asserted AND denied), a real Corrupted Anomaly rises
// AT the altar: the contradiction the world holds walks. We make it a REAL ⊤ the same way seed.mjs
// does — spawn a brigand, slay it, then corrupt() it (re-assert life onto the slain cell →
// joinKnowledge → ⊤). The altar remembers the eruption so the tick can re-settle it when cleared.
export function erupt(world, altar) {
  if (!altar || !altar.claim) return null;
  if (altar.eruptionId && get(world, altar.eruptionId)) return get(world, altar.eruptionId); // already erupted
  const a = spawn(world, {
    kind: KIND.brigand, name: `Eruption of ${altar.name}`,
    x: altar.x + 1.2, z: altar.z + 1.2, maxHp: 44, hostile: true,
  });
  a.hp = 0; a.killed = true; a.diedTick = world.tick; a.corpseUntil = world.tick + 1;
  settleEntity(world, a); // → f (the slain face)
  corrupt(world, a);      // re-assert life → joinKnowledge → ⊤ : a REAL Anomaly
  a._fromAltar = altar.id;
  altar.eruptionId = a.id;
  altar.dirty = true;
  append(world, { e: altar.id, a: "erupted", v: { anomaly: a.id } });
  return a;
}

// decayContest — when an altar's eruption is removed/calmed, DECAY the contested evidence so the
// cell can return toward t: drop the NEGATIVE-face witnesses (the denials that, with the assertions,
// held the ⊤). The positive ground remains, so a once-erupted altar settles back to t (sanctuary).
// The retracted negative marks are conserved into the world's calm (they are not paid out — the
// denial is spent settling the contradiction, exactly as a banished Anomaly's tension subsides).
export function decayContest(world, altar) {
  if (!altar || !altar.claim) return;
  altar.claim.neg = [];
  altar.claim.stakes = altar.claim.stakes.filter((s) => s.force !== "deny" && s.force !== "contest");
  altar.eruptionId = null;
  resettleClaim(altar.claim);
  altar.dirty = true;
  append(world, { e: altar.id, a: "claim-decayed", v: { state: altar.claim.state } });
}

// --- the SANCTUARY dividend ---------------------------------------------------------------------
// payDividend — a t (sanctuary) altar periodically pays a small marks DIVIDEND back to its
// claimants (coherence rewards the players whose POSITIVE stakes settled it to t). Conserved-ish:
// the dividend is MINTED as a coherence reward (the same way a kill mints marks onto the slayer) —
// the standing positive evidence keeps generating it while the sanctuary holds. Returns the paid set.
export function payDividend(world, altar) {
  if (!altar || !altar.claim || altar.claim.state !== "sanctuary") return [];
  const paid = [];
  const claimants = new Set(altar.claim.pos.map((w) => w.player));
  for (const id of claimants) {
    const p = get(world, id);
    if (!p || p.kind !== KIND.player) continue;
    p.marks = (p.marks || 0) + MARK.altarDividend;
    p.dirty = true;
    paid.push({ player: id, marks: MARK.altarDividend });
  }
  if (paid.length) {
    world.events.push({ kind: "dividend", altar: altar.id, name: altar.name, paid });
    append(world, { e: altar.id, a: "dividend", v: { count: paid.length } });
  }
  return paid;
}

// stepAltars — the per-tick altar advance (called from ticking.mjs). For each altar:
//   - if its claim is ⊤ (erupt) and there is no live eruption Anomaly, raise one;
//   - if it had an eruption that is now gone/calmed, decay the contested evidence (return toward t);
//   - if it is t (sanctuary), pay the periodic dividend.
export function stepAltars(world) {
  for (const altar of world.entities.values()) {
    if (altar.kind !== KIND.altar || !altar.claim) continue;
    const state = altar.claim.state;
    if (altar.eruptionId && !liveAnomaly(world, altar.eruptionId)) {
      // a previously-raised eruption has been cleared (banished / fought / pacified): DECAY the
      // contested evidence so the altar settles back toward t — it does NOT immediately re-erupt.
      decayContest(world, altar);
    } else if (state === "erupt" && !altar.eruptionId) {
      // a freshly-⊤ altar with no eruption yet: the contradiction walks — raise a real ⊤ Anomaly.
      erupt(world, altar);
    }
    if (altar.claim.state === "sanctuary" && world.tick % MARK.altarDividendEvery === 0) {
      payDividend(world, altar);
    }
  }
}

// liveAnomaly — is `id` still a standing ⊤ Anomaly (not banished, not calmed back to a critter)?
function liveAnomaly(world, id) {
  const e = get(world, id);
  return !!(e && e.kind === KIND.anomaly && e.state === "anomaly");
}

// --- the wire view -----------------------------------------------------------------------------
// claimView — the renderable projection of an altar's claim for nearby players: the bilattice glyph,
// the pos/neg evidence counts (the two bars), and the settled state name.
export function claimView(altar) {
  const c = altar.claim;
  return {
    id: altar.id,
    glyph: claimGlyph(c),
    pos: c.pos.length,
    neg: c.neg.length,
    state: c.state,
  };
}
