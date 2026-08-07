/**
 * effectivity — socializing's COALITION EFFECTIVITY as a Chu space over FOUR, with the power/liability
 * DUAL INVOLUTION. Pauly's coalition logic (the semantics of the [C]φ operator already cited in
 * `govern.mts`) is built on EFFECTIVITY FUNCTIONS: which outcomes a coalition can force. The cutting
 * insight realized here: an effectivity function IS a Chu space (coalitions × outcomes, FOUR-valued),
 * and the linear-logic Chu DUAL — swap the axes and negate every charge — turns "which outcomes a
 * coalition can FORCE" into "which coalitions an outcome is LIABLE to" exactly the Hohfeld
 * power ↔ liability correlativity, now as a *-autonomous duality that is PROVABLY INVOLUTIVE
 * (dual∘dual = id, Lean-proved RelMath.Order.LinearLogicChu Chu/FOUR dual-involution theorem).
 *
 * So coalition power and outcome-liability are two readings of one self-dual object — answering, in
 * the agentic-governance setting, why effectivity and answerability are not separate primitives but
 * de Morgan duals. Consumes relating's `chu` IR terms via `evaluateRunTerm`; re-derives no Chu math.
 */
import { evaluateRunTerm, chu, type ChargeValueName, type JsonValue } from "@emsenn/relating";

/** A single effectivity fact: a coalition can bring about an outcome to a FOUR degree (`potential`
 *  can ensure it, `active` cannot/is blocked, `stable` ⊤ contested, `absurd` ⊥ unknown). */
export interface Effectivity {
  readonly coalition: string;
  readonly outcome: string;
  readonly force: ChargeValueName;
}

/** A coalition effectivity function as a Chu space over FOUR: coalitions (points) × outcomes (states),
 *  with a FOUR-valued effectivity matrix. */
export interface EffectivitySpace {
  readonly kind: "socializing.effectivity";
  readonly coalitions: readonly string[];
  readonly outcomes: readonly string[];
  readonly effectivity: readonly Effectivity[];
}

interface ChuSpace {
  readonly pts: readonly string[];
  readonly sts: readonly string[];
  readonly r: readonly { readonly pt: string; readonly st: string; readonly charge: ChargeValueName }[];
}

const toChu = (space: EffectivitySpace): JsonValue => ({
  pts: [...space.coalitions],
  sts: [...space.outcomes],
  r: space.effectivity.map((e) => ({ pt: e.coalition, st: e.outcome, charge: e.force })),
}) as unknown as JsonValue;

const fromChu = (chuSpace: ChuSpace): EffectivitySpace => Object.freeze({
  kind: "socializing.effectivity" as const,
  coalitions: Object.freeze([...chuSpace.pts]),
  outcomes: Object.freeze([...chuSpace.sts]),
  effectivity: Object.freeze(chuSpace.r.map((entry) => Object.freeze({ coalition: entry.pt, outcome: entry.st, force: entry.charge }))),
});

/** Construct a coalition effectivity space (a FOUR-valued Chu space). Effectivity entries not listed
 *  default to ⊥ (unknown) at lookup. */
export function effectivitySpace(
  coalitions: readonly string[],
  outcomes: readonly string[],
  effectivity: readonly Effectivity[],
): EffectivitySpace {
  return Object.freeze({
    kind: "socializing.effectivity" as const,
    coalitions: Object.freeze([...coalitions]),
    outcomes: Object.freeze([...outcomes]),
    effectivity: Object.freeze(effectivity.map((e) => Object.freeze({ ...e }))),
  });
}

/** The degree to which a coalition can FORCE an outcome — the Chu matrix lookup (the [C]φ effectivity). */
export function canForce(space: EffectivitySpace, coalition: string, outcome: string): ChargeValueName {
  return evaluateRunTerm(chu.lookup, { space: toChu(space), pt: coalition, st: outcome } as unknown as JsonValue) as unknown as ChargeValueName;
}

/**
 * effectivityDual — the LINEAR-LOGIC DUAL of an effectivity space: swap coalitions ↔ outcomes and
 * negate every charge. This is the LIABILITY reading: where the primal says "coalition C can force
 * outcome o", the dual says "outcome o is liable to coalition C" (the Hohfeld power ↔ liability swap,
 * as a Chu duality). The returned space's `coalitions` field carries the original outcomes (the dual's
 * points) and vice versa.
 */
export function effectivityDual(space: EffectivitySpace): EffectivitySpace {
  return fromChu(evaluateRunTerm(chu.dual, toChu(space)) as unknown as ChuSpace);
}

/**
 * effectivityIsInvolutive — verify the power/liability duality is an INVOLUTION: dualizing twice
 * returns the original effectivity space (RelMath.Order.LinearLogicChu's Chu/FOUR dual-involution
 * theorem). Effectivity and liability are genuinely two faces of ONE self-dual object, not independent
 * primitives — the formal warrant for treating a coalition's power and the governed party's
 * answerability as de Morgan duals.
 */
export function effectivityIsInvolutive(space: EffectivitySpace): boolean {
  return evaluateRunTerm(chu.dualInvolution, toChu(space)) as unknown as boolean;
}
