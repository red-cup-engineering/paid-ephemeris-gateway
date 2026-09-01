// [dispute] dispute — THE LUDICS DISPUTE (a Parley): a two-sided move-exchange contest, the piece
// ludics-grounding.md (docs/dev/notes/ludics-grounding.md) names as the missing one: "a two-sided
// contest driver — agon's harness". It is the NON-LETHAL win path: you do not strike a foe down,
// you out-argue it until it YIELDS.
//
// GROUNDING (honoured here, not skinned):
//   - An interaction is two designs composing. Each side holds a STANCE — a kernel-shaped CHARGE
//     ({value:[pos,neg], evidence}) — and a MOVE composes a force's charge against the opponent's
//     stance with the REAL kernel charge ops (kernel.mjs: meetTruth ⊙, joinKnowledge ∨ₖ).
//   - The MOVES are the four illocutionary forces (shared/illocution.mjs): assert=t, deny=f,
//     abstain=⊥, contest=⊤. "⊤ is PLAY itself." Each move's OUTCOME is read off the resulting
//     charge with present / isTop — its glyph.
//   - CONVERGENCE = one side YIELDS: its stance settles to f (overwhelmed) — the daimon †. A
//     yielding hostile NPC is PACIFIED. DIVERGENCE = both hold ⊤ (mutual contest): a stalemate.
//   - "Flow = the active bilattice" — a MIX of all four glyphs over the move log. deepPlay = the
//     count of ⊤ moves (Geertz's depth). Cheating/⊤ falls out naturally — it is just play held.
//
// Pure-ish: this module owns the parley algebra + the deterministic NPC counter-AI. The session
// layer (server/net/session.mjs) opens/plays disputes and streams the state; effects on a yielding
// entity (pacify / penalise) are applied here against the live world record.

import { KIND } from "../../shared/constants.mjs";
import { FORCES } from "../../shared/illocution.mjs";
import { joinKnowledge, meetTruth, present, isTop } from "./kernel.mjs";
import { get } from "./store.mjs";

// --- stance charges, kernel-shaped (mirrors value.mjs's life-cell shape) -----------------------
// a witness is any small datum the kernel unions losslessly; we tag the source + tick.
const witness = (src, t) => ({ src, t });

// the four force CHARGES — one per illocutionary force, the very bits the codex names:
//   assert  t  : positive evidence only          [pos, neg] = [true,  false]
//   deny    f  : negative evidence only           [false, true]
//   abstain ⊥  : neither face (the identity)       [false, false]
//   contest ⊤  : BOTH faces at once               [true,  true]
const forceCharge = (force, w) => {
  switch (force) {
    case "assert":  return { value: [true, false],  evidence: [[w], []] };
    case "deny":    return { value: [false, true],  evidence: [[], [w]] };
    case "abstain": return { value: [false, false], evidence: [[], []] };
    case "contest": return { value: [true, true],   evidence: [[w], [w]] };
    default:        return { value: [false, false], evidence: [[], []] };
  }
};

// a starting stance: a positive (t) charge whose POSITIVE evidence holds `ground` witnesses — the
// "ground" a side stands on. The target's ground starts from its hostility (a hot foe digs in
// harder); the player's from neutral. More positive witnesses = more ground to lose before f.
function startStance(ground, src, tick) {
  const pos = [];
  for (let i = 0; i < ground; i++) pos.push(witness(src, tick - i));
  return { value: [true, false], evidence: [pos, []] };
}

// glyph — name the four-value face of a stance/outcome charge (the codex glyph the wire carries).
export function glyph(charge) {
  if (isTop(charge)) return "⊤";
  const [pos, neg] = present(charge);
  if (pos && !neg) return "t";
  if (neg && !pos) return "f";
  return "⊥";
}

// the stance's standing GROUND: how many positive witnesses it still holds (≥0). When the positive
// FACE is no longer asserted (a meet lowered it) the side has lost the floor — it is overwhelmed.
const groundOf = (charge) => charge.evidence[0].length;
const hasFloor = (charge) => present(charge)[0] === true; // positive face still asserted?

// --- the parley state --------------------------------------------------------------------------
// Held on the world as `world.disputes` (a Map keyed by the initiator's player id) AND mirrored on
// both entities as `e._dispute` so the tick/AI can find it. One live dispute per initiator.

