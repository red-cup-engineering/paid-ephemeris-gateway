// ludics — a contested interaction between two parties (PvP duel, a haggle, an NPC debate, a
// contested objective) modeled as two ludics DESIGNS that interact, the dispute resolved by
// NORMALIZATION to a FOUR-valued Belnap bilattice outcome. This is the proof-theoretic side of
// the Girard–Caillois correspondence made concrete: each party is a `design` (a strategy as a
// tree of moves), the duel is the interaction `A ⟂ B`, and who-wins is read off the normal form.
//
// WHY ludics and not a damage race: combat.mjs already lands hits and descends health. A duel,
// a negotiation, a debate, a contested capture-point are NOT health races — they are dialogues
// where one side can CONCEDE (play the daimon †), the two sides can DEADLOCK (talk past each
// other), or the exchange can DIVERGE (chatter forever, nobody settles). Those are exactly the
// FOUR outcomes the bilattice hosts, and ludics' normalization computes which one a given pair
// of strategies produces — without an RNG, without a hand-coded "who wins" table. The winner is
// a theorem about the two designs, not a die roll.
//
// ────────────────────────────────────────────────────────────────────────────────────────────
// REPO GROUNDING (load-bearing; this file mirrors their vocabulary, it does not invent it):
//
//   • swarm/src/players.mjs `buildPlayerTuple()` binds a player to a CGS arena with
//       `arenaFormula: "A^perp || B"` and a handedness {recv,send,actuate,observe}, where
//       events carry `polarity: "player" | "opponent"`, "observes" = opponent-polarity events,
//       "acts" = player-polarity events. We MATCH that: a duel arena here is literally `A^perp
//       || B` (design A dualized, in parallel with design B); a player ACTS by firing a '+'
//       action (player-polarity, the `send`/`actuate` side) and OBSERVES by accepting the
//       opponent's '-' action (opponent-polarity, the `recv`/`observe` side). `act()` and
//       `await()` below are the two handedness poles.
//
//   • girard-caillois-substrate-correspondence.md item 4 ("Design polarities ↔ bilattice
//       polarities") fixes the outcome map EXACTLY:
//         positive design  ↔ t-witness        (the asserting side)
//         negative design  ↔ f-witness        (the awaiting side)
//         conflict (designs colliding w/o resolution) ↔ ⊤   (DEADLOCK — both/contested)
//         completion (both abstaining)                ↔ ⊥   (DIVERGENCE — neither/unresolved)
//       and item 9 ("Sutton-Smith ambiguity ↔ ⊤"): ⊤ is the held ambiguity of a live play, a
//       DESIGNATED value, not a derivation failure. A deadlocked duel is genuinely contested —
//       that is a legitimate result, the play running IN the ambiguity, not a crash.
//
//   • system/docs/system.md: players × strategies × coalitions as a concurrent game structure.
//       A `design` here IS a strategy (item: "players reasoning over transitions yield
//       strategies"); `normalize` is the interaction of two strategies in the shared arena.
//
// The reduction is Curien's interaction rule R for ludics designs (a.k.a. "click"/"counter"):
// the ACTIVE design fires its '+' action on a focus ξ; the PASSIVE design must have a matching
// '-' branch listening at ξ; if so that branch becomes the new active design and roles flip;
// repeat until someone plays the daimon †, until the passive cannot match (deadlock), or until
// the fuel runs out (divergence).
// ────────────────────────────────────────────────────────────────────────────────────────────

// ── LOCUS / ADDRESS ─────────────────────────────────────────────────────────────────────────
// A locus (an address) is an array of integers: a path = a channel in the arena. The root locus
// is []. A child of ξ is ξ extended by an integer. Equality is elementwise. Two loci are
// "disjoint" when neither is a prefix of the other (they name unrelated channels and can never
// interact). A '+' action focuses on a locus and opens children ξ.i for i in its ramification.

