/**
 * Nominal action on a CGS arena: finite name permutations induce event
 * bijections, then the existing arena symmetry law decides whether they are
 * valid CGS symmetries.
 */
import { type EventPair, eventById } from "../../../event/structure.mjs";
import { type Arena, type Bijection, symmetryJudgment, type SymmetryJudgment } from "../arena.mjs";
import { applyPermutation, type FinitePermutation, type NominalName } from "./permutation.mjs";

export interface EventNameLabel {
  readonly kind: "game.nominal.eventName";
  readonly event: string;
  readonly name: NominalName;
}

export const eventName = (event: string, name: NominalName): EventNameLabel =>
  Object.freeze({ kind: "game.nominal.eventName" as const, event, name });

export interface NominalActionWitness {
  readonly kind: "game.nominal.action:witness";
  readonly permutation: FinitePermutation;
  readonly bijection: Bijection;
  readonly symmetry: SymmetryJudgment;
}

export interface NominalActionObstruction {
  readonly kind: "game.nominal.action-obstruction";
  readonly permutation: FinitePermutation;
  readonly reason: "unknown-event" | "duplicate-name" | "missing-image" | "not-symmetry";
  readonly event?: string;
  readonly name?: NominalName;
  readonly symmetry?: SymmetryJudgment;
}

export type NominalActionJudgment = NominalActionWitness | NominalActionObstruction;

function labelsByEvent(labels: readonly EventNameLabel[]): ReadonlyMap<string, NominalName> {
  return new Map(labels.map((label) => [label.event, label.name]));
}

function eventsByName(labels: readonly EventNameLabel[], permutation: FinitePermutation): Map<NominalName, string> | NominalActionObstruction {
  const out = new Map<NominalName, string>();
  for (const label of labels) {
    if (out.has(label.name)) {
      return Object.freeze({
        kind: "game.nominal.action-obstruction" as const,
        permutation,
        reason: "duplicate-name" as const,
        event: label.event,
        name: label.name,
      });
    }
    out.set(label.name, label.event);
  }
  return out;
}

const isNominalActionObstruction = (
  value: Bijection | NominalActionObstruction,
): value is NominalActionObstruction => !Array.isArray(value);

/** Build the event bijection induced by a finite name permutation. */
export function permutationBijection(
  arena: Arena,
  labels: readonly EventNameLabel[],
  permutation: FinitePermutation,
): Bijection | NominalActionObstruction {
  const byEvent = labelsByEvent(labels);
  const byName = eventsByName(labels, permutation);
  if (!(byName instanceof Map)) return byName;
  const pairs: EventPair[] = [];
  for (const event of arena.structure.events) {
    const name = byEvent.get(event.id);
    if (name === undefined) {
      pairs.push(Object.freeze([event.id, event.id] as const));
      continue;
    }
    const imageName = applyPermutation(permutation, name);
    const imageEvent = byName.get(imageName);
    if (imageEvent === undefined) {
      return Object.freeze({
        kind: "game.nominal.action-obstruction" as const,
        permutation,
        reason: "missing-image" as const,
        event: event.id,
        name: imageName,
      });
    }
    if (eventById(arena.structure, imageEvent) === null) {
      return Object.freeze({
        kind: "game.nominal.action-obstruction" as const,
        permutation,
        reason: "unknown-event" as const,
        event: imageEvent,
      });
    }
    pairs.push(Object.freeze([event.id, imageEvent] as const));
  }
  return Object.freeze(pairs);
}

/** Decide whether a finite name permutation acts as a CGS symmetry. */
export function nominalActionJudgment(
  arena: Arena,
  labels: readonly EventNameLabel[],
  permutation: FinitePermutation,
): NominalActionJudgment {
  const bijection = permutationBijection(arena, labels, permutation);
  if (isNominalActionObstruction(bijection)) return bijection;
  const symmetry = symmetryJudgment(arena, bijection);
  return symmetry.kind === "game.symmetry:witness"
    ? Object.freeze({ kind: "game.nominal.action:witness" as const, permutation, bijection, symmetry })
    : Object.freeze({
        kind: "game.nominal.action-obstruction" as const,
        permutation,
        reason: "not-symmetry" as const,
        symmetry,
      });
}