export function ensureDisputes(world) {
  if (!world.disputes) world.disputes = new Map();
  return world.disputes;
}

// open — begin a parley between `initiator` (the player) and `target` (a foe). Returns the dispute
// or null (already in one / invalid target). Stances are seeded: the target's ground from its
// hostility (a hostile/anomalous foe stands firmer), the player's from neutral.
export function open(world, initiator, target) {
  if (!initiator || !target || initiator.id === target.id) return null;
  if (target.state === "dead") return null;
  if (target.kind === KIND.keeper || target.kind === KIND.cairn || target.kind === KIND.resonance) return null;
  const disputes = ensureDisputes(world);
  if (initiator._dispute || target._dispute) return null; // one parley at a time per side
  // hostile foes (and ⊤ anomalies) stand on more ground; a calm critter folds fast.
  const targetGround = (target.hostile || target.kind === KIND.anomaly) ? 4 : 2;
  const d = {
    id: initiator.id,                 // keyed by the initiator (the player who opened it)
    a: initiator.id, b: target.id,    // the two sides
    stance: {
      [initiator.id]: startStance(2, "neutral", world.tick),       // the player: neutral ground
      [target.id]: startStance(targetGround, "hostility", world.tick),
    },
    moves: [],                         // the move log: { by, force, glyph } per played move
    turn: initiator.id,               // whose move it is (the initiator opens)
    ended: false, yielded: null, reason: null,
    openedTick: world.tick,
  };
  disputes.set(d.id, d);
  initiator._dispute = d;
  target._dispute = d;
  return d;
}

// the side NOT `id` in dispute `d`.
const other = (d, id) => (id === d.a ? d.b : d.a);

// play — `actorId` plays `force` into dispute `d`. Resolves the move against the OPPONENT's stance
// with the REAL kernel charge ops, records the outcome glyph, then (unless the dispute just ended)
// lets the NPC side auto-counter. Returns { ok, outcome } — outcome is the move's glyph, or a
// reason string when the move could not apply ("no-dispute" / "ended" / "not-your-turn").
export function play(world, d, actorId, force) {
  if (!d || d.ended) return { ok: false, outcome: "ended" };
  if (!FORCES[force]) return { ok: false, outcome: "bad-force" };
  if (actorId !== d.turn) return { ok: false, outcome: "not-your-turn" };

  applyMove(world, d, actorId, force);
  if (settleDispute(world, d)) return { ok: true, outcome: d.moves[d.moves.length - 1].glyph };

  // hand the turn to the opponent; if that opponent is an NPC, auto-counter at once.
  d.turn = other(d, actorId);
  const opp = get(world, d.turn);
  if (opp && opp.kind !== KIND.player) {
    const counter = counterForce(d, actorId, force);
    applyMove(world, d, d.turn, counter);
    if (!settleDispute(world, d)) d.turn = actorId; // back to the player
  }
  return { ok: true, outcome: d.moves[d.moves.length - 1].glyph };
}

