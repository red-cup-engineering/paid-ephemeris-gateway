// protocol — the message shapes on the wire, as plain constructor helpers. Pure, browser-safe.
// Messages are JSON `{ k, ... }` where `k` is one of MSG. The encoding (shared/encoding.mjs)
// is deliberately separable so the transport can later swap JSON for a binary packing without
// touching call sites. Keep these shapes flat and small — they ride the 15 Hz tick.

import { MSG, PROTOCOL_VERSION } from "./constants.mjs";

// server -> client, once on connect
export const hello = (id, world) => ({ k: MSG.hello, v: PROTOCOL_VERSION, id, world });

// client -> server, once after hello
export const join = (name) => ({ k: MSG.join, name: String(name ?? "wanderer").slice(0, 24) });

// client -> server, every input frame. axes are intents in {-1,0,1}; yaw is absolute radians.
// seq lets the server ack the last-processed input for client reconciliation.
export const input = (seq, fwd, strafe, yaw, attack) => ({
  k: MSG.input,
  seq: seq | 0,
  f: clampAxis(fwd),
  s: clampAxis(strafe),
  y: Number.isFinite(yaw) ? yaw : 0,
  a: attack ? 1 : 0,
});

// server -> client. A view entry is the renderable projection of a settled entity.
// charge is the bilattice glyph string ("t","f","⊤","⊥") so the client can show world-truth.
export const view = (e) => ({
  id: e.id,
  kind: e.kind,
  name: e.name,
  x: round2(e.x), y: round2(e.y), z: round2(e.z),
  yaw: round3(e.yaw),
  hp: e.hp, maxHp: e.maxHp,
  charge: e.charge,
  ...(e.marks != null ? { marks: e.marks } : {}), // [marks] only the local player's own view carries it
  ...(e.worth != null ? { worth: e.worth } : {}), // [economy] the local player's total worth (marks + fiber richness)
});

export const snapshot = (tick, you, entries) => ({ k: MSG.snapshot, tick, you, e: entries });
export const delta = (tick, ack, changed, gone) => ({ k: MSG.delta, tick, ack, c: changed, g: gone });
export const combat = (tick, attacker, target, amount, outcome) => ({
  k: MSG.combat, tick, at: attacker, tg: target, dmg: amount, out: outcome,
});
export const chat = (from, line) => ({ k: MSG.chat, from, line: String(line).slice(0, 200) });
export const bye = (id) => ({ k: MSG.bye, id });
// codex — you witnessed a Way (a bilattice value) for the first time; the client teaches it.
export const codex = (glyph) => ({ k: MSG.codex, glyph });
// [illocution] speak — client -> server: emit one of the four illocutionary forces toward the
// current target (or the open area). `force` is a FORCES key (assert/deny/abstain/contest).
export const speak = (force, targetId = null) => ({ k: MSG.speak, force: String(force), tg: targetId ?? null });
// [illocution] said — server -> client: a nearby player spoke a force. Carries the bilattice glyph
// and the speaker's position so the client paints the glyph in its world-truth colour, in place.
export const said = (from, force, glyph, x, z) => ({
  k: MSG.said, from, force: String(force), glyph, x: round2(x), z: round2(z),
});
// field — the downsampled void-tension grid `{dim, q}` (q is a dim*dim digit string, 0..9).
// [tide] `s` rides along: the world's SETTLEDNESS scalar in [0,1] (1 − total tension), for the HUD.
export const field = (grid, settledness = 0) => ({ k: MSG.field, dim: grid.dim, q: grid.q, s: round3(settledness) });
// [marks] settle — client -> server: spend marks to POSIT a claim and raise a Cairn at your feet.
export const settle = () => ({ k: MSG.settle });
// [powers] power — client -> server: spend marks to use a K₄ gauge power (`power` is a POWERS key)
// on an optional target entity. The server (server/world/powers.mjs) applies the kernel op.
export const power = (key, targetId = null) => ({ k: MSG.power, power: String(key), tg: targetId ?? null });
// [economy] trade — client -> server: a fiber-exchange action with another player. `op` is one of
// "propose" | "accept" | "cancel". For propose, `to` is the partner id, `offer`/`ask` are
// `{ marks, items:[itemId...] }` (offer = what YOU give, ask = what you want). For accept/cancel,
// `to` names the partner. The server (server/world/trade.mjs) moves marks + items only on both
// accepting; conserved (nothing created or destroyed).
export const trade = (op, to, offer = null, ask = null) => ({
  k: MSG.trade, op: String(op), to: to ?? null,
  ...(offer ? { offer } : {}), ...(ask ? { ask } : {}),
});
// [economy] inventory — server -> client: the local player's held items, marks, and total richness
// (marks + the fiber-richness of every item). `items` are `{ id, name, kind, value }`; `worth` is
// the quoted total. Sent on join and whenever the inventory or marks change.
export const inventory = (items, marks, worth) => ({
  k: MSG.inventory, items, marks: marks | 0, worth: worth | 0,
});
// [dispute] parley — client -> server: OPEN a ludics dispute (a parley) with a target foe.
export const parley = (targetId) => ({ k: MSG.parley, tg: targetId ?? null });
// [dispute] move — client -> server: PLAY one of the four illocutionary forces into the active
// dispute (`force` is a FORCES key: assert/deny/abstain/contest).
export const move = (force) => ({ k: MSG.move, force: String(force) });
// [dispute] dispute — server -> client: the live parley state. `you`/`foe` are the two stances as
// bilattice glyphs (with names); `last` is the last move's outcome; `flow` is the four-glyph
// histogram with `inFlow`; `deep` is the ⊤-count (deep play); `ended`/`yielded`/`reason` close it.
// `view` is the projection built by server/world/dispute.disputeView (sent verbatim with k stamped).
export const dispute = (view) => ({ k: MSG.dispute, ...view });
// [claims] claim — client -> server: STAKE one of the four illocutionary forces at a CLAIM ALTAR.
// `force` is a FORCES key (assert/deny/contest/abstain); `altarId` names the altar (or null → the
// nearest one the player stands by). ASSERT stakes positive evidence, DENY negative, CONTEST both,
// ABSTAIN retracts the player's own last stake. The marks staked are conserved into the altar.
export const claim = (force, altarId = null) => ({ k: MSG.claim, force: String(force), altar: altarId ?? null });
// [claims] altar — server -> client: a nearby altar's CLAIM state. `glyph` is the settled bilattice
// mark (t sanctuary / ⊤ eruption / f / ⊥), `pos`/`neg` the evidence counts (the two bars), `state`
// the settled face name, `x`/`z` the altar's place. Streamed to players within view of the altar.
export const altar = (id, glyph, pos, neg, state, x, z) => ({
  k: MSG.altar, id, glyph, pos: pos | 0, neg: neg | 0, state, x: round2(x), z: round2(z),
});

function clampAxis(n) { return n > 0 ? 1 : n < 0 ? -1 : 0; }
function round2(n) { return Math.round(n * 100) / 100; }
function round3(n) { return Math.round(n * 1000) / 1000; }
