/**
 * discipline — a practice as a BEHAVIOUR (frontier register: skills-disciplines-and-the-character-agent).
 *
 * In the 561 corpus a character inhabits working DOMAINS (divining, engineering, performing, governing,
 * …) — its disciplines. On the ludic substrate a discipline is exactly a Girard BEHAVIOUR: the
 * bi-orthogonal closure of its exemplary plays, the magic-circle'd set of plays that COUNT in the
 * practice. A character practices a discipline iff its design lies in that behaviour (it proves the
 * discipline's formula). This is the playing-side reading of the same boundary gaming names with the
 * magic circle and the lusory attitude.
 *
 * Consumes the real `biorthogonalClosure`; re-derives no ludics.
 */
import { biorthogonalClosure } from "./structuring/concurrent-game/with-symmetry/ludicizing/settling/behaviour.mjs";
import type { Design } from "./structuring/concurrent-game/with-symmetry/ludicizing/design.mjs";

/** A membership key for a design — its committed loci and charges, order-independent. */
export const designKey = (d: Design): string =>
  d.entries.map((e) => `${e.locusKey}:${e.charge.name}`).sort().join("|");

/** A discipline — a named practice, realized as a behaviour over a universe of plays. */
export interface Discipline {
  readonly kind: "playing.discipline";
  /** the practice's name (the working domain). */
  readonly name: string;
  /** the behaviour B = generators^⊥⊥ — the plays that count in the practice. */
  readonly behaviour: readonly Design[];
  /** the size of the behaviour. */
  readonly size: number;
  /** the exemplary plays the practice is generated from (kept so mastery can read incarnation against it). */
  readonly generators: readonly Design[];
  /** the ambient universe the closure is taken within. */
  readonly universe: readonly Design[];
}

/**
 * discipline — constitute a named practice as the bi-orthogonal closure of its exemplary plays: the
 * magic-circle'd set of plays that count within it. `generators` are the practice's exemplars;
 * `universe` is the ambient design set.
 */
export function discipline(name: string, generators: readonly Design[], universe: readonly Design[]): Discipline {
  const behaviour = biorthogonalClosure(generators, universe);
  return Object.freeze({
    kind: "playing.discipline" as const,
    name,
    behaviour: Object.freeze([...behaviour]),
    size: behaviour.length,
    generators: Object.freeze([...generators]),
    universe: Object.freeze([...universe]),
  });
}

/** Whether a design is admitted to the discipline — its play counts within the practice (it lies in the
 *  behaviour). The ludic form of "this character practices this discipline". */
export function admits(d: Discipline, design: Design): boolean {
  const key = designKey(design);
  return d.behaviour.some((member) => designKey(member) === key);
}