// applyMove — compose `force`'s charge against the opponent's stance with the kernel, write the new
// opponent stance, and append the move's outcome glyph to the log. The four forces act as:
//   assert  → MEET (⊙) the opponent's stance with t: positive AND'd (it can drop the floor),
//             negative OR'd — push the opponent toward f. It loses ground.
//   deny    → the opponent DEFENDS: we JOIN (∨ₖ) positive life-evidence back onto the ACTOR's own
//             stance (deny the loss; re-shore your floor), leaving the opponent be.
//   contest → JOIN (∨ₖ) ⊤ onto the opponent's stance — force BOTH faces: escalation to ⊤.
//   abstain → the actor YIELDS ground: meet the ACTOR's OWN stance with the abstain identity-shadow
//             (drop one positive witness) — you give, you do not take.
function applyMove(world, d, actorId, force) {
  const oppId = other(d, actorId);
  const w = witness(force, world.tick);
  const fc = forceCharge(force, w);
  let outcomeCharge;

  if (force === "assert") {
    // Push the opponent toward f, kernel-honestly: first bleed TWO of its footholds (a decisive
    // assertion — so a defender's single re-shoring deny cannot fully cancel a sustained assault),
    // dropping the positive FACE once no foothold remains; then ⊙ (meetTruth) with t (AND positive,
    // OR negative) and ∨ₖ (joinKnowledge) the converse `f` onto it — so a floor-lost stance reads f,
    // not the empty ⊥. The kernel ops do the deciding; we only supply the evidence.
    const bled = bleedGround(bleedGround(d.stance[oppId]), true);
    // meet with a VALUE-ONLY t (no witnesses) so the assault does not gift the opponent ground —
    // it ANDs the positive face and ORs the negative, the kernel's truth-meet, nothing more.
    const met = meetTruth({ left: bled, right: { value: [true, false], evidence: [[], []] } });
    const converse = { value: [false, true], evidence: [[], [w]] }; // the denial the assertion implies
    d.stance[oppId] = hasFloor(met)
      ? met // still standing — just thinner ground; keep it t
      : joinKnowledge({ left: met, right: converse }); // floor gone → settle the negative face: f
    outcomeCharge = d.stance[oppId];
  } else if (force === "deny") {
    // defend: knowledge-join positive evidence back onto your OWN stance (re-shore the floor).
    d.stance[actorId] = joinKnowledge({ left: d.stance[actorId], right: { value: [true, false], evidence: [[w], []] } });
    outcomeCharge = d.stance[actorId];
  } else if (force === "contest") {
    // escalate: knowledge-join ⊤ onto the opponent — BOTH faces asserted → ⊤ (play held).
    d.stance[oppId] = joinKnowledge({ left: d.stance[oppId], right: fc });
    outcomeCharge = d.stance[oppId];
  } else { // abstain
    // yield ground: drop one of your OWN positive witnesses (you give the floor away).
    d.stance[actorId] = bleedGround(d.stance[actorId], true);
    outcomeCharge = d.stance[actorId];
  }

  d.moves.push({ by: actorId, force, glyph: glyph(outcomeCharge) });
}

// bleedGround — drop one positive witness from a stance (lose a foothold). When `andLowerFace` is
// set and that was the last positive witness, also drop the positive value face (the floor is gone)
// — abstaining yourself to nothing settles you out. For assert against an opponent we only thin the
// evidence; the kernel meet decides the face.
function bleedGround(charge, andLowerFace = false) {
  const pos = charge.evidence[0].slice(0, Math.max(0, charge.evidence[0].length - 1));
  const value = [...charge.value];
  if (andLowerFace && pos.length === 0) value[0] = false; // no floor left → drop the positive face
  return { value, evidence: [pos, charge.evidence[1].slice()] };
}

// settleDispute — read both stances; if EITHER side has lost its floor (positive face no longer
// asserted, the kernel's f reading) that side YIELDS — the daimon †. Mutual ⊤ that has dragged on
// is a stalemate (divergence). Applies the effect and marks the dispute ended. Returns true if it
// ended on this move.
function settleDispute(world, d) {
  const sa = d.stance[d.a], sb = d.stance[d.b];
  const aFloor = hasFloor(sa) && groundOf(sa) > 0;
  const bFloor = hasFloor(sb) && groundOf(sb) > 0;

  // DIVERGENCE — both sides standing only on ⊤ (mutual contest), enough rounds in: stalemate.
  if (isTop(sa) && isTop(sb) && deepPlay(d.moves) >= 3) {
    return finish(world, d, null, "stalemate");
  }
  // CONVERGENCE — a side has lost its floor: it yields (†). If both fell on the same beat, the
  // side whose TURN it is not (the one just acted upon) yields.
  if (!aFloor && !bFloor) return finish(world, d, d.turn === d.a ? d.b : d.a, "double");
  if (!aFloor) return finish(world, d, d.a, "overwhelmed");
  if (!bFloor) return finish(world, d, d.b, "overwhelmed");
  return false;
}

// finish — end the dispute: record the yielder, apply the consequence, and unlink both sides.
function finish(world, d, yielderId, reason) {
  d.ended = true;
  d.yielded = yielderId;     // null for a stalemate (no winner)
  d.reason = reason;
  if (yielderId) {
    const y = get(world, yielderId);
    if (y) (y.kind === KIND.player ? penalisePlayer : pacify)(world, y);
  }
  release(world, d);
  return true;
}

