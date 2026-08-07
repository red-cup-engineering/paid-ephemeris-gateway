/**
 * power — socializing's VOTING-POWER indices: Banzhaf and Shapley–Shubik. A decision rule reports who
 * ALIGNED; power asks who was DECISIVE. In a weighted voting body the nominal weight is not the power:
 * a large bloc can be a dummy and a small bloc pivotal. For an agent collective this is the right way
 * to weight influence — and to catch a hidden dominator the degree-counting kyriarchy classifier in
 * `govern.mts` would miss (a member pivotal in every winning coalition is a κύριος by power, whatever
 * its nominal weight).
 *
 * Banzhaf (1965): a player's power ∝ the number of coalitions in which it SWINGS (its departure flips
 * a winning coalition to losing). Shapley–Shubik (1954): a player's power ∝ the fraction of join
 * orderings in which it is PIVOTAL (the member whose arrival crosses the quota). Both are computed by
 * exact enumeration over the 2ⁿ⁻¹ / n! structure — bounded to small bodies (the realistic case for a
 * council of agents).
 */

/** The two power indices for one player in a weighted voting game. */
export interface PlayerPower {
  /** the player's nominal weight. */
  readonly weight: number;
  /** Banzhaf index — share of total swings (normalized to sum 1 across players). */
  readonly banzhaf: number;
  /** Shapley–Shubik index — share of pivotal positions over all join orderings (sums to 1). */
  readonly shapleyShubik: number;
  /** a DUMMY: zero power under both indices — never decisive despite its weight. */
  readonly dummy: boolean;
  /** a DICTATOR: full power (both indices = 1) — decisive in every coalition. */
  readonly dictator: boolean;
}

/** The power analysis of a weighted voting game (weights + quota). */
export interface VotingPower {
  readonly kind: "socializing.voting-power";
  readonly quota: number;
  readonly players: readonly PlayerPower[];
}

const factorial = (n: number): number => {
  let result = 1;
  for (let i = 2; i <= n; i += 1) result *= i;
  return result;
};

/**
 * votingPower — the Banzhaf and Shapley–Shubik power of each player in a weighted voting game with the
 * given integer-or-real weights and quota (a coalition wins iff its total weight ≥ quota). Computed by
 * exact enumeration over the 2ⁿ⁻¹ coalitions of the other players; bounded to ≤ 20 players.
 */
export function votingPower(weights: readonly number[], quota: number): VotingPower {
  const n = weights.length;
  if (n > 20) throw new RangeError("votingPower: at most 20 players (exact enumeration is exponential)");
  const nFactorial = factorial(n);
  const swings = new Array<number>(n).fill(0);
  const shapley = new Array<number>(n).fill(0);

  for (let player = 0; player < n; player += 1) {
    const others = [...Array(n).keys()].filter((index) => index !== player);
    const m = others.length;
    for (let mask = 0; mask < (1 << m); mask += 1) {
      let coalitionWeight = 0;
      let size = 0;
      for (let bit = 0; bit < m; bit += 1) {
        if (mask & (1 << bit)) {
          coalitionWeight += weights[others[bit]!]!;
          size += 1;
        }
      }
      // the player SWINGS this coalition: it is losing without the player, winning with.
      if (coalitionWeight < quota && coalitionWeight + weights[player]! >= quota) {
        swings[player]! += 1;
        // Shapley–Shubik: weight this swing by |S|! (n−|S|−1)! orderings where the player is pivotal.
        shapley[player]! += (factorial(size) * factorial(n - size - 1)) / nFactorial;
      }
    }
  }

  const totalSwings = swings.reduce((sum, value) => sum + value, 0);
  const players: PlayerPower[] = weights.map((weight, player) => {
    const banzhaf = totalSwings === 0 ? 0 : swings[player]! / totalSwings;
    const shapleyShubik = shapley[player]!;
    return Object.freeze({
      weight,
      banzhaf,
      shapleyShubik,
      dummy: swings[player]! === 0,
      dictator: shapleyShubik > 0.999999,
    });
  });

  return Object.freeze({
    kind: "socializing.voting-power" as const,
    quota,
    players: Object.freeze(players),
  });
}
