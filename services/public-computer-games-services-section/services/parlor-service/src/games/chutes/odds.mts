/**
 * odds.mts — the "one honest twist" the face shows live while a race runs: the exact
 * probability distribution over how many more turns a player needs to finish, from wherever
 * they currently stand on the board, recomputed fresh after every roll.
 *
 * This is deliberately NOT added to `@red-cup-engineering/parlor-kernel/odds` — every function that
 * module already ships (`pigBustProbability`, `farkleBustProbability`, `yachtCategoryExpectations`,
 * `computeSlotRTP`) is a single-step or single-hand exact expectation; this is a full
 * absorbing-Markov-chain distribution over a *specific* board's jump graph, walked turn by
 * turn until the probability mass remaining outside the goal node is negligible. It composes
 * two kernel primitives exactly the way a kernel consumer is meant to (`@red-cup-engineering/parlor-kernel/board`'s
 * `resolveMove` for one turn's transition, `@red-cup-engineering/parlor-kernel/dice`'s `diePmf` for the
 * die's exact per-face probabilities) rather than reimplementing either — but the chain-walk
 * itself is board-race-specific, so it stays here rather than widening the shared kernel's
 * surface without the coordination that would take.
 *
 * The computation is exact dynamic programming (a probability-mass vector over every board
 * node, evolved one die-roll's worth of transitions per turn), never sampled: `turns[k].probability`
 * is a number `diceSumPmf`-style enumeration would also produce, extended across an
 * unbounded-in-principle number of turns and truncated at `maxTurns` for a chain whose exact
 * absorption time has no closed form once chutes can send a player backward indefinitely (in
 * probability, not in practice — the geometric decay means the truncated tail is astronomically
 * small well before `maxTurns` for any board a human would recognize as "a chutes and ladders
 * board"). `truncatedTail` reports exactly how much probability mass was left unresolved at
 * `maxTurns`, so the UI never claims false precision about a distribution it truncated.
 */
import { resolveMove } from '@red-cup-engineering/parlor-kernel/board';
import { diePmf } from '@red-cup-engineering/parlor-kernel/dice';

/**
 * The exact distribution of "turns from now until this player finishes", starting from
 * `position` on `board`, rolling a `dieSides`-sided fair die each turn (default 6, matching
 * the classic board). Returns `{ turns, truncatedTail }`:
 *   - `turns`: an array of `{ turn, probability }` for `turn` in `[1, maxTurns]` — `probability`
 *     is the exact chance of finishing on exactly that turn (not "by" that turn).
 *   - `truncatedTail`: the probability mass still short of the goal after `maxTurns` turns —
 *     `0` (or vanishingly close to it) for any board short enough that absorption is
 *     effectively certain well within `maxTurns`.
 *
 * A `position` already at the goal returns a single-entry `turns: [{ turn: 0, probability: 1 }]`
 * — "zero more turns needed" is itself a valid (degenerate) distribution, not a special case
 * the caller has to detect first.
 */
export function finishTurnDistribution(board, position, { dieSides = 6, maxTurns = 300 } = {}) {
  if (!Number.isInteger(position) || position < 0 || position > board.size) {
    throw new RangeError(`finishTurnDistribution: position ${position} is outside the board`);
  }
  if (position === board.size) {
    return { turns: [{ turn: 0, probability: 1 }], truncatedTail: 0 };
  }

  const pmf = diePmf(dieSides);
  let dist = new Map([[position, 1]]);
  const turns = [];
  let cumulativeAbsorbed = 0;

  for (let turn = 1; turn <= maxTurns && dist.size > 0; turn++) {
    const next = new Map();
    let absorbedThisTurn = 0;
    for (const [pos, mass] of dist) {
      for (const { pip, probability } of pmf) {
        const landedAt = resolveMove(board, pos, pip).landedAt;
        const p = mass * probability;
        if (landedAt === board.size) {
          absorbedThisTurn += p;
        } else {
          next.set(landedAt, (next.get(landedAt) ?? 0) + p);
        }
      }
    }
    turns.push({ turn, probability: absorbedThisTurn });
    cumulativeAbsorbed += absorbedThisTurn;
    dist = next;
  }

  return { turns, truncatedTail: Math.max(0, 1 - cumulativeAbsorbed) };
}

/** The expected number of turns to finish, computed directly from a `finishTurnDistribution`
 *  result: `sum(turn * probability)` over the resolved mass. Because `truncatedTail` (if
 *  nonzero) belongs to turns beyond what was walked, this is a slight underestimate whenever
 *  `truncatedTail > 0` — the return value is always paired with that same `truncatedTail` so a
 *  caller can decide whether the gap is worth disclosing (in practice, for the classic 100-square
 *  board, `truncatedTail` is far below floating-point-meaningful long before `maxTurns`). */
export function expectedTurnsToFinish(distribution) {
  let expected = 0;
  for (const { turn, probability } of distribution.turns) expected += turn * probability;
  return expected;
}
