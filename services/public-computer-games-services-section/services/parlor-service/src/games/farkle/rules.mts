/**
 * farkle/rules.mts — Farkle's whole rule set as one frozen data object. Standard hot-dice
 * six-dice Farkle, the common "500 to get on the board, first to 10000 wins" variant (the
 * entry-threshold rule is itself a widely-published standard variant, not a house invention).
 *
 * Deliberate scope line, stated honestly rather than silently: the standard tournament rule
 * that every other player gets one final turn once someone reaches `targetScore` (so a later
 * player can still overtake before the game truly ends) is NOT implemented — a bank that
 * crosses `targetScore` ends the game immediately for everyone. This keeps the engine's win
 * condition a pure, local check inside `bank` rather than a cross-player "final round" phase.
 * A documented simplification, not an accidental omission — see the service README.
 */
export const FARKLE_RULES = Object.freeze({
  id: 'farkle',
  displayName: 'Farkle',
  /** Dice in a full hand; also what "hot dice" resets the remaining-dice pool back to. */
  diceCount: 6,
  sides: 6,
  /** First player to bank a score at or above this wins immediately. */
  targetScore: 10000,
  /** A player whose banked score is still 0 must accumulate at least this many points in a
   *  single turn before that turn's `bank` intent is legal — the standard "get on the board"
   *  rule. */
  entryThreshold: 500,
  defaultPlayers: Object.freeze(['you', 'bot']),
});

export type FarkleRules = typeof FARKLE_RULES;
