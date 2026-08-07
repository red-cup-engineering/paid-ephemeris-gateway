/**
 * jury — socializing's EPISTEMIC-DEMOCRACY capabilities: the Condorcet Jury Theorem and Scott Page's
 * Diversity Prediction Theorem. These are the THEOREMS behind the claim `face.mts` already asserts —
 * that a diverse swarm of many ordinary agents beats one strong agent (the saturation-at-~4 reading).
 * Here that assertion is given its formal backbone.
 *
 * Condorcet Jury Theorem (1785): n independent jurors each correct with probability p > ½; the
 * probability the MAJORITY is correct strictly exceeds p and tends to 1 as n → ∞ (and below ½ it
 * tends to 0 — the dark side: a swarm of worse-than-random agents is worse than one). Diversity
 * Prediction Theorem (Page 2007), an EXACT algebraic identity for squared-error estimates:
 *
 *     CrowdError = AverageIndividualError − Diversity
 *
 * the crowd's error equals the average member error minus the prediction diversity — so diversity is
 * not a tax on accuracy, it is a subtraction FROM error. Both are rigorous (no fudge): the CJT a
 * binomial tail, the DPT an exact variance decomposition.
 */

/** Binomial coefficient C(n, k), multiplicatively (float). */
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  const j = Math.min(k, n - k);
  let result = 1;
  for (let i = 0; i < j; i += 1) result = (result * (n - i)) / (i + 1);
  return result;
}

/** The Condorcet Jury Theorem reading for n jurors each independently correct with probability p. */
export interface CondorcetJury {
  readonly kind: "socializing.condorcet-jury";
  /** the per-juror competence p. */
  readonly competence: number;
  /** the number of (independent) jurors. */
  readonly jurors: number;
  /** the probability the MAJORITY verdict is correct (binomial tail, strict majority; ties counted as
   *  a coin flip). */
  readonly majorityCorrect: number;
  /** the swarm IMPROVES on a lone agent: majorityCorrect > competence (holds when p > ½, n ≥ 3). */
  readonly improvesOnIndividual: boolean;
  /** the CJT regime: `amplifies` (p > ½ — more jurors → truth), `degrades` (p < ½ — more jurors →
   *  error, the dark side), or `neutral` (p = ½). */
  readonly regime: "amplifies" | "degrades" | "neutral";
}

/**
 * condorcetJury — the probability the majority of `jurors` independent agents (each correct with
 * probability `competence`) returns the correct verdict, by the binomial tail. Ties (even juries) are
 * split as a coin flip. The headline: with competence > ½ the majority strictly beats the individual
 * and tends to certainty as the jury grows — the formal warrant for scaling a diverse agent swarm.
 */
export function condorcetJury(competence: number, jurors: number): CondorcetJury {
  if (competence < 0 || competence > 1) throw new RangeError("condorcetJury: competence must be in [0,1]");
  if (!Number.isInteger(jurors) || jurors < 1) throw new RangeError("condorcetJury: jurors must be a positive integer");
  let majorityCorrect = 0;
  for (let k = 0; k <= jurors; k += 1) {
    const prob = choose(jurors, k) * competence ** k * (1 - competence) ** (jurors - k);
    if (k * 2 > jurors) majorityCorrect += prob;
    else if (k * 2 === jurors) majorityCorrect += prob / 2; // a tie breaks as a coin flip
  }
  return Object.freeze({
    kind: "socializing.condorcet-jury" as const,
    competence,
    jurors,
    majorityCorrect,
    improvesOnIndividual: majorityCorrect > competence,
    regime: competence > 0.5 ? "amplifies" : competence < 0.5 ? "degrades" : "neutral",
  });
}

/** Scott Page's Diversity Prediction Theorem decomposition of a crowd's squared error. */
export interface DiversityPrediction {
  readonly kind: "socializing.diversity-prediction";
  /** the crowd's collective error: (mean(estimates) − truth)². */
  readonly crowdError: number;
  /** the average individual error: mean((eᵢ − truth)²). */
  readonly averageError: number;
  /** the prediction diversity: the variance of the estimates, mean((eᵢ − mean)²). */
  readonly diversity: number;
  /** the crowd beats its average member (crowdError < averageError) — true whenever diversity > 0. */
  readonly crowdBeatsAverage: boolean;
}

/**
 * diversityPrediction — Page's EXACT identity CrowdError = AverageIndividualError − Diversity for a
 * set of point estimates against a truth. The crowd (the mean estimate) errs by exactly the average
 * member error minus the diversity (variance) of the estimates. Diversity is therefore pure upside:
 * adding a differently-wrong estimate cannot raise crowd error. The formal core of "diversity trumps
 * ability" for an agent ensemble.
 */
export function diversityPrediction(estimates: readonly number[], truth: number): DiversityPrediction {
  if (estimates.length === 0) throw new RangeError("diversityPrediction: need at least one estimate");
  const mean = estimates.reduce((sum, value) => sum + value, 0) / estimates.length;
  const crowdError = (mean - truth) ** 2;
  const averageError = estimates.reduce((sum, value) => sum + (value - truth) ** 2, 0) / estimates.length;
  const diversity = estimates.reduce((sum, value) => sum + (value - mean) ** 2, 0) / estimates.length;
  return Object.freeze({
    kind: "socializing.diversity-prediction" as const,
    crowdError,
    averageError,
    diversity,
    crowdBeatsAverage: diversity > 0,
  });
}
