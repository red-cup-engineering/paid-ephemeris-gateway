/**
 * caillois — Roger Caillois' four fundamental categories of play (Les jeux et les hommes, 1958), read
 * over a ludic CHRONICLE. This completes Caillois' SECOND axis; the first (paidía ↔ ludus, free play ↔
 * rule-bound) already lives in @emsenn/gaming (placing/paidia-ludus). See the affect/dramaturgy register
 * (gaming/dev/docs/notes/2026-06-25-affect-and-dramaturgy-in-play.md).
 *
 * Caillois' four categories factor cleanly into two oppositions the chronicle already carries:
 *   - DISPOSITION — active MASTERY (the will to win by skill, the play full of genuine choices) vs
 *     passive SURRENDER (carried along, no real choice). Read off DECISION DENSITY: the fraction of the
 *     player's actions that open a genuine choice (ramification ≥ 2) rather than a forced single line.
 *   - ORIENTATION — toward an OUTCOME (a determined result; the play resolves to a leaf) vs MAKE-BELIEVE
 *     (the real is suspended; the play does not resolve — it gives up or stays open). Read off whether
 *     the chronicle ends at a played-out leaf or a Daimon (†) / no terminus.
 *
 * The quadrant:
 *   - AGON     = mastery × outcome     — skilled contest decided by play (chess, sport).
 *   - ALEA     = surrender × outcome   — submission to fortune for a determined result (dice, lottery).
 *   - MIMICRY  = mastery × make-believe — actively becoming another; performance, not winning (theatre, role-play).
 *   - ILINX    = surrender × make-believe — surrender to vertigo; the play that unmakes the player (the swing, the spin).
 *
 * MIMICRY is the doorway to the dramaturgy layer (the performed role / front stage); ILINX is the
 * doorway to the affect layer (the intensity that overflows the game). A reading over the chronicle's
 * structure; re-derives no ludics.
 */
import type { Chronicle } from "./structuring/concurrent-game/with-symmetry/ludicizing/chronicle.mjs";

/** Caillois' four fundamental categories of play. */
export type CailloisCategory = "agon" | "alea" | "mimicry" | "ilinx";

/** The Caillois reading of a chronicle. */
export interface Caillois {
  readonly kind: "playing.caillois";
  /** the dominant category. */
  readonly dominant: CailloisCategory;
  /** decision density ∈ [0,1] — the fraction of non-give-up actions opening a genuine choice
   *  (ramification ≥ 2). High = mastery (agon/mimicry); low = surrender (alea/ilinx). */
  readonly decisionDensity: number;
  /** the disposition: `mastery` (active, decisionDensity ≥ ½) or `surrender` (passive). */
  readonly disposition: "mastery" | "surrender";
  /** the orientation: `outcome` (the play resolves to a leaf — a determined result) or `make-believe`
   *  (the real is suspended — the play gives up or stays open). */
  readonly orientation: "outcome" | "make-believe";
}

/**
 * caillois — classify a chronicle into Caillois' quadrant from its disposition (decision density:
 * active mastery vs passive surrender) and orientation (resolves to an outcome vs suspends the real).
 * agon = mastery×outcome, alea = surrender×outcome, mimicry = mastery×make-believe, ilinx =
 * surrender×make-believe.
 */
export function caillois(c: Chronicle): Caillois {
  const nonDaimon = c.actions.filter((action) => action.variety !== "daimon");
  const choices = nonDaimon.filter((action) => action.ramification.length >= 2).length;
  const decisionDensity = nonDaimon.length > 0 ? choices / nonDaimon.length : 0;
  const mastery = decisionDensity >= 0.5;
  const last = c.actions[c.actions.length - 1];
  const resolves = last !== undefined && last.variety !== "daimon";

  const dominant: CailloisCategory = mastery
    ? (resolves ? "agon" : "mimicry")
    : (resolves ? "alea" : "ilinx");

  return Object.freeze({
    kind: "playing.caillois" as const,
    dominant,
    decisionDensity,
    disposition: mastery ? "mastery" : "surrender",
    orientation: resolves ? "outcome" : "make-believe",
  });
}
