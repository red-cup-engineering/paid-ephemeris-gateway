/**
 * `validate` — the executable solvability guarantee, in the onestone tradition: "a bare X
 * budget is not a Y proof." The generator (`tangle.mts#spawnTangle`) may never emit an
 * unwinnable daily — this module is what actually checks that, for real, on every seed it is
 * asked about, rather than asserting it once and hoping the generator never drifts.
 *
 * ## What is actually certified, stated precisely (no overclaim)
 *
 * `certifyTangle(seed)` proves that the tangle `spawnTangle(seed)` produces is settleable
 * *before any player move is made*, by constructing one concrete solving sequence and replaying
 * it through the real `engine.mts#applyMove` (real cost, real `isSettled` check — nothing here
 * is asserted, everything is computed). It does NOT claim every sequence of legal player moves
 * from the daily's start is settleable *within budget* — a careless player can always spend far
 * more than the certified minimal cost. See `README.md`'s honest-weaknesses section.
 *
 * It DOES imply every reachable state stays *solvable*, just not necessarily cheaply (see
 * `engine.test.mts`'s "no permanent softlock" property test): MERGE can only ever close
 * a cycle over the pinned spanning tree (pinned bonds are never removable, by any move, at any
 * cost), and CATALYZE can only ever lock down a currently-`exchangeable` bond — but forced SPLIT
 * remains legal, at real (often severe) transfinite cost, on every non-`pinned` bond regardless of
 * whether MERGE or CATALYZE previously locked it. Since the pinned bonds always form exactly a
 * spanning tree (acyclic, by construction), forced-splitting every single non-`pinned` bond in the
 * graph — however many merges and catalyzations preceded it — always leaves exactly the spanning
 * tree behind, which has spatial H¹ = 0 by definition. So the daily is never *truly* unwinnable
 * after any legal move sequence, only potentially far more expensive than it needed to be, which
 * is the whole point of the game.
 *
 * ## The certified solving sequence
 *
 * By construction (`tangle.mts`'s module doc), a freshly spawned tangle is a spanning tree of
 * `pinned` bonds plus exactly `spatialH1Rank` extra `exchangeable` bonds ("chords"), each of
 * which closes exactly one independent cycle over the tree. Clean-SPLITting the chords in any
 * order removes them one at a time without ever disconnecting the graph (the spanning tree keeps
 * everything connected throughout) — so the tangle's spatial H¹ decreases by exactly 1 per
 * split, reaching 0 after removing all the chords. That is the whole solving sequence: no search,
 * no heuristic, a direct consequence of the generator's own construction — and it is replayed
 * for real, not just reasoned about, by every test in `validate.test.mts`.
 */
import { spawnTangle, withEnergyBudget } from './tangle.mts';
import { applyMove, isSettled } from './engine.mts';
import type { Tangle, Move } from './types.mts';

export interface Certification {
  readonly tangle: Tangle; // the daily tangle, with a real energyBudget attached
  readonly solvingSequence: readonly Move[];
  readonly minimalCost: number; // the real, summed cost of the solving sequence above
}

/** Generous headroom over the certified minimal cost — a player who does not find the optimal
 * path (the whole point of the game) still has room to finish. Tunable game-design constant,
 * not anything `@lenticule-science/metrologic` prescribes. */
export const SAFETY_MULTIPLIER = 3;

/**
 * Spawn the daily tangle for `seed`, construct its certified solving sequence, replay it through
 * the real engine, and attach an `energyBudget` derived from the real summed cost of that
 * replay. Throws if the tangle fails to settle via the certified sequence — that would mean
 * `tangle.mts`'s construction invariant was violated, which must never happen and must never be
 * silently tolerated.
 */
export function certifyTangle(seed: string, safetyMultiplier: number = SAFETY_MULTIPLIER): Certification {
  const raw = spawnTangle(seed);
  const chordBonds = raw.bonds.filter((b) => b.state === 'exchangeable');

  let current: Tangle = raw;
  const sequence: Move[] = [];
  let minimalCost = 0;
  for (const chord of chordBonds) {
    const move: Move = { verb: 'split', bondId: chord.id, mode: 'clean' };
    const { tangle: next, moveCost } = applyMove(current, move);
    sequence.push(move);
    minimalCost += moveCost.cost;
    current = next;
  }

  if (!isSettled(current)) {
    throw new Error(
      `certifyTangle: seed "${seed}" did not settle via its certified solving sequence — ` +
        'this means tangle.mts\'s spanning-tree-plus-chords invariant was violated and the ' +
        'generator produced an unwinnable daily. This must never happen; treat it as a bug.',
    );
  }

  const budget = Math.ceil(minimalCost * safetyMultiplier);
  const tangle = withEnergyBudget(raw, budget);
  return { tangle, solvingSequence: sequence, minimalCost };
}

/** The daily tangle actually meant to be played: certified and budgeted, never the raw
 * `spawnTangle` output directly. This is the function `daily.mts` consumers (the web client,
 * `history.mts`, future server code) should call. */
export function spawnCertifiedTangle(seed: string): Tangle {
  return certifyTangle(seed).tangle;
}
