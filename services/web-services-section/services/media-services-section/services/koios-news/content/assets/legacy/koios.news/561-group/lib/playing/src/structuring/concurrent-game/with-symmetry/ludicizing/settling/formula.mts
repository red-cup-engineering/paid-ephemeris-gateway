/**
 * Formulas — the names of behaviours.
 *
 * In ludics, "a formula is the name of a behaviour, recovered as a coarsening
 * of the locative content rather than asserted as a prior given" (Girard 2001).
 * The slogan: rules of logic are an emergent stratum on top of the logic of
 * rules.  A formula here is therefore a named behaviour: a label paired with
 * the generating design-set whose bi-orthogonal closure is the behaviour it
 * names.
 */
import { type Design } from "../../index.mjs";
import { type BehaviourWitness, generatedBehaviour, playsIn } from "./behaviour.mjs";

export interface Formula {
  readonly kind: "game.formula";
  readonly name: string;
  readonly generators: readonly Design[];
}

export function formula(name: string, generators: readonly Design[]): Formula {
  return Object.freeze({
    kind: "game.formula" as const,
    name,
    generators: Object.freeze([...generators]),
  });
}

/** The behaviour a formula names, relative to a universe of designs. */
export function denotation(f: Formula, universe: readonly Design[]): BehaviourWitness {
  return generatedBehaviour(f.generators, universe);
}

/** Whether a design proves the formula — plays in the behaviour the formula names. */
export function proves(d: Design, f: Formula, universe: readonly Design[]): boolean {
  return playsIn(d, f.generators, universe);
}

export function isFormula(value: unknown): value is Formula {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Formula>;
  return candidate.kind === "game.formula" && typeof candidate.name === "string" && Array.isArray(candidate.generators);
}
