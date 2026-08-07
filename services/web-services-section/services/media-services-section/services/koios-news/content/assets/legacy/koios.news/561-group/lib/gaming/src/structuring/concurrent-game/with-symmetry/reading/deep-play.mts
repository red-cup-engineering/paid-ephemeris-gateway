/**
 * Geertz's deep play — stakes beyond instrumental rationality become symbolic.
 *
 * Clifford Geertz (1972, *Deep Play: Notes on the Balinese Cockfight*), drawing
 * on Bentham's earlier coining, names *deep play* the regime where the stakes
 * are so high that rational-choice models say one should not engage — yet people
 * do, and by doing so the play takes on **symbolic meaning** that instrumental
 * rationality cannot reach (deep-play journal 2026-05-24).  Bentham used the term
 * to *condemn* such play as irrational; Geertz reverses the valence: the
 * stakes-beyond-rationality are precisely where the play carries meaning a
 * low-stakes game cannot.
 *
 * The journal makes the rationality critique exact: the in-game expected utility
 * $EU_{\text{in-game}} = \sum_i p_i u_i$ is often negative for high-stakes deep
 * play (Bentham was right *within* that layer); but the total utility
 * $EU_{\text{total}} = EU_{\text{in-game}} + EU_{\text{boundary}}$ includes the
 * boundary (symbolic) layer the in-game calculation suppresses, and for deep
 * play the symbolic term dominates.  Deep play is therefore exactly the regime
 * where **stakes exceed instrumental value** — where the play crosses out of the
 * purely instrumental frame into the symbolic.
 *
 * We compare *exact* magnitudes (`Rational` + `ratCompare`), matching the
 * package's promise that every measure is exact: stakes and instrumental value
 * are commensurable quantities, and depth is the strict excess of the former.
 */

import {
  type Rational,
  ratCompare,
  ratSubtract,
} from "@emsenn/relating";

export interface DeepPlayWitness {
  readonly kind: "game-analysis.deepPlay:witness";
  /** The play's total stakes (in-game plus boundary/symbolic). */
  readonly stakes: Rational;
  /** The stakes justified by instrumental (in-game expected-utility) rationality. */
  readonly instrumentalValue: Rational;
  /** stakes − instrumentalValue: the symbolic excess that rationality cannot reach. */
  readonly symbolicExcess: Rational;
}

export interface DeepPlayObstruction {
  readonly kind: "game-analysis.deepPlay-obstruction";
  readonly stakes: Rational;
  readonly instrumentalValue: Rational;
  /** `shallow` — stakes are within instrumental rationality (contained in the
   *  magic circle; Bentham's frame suffices, no symbolic surplus). */
  readonly reason: "shallow";
  /** instrumentalValue − stakes: the (non-negative) instrumental headroom. */
  readonly headroom: Rational;
}

export type DeepPlayJudgment = DeepPlayWitness | DeepPlayObstruction;

/**
 * Judge whether a play is *deep* (symbolic) in Geertz's sense: its stakes
 * **strictly exceed** what instrumental rationality justifies.  When they do,
 * the surplus is the symbolic content the in-game expected-utility calculation
 * cannot capture (a witness, carrying the `symbolicExcess`).  When stakes are
 * within instrumental value, the play is *shallow* — contained, Bentham's frame
 * suffices, no symbolic surplus (an obstruction).  Equality is shallow: the
 * play is exactly instrumentally rational, with nothing left over to symbolize.
 */
export function deepPlayJudgment(
  stakes: Rational,
  instrumentalValue: Rational,
): DeepPlayJudgment {
  if (ratCompare(stakes, instrumentalValue) > 0) {
    return Object.freeze({
      kind: "game-analysis.deepPlay:witness" as const,
      stakes,
      instrumentalValue,
      symbolicExcess: ratSubtract(stakes, instrumentalValue),
    });
  }
  return Object.freeze({
    kind: "game-analysis.deepPlay-obstruction" as const,
    stakes,
    instrumentalValue,
    reason: "shallow" as const,
    headroom: ratSubtract(instrumentalValue, stakes),
  });
}

/** Whether a play is deep: its stakes exceed instrumental rationality. */
export const isDeepPlay = (stakes: Rational, instrumentalValue: Rational): boolean =>
  deepPlayJudgment(stakes, instrumentalValue).kind === "game-analysis.deepPlay:witness";