export function locusEq(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// isPrefix(p, q) — is p a (non-strict) prefix of q? [] is a prefix of everything.
export function isPrefix(p, q) {
  if (p.length > q.length) return false;
  for (let i = 0; i < p.length; i++) if (p[i] !== q[i]) return false;
  return true;
}

// disjoint — neither a prefix of the other: the two loci name unrelated channels.
export function disjoint(a, b) {
  return !isPrefix(a, b) && !isPrefix(b, a);
}

// child — extend a locus ξ by one integer i, yielding the child channel ξ.i.
export function child(locus, i) {
  return [...locus, i];
}

// locusKey — a stable string key for a locus, used to index a design's `next` map.
export function locusKey(locus) {
  return locus.join(".");
}

// ── SENTINELS: the two leaves of a design ────────────────────────────────────────────────────
// DAIMON (†) — "concede / done": the side that plays it gives up the dispute, ending the play in
//   CONVERGENCE. In Girard's ludics the daimon is the positive action that closes a design.
// OMEGA (Ω) — "no answer / stuck": there is no move here. Reaching Ω while the other side is
//   waiting on you is a DEADLOCK on your side. We make both first-class exported objects so
//   callers compare by identity (`leaf === DAIMON`), never by a fragile string.
export const DAIMON = Object.freeze({ kind: "ludics.daimon", glyph: "†" });
export const OMEGA = Object.freeze({ kind: "ludics.omega", glyph: "Ω" });

export function isDaimon(node) { return node === DAIMON; }
export function isOmega(node) { return node === OMEGA || node == null; }

// ── ACTION ──────────────────────────────────────────────────────────────────────────────────
// An action is { polarity, focus, ramif }:
//   polarity : '+' = ASSERT (my move, player-polarity — the `send`/`actuate` pole)
//              '-' = AWAIT  (opponent move, opponent-polarity — the `recv`/`observe` pole)
//   focus    : the locus this action fires on / listens at (the channel).
//   ramif    : the ramification — the child indices this action opens (for '+') or the indices
//              it is prepared to accept (for '-'). An array of integers.
// A duel move ("I lunge", "I offer 40 gold", "I cite the treaty") is one '+' action on a focus,
// with `ramif` naming the follow-up channels it opens for the opponent to answer into.

export function act(focus, ramif = []) { return { polarity: "+", focus, ramif }; }
export function await_(focus, ramif = []) { return { polarity: "-", focus, ramif }; }

// ── DESIGN ──────────────────────────────────────────────────────────────────────────────────
// A design is a node tree. A non-leaf node is { act, next }:
//   act  : the action at this node.
//   next : a Map of continuations.
//          • for a '+' node, keyed by child-locus key (locusKey(ξ.i)) — where the play goes
//            after the opponent answers into child i.
//          • for a '-' node, keyed by accepted ramification key (locusKey(ξ) or the child) —
//            the branch that fires when the opponent's '+' on this focus matches.
// A leaf is DAIMON or OMEGA. We standardize: a '-' (await) node's `next` is keyed by the focus
// the opponent will assert on, so the passive design can be looked up by "the channel the active
// side just fired on". This is the only indexing the reduction rule needs.

export function node(action, next = new Map()) {
  return { act: action, next };
}

// design — wrap a root node (or a sentinel) as a design. Identity wrapper; present so callers
// read `design(...)` and the type is named, mirroring how players.mjs names its tuple `kind`.
export function design(root) {
  return root;
}

// ── linearDesign — a strategy as a SCRIPT ─────────────────────────────────────────────────────
// Build a simple alternating design from a list of moves. `moves` is an array of {focus, ramif}
// the participant will play, in order, as '+' assertions; between them the design AWAITS the
// opponent's reply on the same focus (a '-' node), so the tree strictly alternates +,-,+,-,...
// The script ends in the DAIMON (concede/close). This is "good enough for a scripted duel or
// negotiation": you hand it the sequence of moves a fighter/haggler intends and it builds the
// alternating proof-tree, no hand-wiring of `next` maps.
//
//   linearDesign([{focus:[0],ramif:[0]}, {focus:[0,0],ramif:[]}])
//     →  + on [0] (open child 0) ─await reply on [0]─ + on [0,0] ─await─ †
//
// `opensWith` lets a SECONDARY (passive-first) design begin by AWAITING rather than asserting:
// in a duel A leads (acts first) and B responds, so B is `linearDesign(moves,{opensWith:'-'})`.
export function linearDesign(moves, { opensWith = "+" } = {}) {
  // Build from the tail backwards so each node's `next` points at the already-built remainder.
  let tail = DAIMON; // the script always closes by conceding/finishing.
  // Walk moves in reverse, wrapping the running tail.
  for (let k = moves.length - 1; k >= 0; k--) {
    const m = moves[k];
    const focus = m.focus;
    const ramif = m.ramif ?? [];
    // Determine this move's polarity. We alternate strictly from `opensWith`.
    const pol = (opensWith === "+") === (k % 2 === 0) ? "+" : "-";
    const action = pol === "+" ? act(focus, ramif) : await_(focus, ramif);
    const next = new Map();
    // Both polarities key their single continuation by their OWN focus: a '+' node continues
    // after the opponent answers on `focus`; a '-' node fires its branch when the opponent
    // asserts on `focus`. Keying both by locusKey(focus) is what lets normalize() look the
    // passive side up by "the channel the active side fired on".
    next.set(locusKey(focus), tail);
    tail = node(action, next);
  }
  return design(tail);
}

// ── FOUR (Belnap bilattice) ───────────────────────────────────────────────────────────────────
// The four designated values, named exactly as the correspondence doc uses them:
//   t  — I win        (opponent conceded: opponent played †)         [positive design / t-witness]
//   f  — I lose       (I conceded: I played †)                       [negative design / f-witness]
//   ⊤  — both/contested (DEADLOCK: designs collided without resolving) [conflict ↔ ⊤, designated]
//   ⊥  — neither/unresolved (DIVERGENCE: chatter forever / abandoned) [completion ↔ ⊥]
// ⊤ is designated, not an error: a contested duel is a real, held-ambiguity result (Sutton-Smith
// ambiguity, correspondence item 9). The game runs IN the ambiguity.
export const FOUR = Object.freeze({ TRUE: "t", FALSE: "f", BOTH: "⊤", NEITHER: "⊥" });

// ── normalize(A, B, opts) — Curien's interaction rule R ───────────────────────────────────────
// Run the dispute between design A and design B in the arena `A^perp || B`. A is the proponent:
// it ACTS FIRST (its root is a '+' assertion). We track an ACTIVE design (whose turn it is to
// fire a '+') and a PASSIVE design (which must AWAIT/match). Roles flip each step.
//
//   step: the active design fires its '+' action on focus ξ.
//     • if the active node is DAIMON → that side CONCEDES → CONVERGENCE.
//     • else the passive design must have a '-' branch listening at ξ (i.e. its current node is
//       a '-' await whose focus equals ξ). If it does, that branch's continuation becomes the
//       NEW active design, the old active's continuation (after ξ) becomes the new passive, and
//       roles flip. (recv on the opponent's send — the handedness pairing from players.mjs.)
//     • if the passive node is OMEGA / missing / a non-matching focus → DEADLOCK.
//   stop on daimon (convergence), deadlock, or fuel exhaustion (divergence).
//
// The OUTCOME is reported FROM A'S PERSPECTIVE (A is "I"): opponent (B) concedes ⇒ t; I (A)
// concede ⇒ f; deadlock ⇒ ⊤; divergence ⇒ ⊥.
//
// Returns { outcome, log, steps }. `log` is the append-only dispute transcript: each entry is
// { who:'A'|'B', type:'move'|'daimon'|'deadlock'|'diverge', focus } (focus may be null).
export function normalize(A, B, { fuel = 10000 } = {}) {
  const log = [];
  let steps = 0;

  // active = whose turn to fire '+'; we start with A as active (proponent acts first).
  let activeSide = "A";
  let active = A;
  let passive = B;

  while (steps < fuel) {
    steps++;

    // ── the active side plays the DAIMON: it concedes, the play converges. ──
    if (isDaimon(active)) {
      log.push({ who: activeSide, type: "daimon", focus: null });
      // The CONCEDING side loses. If A conceded → f (I lose); if B conceded → t (I win).
      const outcome = activeSide === "A" ? FOUR.FALSE : FOUR.TRUE;
      return { outcome, log, steps };
    }

    // ── the active side is stuck (Ω / no node): it has no move where one is owed → DEADLOCK. ──
    if (isOmega(active) || !active.act) {
      log.push({ who: activeSide, type: "deadlock", focus: null });
      return { outcome: FOUR.BOTH, log, steps };
    }

    const action = active.act;

    // A well-formed active node fires a '+' (asserts). If the active node is a '-' (await) it
    // means the active side is WAITING when it is its turn to move — nobody will assert into it,
    // so the dialogue is stuck on its side: DEADLOCK (a collision without resolution ↔ ⊤).
    if (action.polarity !== "+") {
      log.push({ who: activeSide, type: "deadlock", focus: action.focus });
      return { outcome: FOUR.BOTH, log, steps };
    }

    const xi = action.focus; // the channel the active side fires on.
    log.push({ who: activeSide, type: "move", focus: xi });

    // ── the passive side must be AWAITING at ξ. ──
    if (isDaimon(passive)) {
      // The passive side already conceded (its branch is †). It plays † now → it concedes.
      log.push({ who: activeSide === "A" ? "B" : "A", type: "daimon", focus: null });
      const conceder = activeSide === "A" ? "B" : "A";
      const outcome = conceder === "A" ? FOUR.FALSE : FOUR.TRUE;
      return { outcome, log, steps };
    }
    if (isOmega(passive) || !passive.act) {
      // No answer where the active side asserted → DEADLOCK (talking past each other).
      log.push({ who: activeSide === "A" ? "B" : "A", type: "deadlock", focus: xi });
      return { outcome: FOUR.BOTH, log, steps };
    }

    const pAction = passive.act;
    // The passive node must be a '-' (await) AND listen at exactly ξ. Otherwise the assertion
    // lands on a channel the opponent is not listening on → DEADLOCK (conflict ↔ ⊤).
    if (pAction.polarity !== "-" || !locusEq(pAction.focus, xi)) {
      log.push({ who: activeSide === "A" ? "B" : "A", type: "deadlock", focus: xi });
      return { outcome: FOUR.BOTH, log, steps };
    }

    // ── MATCH: the passive's '-' branch at ξ fires. Curien's rule R: that branch's
    // continuation becomes the new ACTIVE design; the active's continuation after ξ becomes the
    // new PASSIVE; roles flip (recv ⟷ send). ──
    const newActive = passive.next.get(locusKey(xi)) ?? OMEGA;   // the answer (becomes active)
    const newPassive = active.next.get(locusKey(xi)) ?? OMEGA;   // our own continuation (now passive)

    active = newActive;
    passive = newPassive;
    activeSide = activeSide === "A" ? "B" : "A";
  }

  // ── fuel exhausted: infinite chatter, neither converges → DIVERGENCE ↔ ⊥. ──
  log.push({ who: activeSide, type: "diverge", focus: null });
  return { outcome: FOUR.NEITHER, log, steps };
}

// ── resolveDuel(designA, designB) — normalize and name the winner ─────────────────────────────
// The ergonomic entry point the rest of the game calls. A is the challenger/proponent (acts
// first), B is the defender/responder. Returns { outcome, winner } where:
//   't' → A wins  (B conceded)
//   'f' → B wins  (A conceded)
//   '⊤' → null    (DEADLOCK — contested; the held-ambiguity result, a draw that is genuinely
//                  both-sides, e.g. a stalemated duel or a haggle nobody walked away from)
//   '⊥' → null    (DIVERGENCE — unresolved; the dispute was abandoned / chattered out)
export function resolveDuel(designA, designB, opts = {}) {
  const { outcome, log, steps } = normalize(designA, designB, opts);
  const winner = outcome === FOUR.TRUE ? "A" : outcome === FOUR.FALSE ? "B" : null;
  return { outcome, winner, log, steps };
}

// ── recordDispute — OPTIONAL trace integration ────────────────────────────────────────────────
// Append the dispute transcript to a `dispute-<id>` subject's trace via `#doing`, mirroring how
// combat.mjs reifies a `slain` predication attributed to its agent. This is the ONLY world-
// touching function in the file and it is dynamically imported, so the core stays pure JS and
// node-testable with no substrate. `doer` is the `#doing` function (so callers inject it / a
// test can pass a stub); if omitted we try to import `#doing`. Each log row becomes one
// `dispute-step` predication on the dispute subject, the focus encoded as its object.
export async function recordDispute(root, disputeId, log, t, doer) {
  let doing = doer;
  if (!doing) {
    try { doing = (await import("#doing")).default; }
    catch { return { recorded: 0, reason: "no #doing available (core is pure; skipped)" }; }
  }
  const subject = `dispute-${disputeId}`;
  let recorded = 0;
  for (const entry of log) {
    const object = entry.focus ? `${entry.who}@[${entry.focus.join(".")}]:${entry.type}` : `${entry.who}:${entry.type}`;
    // eslint-disable-next-line no-await-in-loop — trace appends are ordered; do them in sequence.
    await doing({ root, subject, predicate: "dispute-step", object, t: t() });
    recorded++;
  }
  return { recorded, subject };
}

// ──────────────────────────────────────────────────────────────────────────────────────────────
// INLINE TEST — pure JS, no world. Run: `node engine/ludics.mjs` (from the ruinfold root).
// Builds pairs of designs reaching ALL FOUR Belnap outcomes and asserts each, checking the log.
// ──────────────────────────────────────────────────────────────────────────────────────────────
function _selfTest() {
  let pass = 0, fail = 0;
  const check = (name, cond, detail = "") => {
    if (cond) { pass++; console.log(`  PASS  ${name}`); }
    else { fail++; console.log(`  FAIL  ${name}  ${detail}`); }
  };

  // ── (t) ORTHOGONAL, B concedes → A wins. ──
  // A asserts on [0]; B awaits on [0] then its branch is the daimon (B concedes). After A's
  // move, B's branch becomes active and is †, so B concedes → t, winner A.
  {
    const A = linearDesign([{ focus: [0], ramif: [0] }]);          // + on [0], then †
    const Bnode = node(await_([0], [0]), new Map([[locusKey([0]), DAIMON]])); // await [0] → †
    const r = resolveDuel(A, Bnode);
    check("(t) opponent concedes → outcome t, winner A", r.outcome === "t" && r.winner === "A", JSON.stringify(r));
    check("(t) log records A's move on [0]", r.log.some((e) => e.who === "A" && e.type === "move" && locusEq(e.focus, [0])));
    check("(t) log records a daimon", r.log.some((e) => e.type === "daimon"));
  }

  // ── (f) swap so A concedes → B wins. ──
  // A's design is just the daimon: A concedes immediately. B is whatever; A active & † → f.
  {
    const A = DAIMON;                                              // A concedes at once
    const B = linearDesign([{ focus: [0], ramif: [0] }]);
    const r = resolveDuel(A, B);
    check("(f) I concede → outcome f, winner B", r.outcome === "f" && r.winner === "B", JSON.stringify(r));
    check("(f) log records A's daimon", r.log.some((e) => e.who === "A" && e.type === "daimon"));
  }

  // ── (⊤) DEADLOCK: passive lacks the focus the active asserts on. ──
  // A asserts on [0]; B awaits on a DIFFERENT channel [7]. The assertion lands where B is not
  // listening → conflict without resolution → ⊤, winner null.
  {
    const A = linearDesign([{ focus: [0], ramif: [] }]);           // + on [0]
    const B = node(await_([7], []), new Map([[locusKey([7]), DAIMON]])); // awaits on [7] (disjoint)
    const r = resolveDuel(A, B);
    check("(⊤) deadlock (mismatched focus) → outcome ⊤, winner null", r.outcome === "⊤" && r.winner === null, JSON.stringify(r));
    check("(⊤) log records a deadlock", r.log.some((e) => e.type === "deadlock"));
    check("(⊤) the focuses are disjoint channels", disjoint([0], [7]) === true);
  }

  // ── (⊥) DIVERGENCE: a non-terminating pair — exhaust fuel. ──
  // Build two designs that volley forever on the same focus [0]: each side, on being answered at
  // [0], goes right back to asserting at [0]. We tie the knot by reusing nodes so the play never
  // reaches a daimon. With small fuel it must exhaust → ⊥.
  {
    // A: + on [0], whose continuation (the new passive) awaits [0] and loops back to a +-on-[0].
    const aPlus = node(act([0], [0]));
    const aMinus = node(await_([0], [0]));
    aPlus.next.set(locusKey([0]), aMinus);   // after firing [0], A's own continuation awaits [0]
    aMinus.next.set(locusKey([0]), aPlus);   // when answered at [0], loop back to assert [0]
    // B: mirror — awaits [0] then asserts [0], forever.
    const bMinus = node(await_([0], [0]));
    const bPlus = node(act([0], [0]));
    bMinus.next.set(locusKey([0]), bPlus);   // B answers A's [0] by becoming active asserting [0]
    bPlus.next.set(locusKey([0]), bMinus);   // B's continuation awaits [0] again
    const r = resolveDuel(aPlus, bMinus, { fuel: 50 });
    check("(⊥) infinite chatter exhausts fuel → outcome ⊥, winner null", r.outcome === "⊥" && r.winner === null, JSON.stringify(r));
    check("(⊥) log records divergence", r.log.some((e) => e.type === "diverge"));
    check("(⊥) it actually ran to the fuel cap", r.steps === 50, `steps=${r.steps}`);
  }

  // ── locus algebra sanity. ──
  check("locusEq elementwise", locusEq([1, 2, 3], [1, 2, 3]) && !locusEq([1, 2], [1, 2, 3]));
  check("isPrefix / disjoint", isPrefix([1], [1, 2]) && disjoint([0], [1]) && !disjoint([1], [1, 9]));

  // ── all four outcomes reachable (the headline assertion). ──
  const reached = new Set();
  reached.add(resolveDuel(linearDesign([{ focus: [0], ramif: [0] }]), node(await_([0], [0]), new Map([[locusKey([0]), DAIMON]]))).outcome);
  reached.add(resolveDuel(DAIMON, linearDesign([{ focus: [0] }])).outcome);
  reached.add(resolveDuel(linearDesign([{ focus: [0] }]), node(await_([7]), new Map([[locusKey([7]), DAIMON]]))).outcome);
  {
    const p = node(act([0], [0])); const m = node(await_([0], [0]));
    p.next.set(locusKey([0]), m); m.next.set(locusKey([0]), p);
    const bm = node(await_([0], [0])); const bp = node(act([0], [0]));
    bm.next.set(locusKey([0]), bp); bp.next.set(locusKey([0]), bm);
    reached.add(resolveDuel(p, bm, { fuel: 30 }).outcome);
  }
  check("ALL FOUR Belnap outcomes reachable {t,f,⊤,⊥}", reached.size === 4 && ["t", "f", "⊤", "⊥"].every((v) => reached.has(v)), [...reached].join(","));

  console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed`);
  return fail === 0;
}

// Run the self-test only when executed directly (not when imported by the engine).
if (import.meta.url === `file://${process.argv[1]}`) {
  const ok = _selfTest();
  process.exit(ok ? 0 : 1);
}
