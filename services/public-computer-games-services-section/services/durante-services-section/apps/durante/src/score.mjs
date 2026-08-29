// score — the daily's integer scoring formula, PORTED FROM apps/ruinfold/src/engine/score.mts's own
// formula-SHAPE (all-integer, reason-branched, a fixed base that guarantees one outcome class always
// outranks another), with durante's own real mechanics substituted for ruinfold's depth/loot fields —
// see §2.5 of the spec this module implements. Unlike ruinfold's four-way EndReason, durante's pure
// core has NO player-death terminal condition (DESIGN.md is explicit: no HP pool, no death state, ever,
// in game.mjs) — so there are only two real terminal conditions here: "cleared" (every demon settled to
// DEAD) and "tick-cap" (the log ran out, or was truncated, before clearing). A `null` score (ruinfold's
// "voided") is kept as a reachable TYPE for forward-compatibility but is unreachable in v1 — durante has
// no void-producing mechanic today; documented here as deliberately unreachable, not silently dead code.

// DAILY_TICK_CAP — generous relative to the arena's own worst-case geometry: max floorBound N=16 means
// a diagonal of roughly 16*sqrt(2)≈23 cells; at the player's own moveSpeed=0.18 cells/tick (game.mjs's
// default), one full crossing costs ~128 ticks. Several such crossings plus maneuvering combat against
// up to 4 demons of toughness<=5 comfortably fits well under 3000 — the same "round, generously-bounded
// constant tied loosely to worst-case content size" reasoning ruinfold's own RUN_TICK_CAP=6000 uses for
// its (larger, multi-floor) content, not a tight bound.
export const DAILY_TICK_CAP = 3000;

export const VICTORY_BASE = 100000; // every clear outranks every non-clear, by construction.
export const SWIFT_MAX = 2000;
export const SURVIVAL_MAX = 500;
export const WOUND_VALUE = 50;

// totalWoundsLanded(demonReports) — the count of landed deny(demon,'alive') witnesses across every
// demon in the arena, at the moment replay stopped. This is combat.mjs's OWN evidence-append count
// (see demon.mjs's woundsOf), read back from the per-demon report `run.mjs` already carries — nothing
// invented, the same linear evidence the engine already keeps.
export function totalWoundsLanded(demonReports) {
  return demonReports.reduce((sum, d) => sum + (d.wounds ?? 0), 0);
}

// computeScore({ reason, endTick, hurt, demonReports }) — the exact formula from spec §2.5:
//   cleared:   100000 + swift(endTick) + survival(hurt)   — swift dominates among clears (the primary
//              "victory ticks" axis the task asked for; survival is the tiebreak).
//   tick-cap:  max(0, wounds*50 - hurt)                    — the only meaningful axis for a run that
//              never clears: landed damage, tie-broken down by grasp-time.
// Returns a number (never null in v1 — see module header on "voided").
export function computeScore({ reason, endTick, hurt, demonReports }) {
  if (reason === "cleared") {
    const swift = Math.floor((SWIFT_MAX * (DAILY_TICK_CAP - endTick)) / DAILY_TICK_CAP);
    const survival = Math.max(0, SURVIVAL_MAX - hurt);
    return VICTORY_BASE + swift + survival;
  }
  // tick-cap (the only other reachable reason in v1).
  const wounds = totalWoundsLanded(demonReports);
  return Math.max(0, wounds * WOUND_VALUE - hurt);
}
