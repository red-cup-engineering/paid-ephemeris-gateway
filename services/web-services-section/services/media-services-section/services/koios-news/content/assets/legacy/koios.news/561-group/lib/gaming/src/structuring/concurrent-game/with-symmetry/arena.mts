/**
 * Arenas — concurrent game systems *with symmetry*.
 *
 * An arena is the board of a running game: a polarized prime event structure
 * together with a symmetry groupoid.  Symmetry is the feature that promotes
 * plain concurrent games to Castellan-Clairambault-Winskel's $\mathbf{CGS}$ —
 * the unique $*$-autonomous theory of computing.  A *symmetry* is a bijection
 * on events preserving causality, conflict, and polarity; the groupoid of such
 * bijections is what strategy equivalence is taken up to.  When the groupoid
 * contains $\mathrm{FSym}(\mathbb{A})$ (finite permutations of a name set),
 * strategy equivalence becomes nominal equivariance — this is how nominal
 * computation embeds into the theory of computing.
 */
import {
  type Event,
  type EventPair,
  type PrimeEventStructure,
  causes,
  conflicts,
  eventById,
  eventIds,
  isPrimeEventStructure,
} from "../../event/structure.mjs";
import { samePolarity } from "../../polarity.mjs";

/** A total bijection on event ids, stored as `[from, to]` pairs. */
export type Bijection = readonly EventPair[];

/** A symmetry groupoid — a set of bijections closed (in intent) under id, inverse, composition. */
export type SymmetryGroupoid = readonly Bijection[];

export interface Arena {
  readonly kind: "game.arena";
  readonly structure: PrimeEventStructure;
  readonly symmetry: SymmetryGroupoid;
}

export const identityBijection = (structure: PrimeEventStructure): Bijection =>
  Object.freeze(eventIds(structure).map((id) => Object.freeze([id, id] as const)));

export function arena(structure: PrimeEventStructure, symmetry: SymmetryGroupoid = []): Arena {
  const id = identityBijection(structure);
  const hasIdentity = symmetry.some((bij) => sameBijection(bij, id));
  const groupoid = hasIdentity ? symmetry : [id, ...symmetry];
  return Object.freeze({
    kind: "game.arena" as const,
    structure,
    symmetry: Object.freeze(groupoid.map((bij) => Object.freeze(bij.map((pair) => Object.freeze([pair[0], pair[1]] as const))))),
  });
}

/** The discrete arena over a polarized prime event structure (only the identity symmetry). */
export const discreteArena = (structure: PrimeEventStructure): Arena => arena(structure, []);

export const arenaEvents = (a: Arena): readonly Event[] => a.structure.events;

const applyBijection = (bij: Bijection, id: string): string | null => bij.find((pair) => pair[0] === id)?.[1] ?? null;

function sameBijection(left: Bijection, right: Bijection): boolean {
  if (left.length !== right.length) return false;
  return left.every((pair) => right.some((other) => other[0] === pair[0] && other[1] === pair[1]));
}

export interface SymmetryWitness {
  readonly kind: "game.symmetry:witness";
  readonly bijection: Bijection;
}

export interface SymmetryObstruction {
  readonly kind: "game.symmetry-obstruction";
  readonly bijection: Bijection;
  readonly reason: "not-total" | "not-bijective" | "breaks-polarity" | "breaks-causality" | "breaks-conflict";
  readonly offending: EventPair;
}

export type SymmetryJudgment = SymmetryWitness | SymmetryObstruction;

/**
 * Judge whether a bijection is a symmetry of the arena: total and bijective on
 * events, and preserving polarity, causality, and conflict.
 */
export function symmetryJudgment(a: Arena, bij: Bijection): SymmetryJudgment {
  const ids = eventIds(a.structure);
  const images = new Set<string>();
  for (const id of ids) {
    const image = applyBijection(bij, id);
    if (image === null || eventById(a.structure, image) === null) {
      return Object.freeze({ kind: "game.symmetry-obstruction" as const, bijection: bij, reason: "not-total" as const, offending: Object.freeze([id, image ?? id] as const) });
    }
    if (images.has(image)) {
      return Object.freeze({ kind: "game.symmetry-obstruction" as const, bijection: bij, reason: "not-bijective" as const, offending: Object.freeze([id, image] as const) });
    }
    images.add(image);
    const source = eventById(a.structure, id);
    const target = eventById(a.structure, image);
    if (source !== null && target !== null && !samePolarity(source.polarity, target.polarity)) {
      return Object.freeze({ kind: "game.symmetry-obstruction" as const, bijection: bij, reason: "breaks-polarity" as const, offending: Object.freeze([id, image] as const) });
    }
  }
  for (const a0 of ids) {
    for (const b0 of ids) {
      const fa = applyBijection(bij, a0);
      const fb = applyBijection(bij, b0);
      if (fa === null || fb === null) continue;
      if (causes(a.structure, a0, b0) !== causes(a.structure, fa, fb)) {
        return Object.freeze({ kind: "game.symmetry-obstruction" as const, bijection: bij, reason: "breaks-causality" as const, offending: Object.freeze([a0, b0] as const) });
      }
      if (conflicts(a.structure, a0, b0) !== conflicts(a.structure, fa, fb)) {
        return Object.freeze({ kind: "game.symmetry-obstruction" as const, bijection: bij, reason: "breaks-conflict" as const, offending: Object.freeze([a0, b0] as const) });
      }
    }
  }
  return Object.freeze({ kind: "game.symmetry:witness" as const, bijection: bij });
}

export const isSymmetry = (a: Arena, bij: Bijection): boolean => symmetryJudgment(a, bij).kind === "game.symmetry:witness";

export function isArena(value: unknown): value is Arena {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Arena>;
  return candidate.kind === "game.arena" && isPrimeEventStructure(candidate.structure) && Array.isArray(candidate.symmetry);
}
