/**
 * Structural predicates over the real arena/strategy carriers — the constraints
 * that cut each computational paradigm out of the full $*$-autonomous category
 * $\mathbf{CGS}$.
 *
 * `games/logic/embeddings.mts` *names* the four sub-categories as data (source
 * theory, sub-category, constraint string, theorem). This module makes those
 * constraints *executable*: each is a total predicate on an actual `Arena` or
 * `Strategy`, so paradigm membership is checked against carriers, not asserted.
 * The predicates here are the shared vocabulary; the four `paradigm/*.mts`
 * modules assemble them into witness/obstruction membership judgments.
 */
import {
  type Arena,
  type Play,
  type PrimeEventStructure,
  type Strategy,
  conflicts,
  eventById,
  identityBijection,
} from "@emsenn/gaming";

/** A bijection that fixes every event — the identity symmetry. */
const isIdentityBijection = (bij: readonly (readonly [string, string])[]): boolean =>
  bij.every((pair) => pair[0] === pair[1]);

/**
 * Whether an arena's symmetry groupoid is *trivial* — every bijection is the
 * identity. `arena()` always seeds the identity, so a discrete arena is trivial;
 * a paradigm requiring trivial symmetry (Hyland-Ong sequential, Dialectica)
 * forbids any non-identity copy-permutation. The negation is the AGMOS nominal
 * condition (a non-trivial $\mathrm{FSym}(\mathbb{A})$-action).
 */
export const hasTrivialSymmetry = (a: Arena): boolean => a.symmetry.every(isIdentityBijection);

/** Whether an arena carries a non-identity symmetry — the AGMOS/nominal feature. */
export const hasNonTrivialSymmetry = (a: Arena): boolean => !hasTrivialSymmetry(a);

/** Whether the underlying event structure has *trivial causality* — no order edges (the Dialectica/concurrent condition). */
export const hasTrivialCausality = (structure: PrimeEventStructure): boolean => structure.causality.length === 0;

/** The polarity name of an event id, or `null` if absent. */
export const polarityOf = (structure: PrimeEventStructure, id: string): "positive" | "negative" | null =>
  eventById(structure, id)?.polarity.name ?? null;

/**
 * Whether every play of a strategy *alternates* polarity — consecutive moves
 * have opposite polarity (the Hyland-Ong sequential discipline; in a genuinely
 * concurrent strategy two Player moves may be enabled at once, so alternation
 * fails). Polarity is read from the strategy's own (compound) arena.
 */
export function playsAlternate(s: Strategy): boolean {
  const structure = s.arena.structure;
  return s.plays.every((p: Play) => {
    for (let i = 1; i < p.moves.length; i += 1) {
      const prev = polarityOf(structure, p.moves[i - 1] as string);
      const here = polarityOf(structure, p.moves[i] as string);
      if (prev === null || here === null || prev === here) return false;
    }
    return true;
  });
}

/**
 * Whether *every* distinct same-polarity pair of events conflicts — the
 * Dialectica "exactly one move per side per play" discipline (intra-$U$ and
 * intra-$X$ all-pairs conflict). Checks both polarity classes.
 */
export function intraPolarityFullyConflicting(structure: PrimeEventStructure): boolean {
  for (const cls of ["positive", "negative"] as const) {
    const ids = structure.events.filter((e) => e.polarity.name === cls).map((e) => e.id);
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        if (!conflicts(structure, ids[i] as string, ids[j] as string)) return false;
      }
    }
  }
  return true;
}

/** Whether no cross-polarity pair conflicts — any (witness, challenge) is a legal joint play (Dialectica). */
export function noCrossPolarityConflict(structure: PrimeEventStructure): boolean {
  const pos = structure.events.filter((e) => e.polarity.name === "positive").map((e) => e.id);
  const neg = structure.events.filter((e) => e.polarity.name === "negative").map((e) => e.id);
  for (const u of pos) for (const x of neg) if (conflicts(structure, u, x)) return false;
  return true;
}

/** The identity bijection of an arena's event structure (re-exported for membership witnesses). */
export const arenaIdentity = (a: Arena): readonly (readonly [string, string])[] => identityBijection(a.structure);