// pacify — a yielding hostile NPC is PACIFIED: it lays down its hostility (daimon †). It is no
// longer hostile, no longer hunts, and a hostile foe peaceably surrenders a few of its marks to
// the victor (the initiator). A ⊤ Anomaly that yields is calmed back to a settled critter.
function pacify(world, npc) {
  npc.hostile = false;
  npc.intends = "wander";
  npc.target = null;
  npc._pacified = true;
  if (npc.kind === KIND.anomaly) { npc.kind = KIND.critter; npc.name = `Calmed ${npc.name}`; }
  npc.dirty = true;
}

// penalisePlayer — a yielding player takes a small, NON-LETHAL penalty: a brief stun (rooted, like
// Bind) and the loss of a few marks (conserved nowhere — a parley humbling, not a death).
function penalisePlayer(world, p) {
  p.boundUntil = world.tick + 30; // ~2s rooted at 15 Hz (the same field ticking.mjs honours)
  p.marks = Math.max(0, (p.marks || 0) - 3);
  p.dirty = true;
}

// release — drop the dispute from the world map and unlink both entities.
export function release(world, d) {
  if (!d) return;
  ensureDisputes(world).delete(d.id);
  const a = get(world, d.a), b = get(world, d.b);
  if (a && a._dispute === d) a._dispute = null;
  if (b && b._dispute === d) b._dispute = null;
}

// counterForce — the NPC's deterministic counter-AI. It answers the player's last force sensibly:
//   - the player ASSERTED (pushing me to f)        → I DENY (defend, re-shore my floor).
//   - the player DENIED (shoring up)               → I ASSERT (push back on their floor).
//   - the player CONTESTED (⊤ on me)               → I CONTEST back (mutual ⊤ → toward stalemate).
//   - the player ABSTAINED (gave ground)           → I ASSERT (press the advantage).
// No RNG — the world stays confluent (alea is deferred per the grounding note).
export function counterForce(d, playerId, playerForce) {
  switch (playerForce) {
    case "assert":  return "deny";
    case "deny":    return "assert";
    case "contest": return "contest";
    case "abstain": return "assert";
    default:        return "assert";
  }
}

// --- reads over the move log (the ludics measures) ---------------------------------------------

// flow — "Flow is the active bilattice": a histogram of the four outcome glyphs across the moves,
// plus `inFlow` = whether ≥3 of the four kinds appeared (a real MIX, not one-note). ⊥ alone is
// boring, t alone trivial, f alone defeat, ⊤ alone chaos; flow is the mix.
export function flow(moves) {
  const hist = { t: 0, f: 0, "⊤": 0, "⊥": 0 };
  for (const m of moves) if (m.glyph in hist) hist[m.glyph]++;
  const kinds = Object.values(hist).filter((n) => n > 0).length;
  return { hist, kinds, inFlow: kinds >= 3 };
}

// deepPlay — Geertz's depth of play: the count of ⊤ moves in the log (predicates carrying ⊤ on the
// real/game boundary). Deep play is when the contest is, again and again, held at ⊤.
export function deepPlay(moves) {
  return moves.reduce((n, m) => n + (m.glyph === "⊤" ? 1 : 0), 0);
}

// --- the wire view -----------------------------------------------------------------------------
// disputeView — the renderable projection of a dispute for one viewer: the two stances as glyphs,
// the last outcome, the flow histogram + deepPlay, whose turn, and (once ended) who yielded.
export function disputeView(world, d, viewerId) {
  const f = flow(d.moves);
  const last = d.moves[d.moves.length - 1] || null;
  const me = d.a === viewerId ? d.a : d.b;
  const foe = other(d, me);
  const nameOf = (id) => { const e = get(world, id); return e ? e.name : id; };
  return {
    you: glyph(d.stance[me]), youName: nameOf(me),
    foe: glyph(d.stance[foe]), foeName: nameOf(foe),
    yourTurn: !d.ended && d.turn === viewerId,
    last: last ? { by: last.by === viewerId ? "you" : "foe", force: last.force, glyph: last.glyph } : null,
    flow: f.hist, inFlow: f.inFlow, deepPlay: deepPlay(d.moves),
    ended: d.ended, reason: d.reason,
    // who yielded, from the viewer's seat: "you" | "foe" | null (stalemate)
    yielded: d.ended ? (d.yielded == null ? null : (d.yielded === viewerId ? "you" : "foe")) : undefined,
  };
}
