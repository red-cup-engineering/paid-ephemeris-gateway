/**
 * @emsenn/propaganda-topology — public API surface.
 *
 * Propaganda (Jowett & O'Donnell) as a carrier on the content site:
 * a PropagandaObject is content + a declared telos + an append-only trace
 * of witnessed effects. `declareTelos` makes the intent first-class and
 * auditable; `witnessEffect` extends the trace (time only accumulates);
 * `furtherance` judges whether the witnessed response moves toward the
 * telos — a charge with evidence-for and evidence-against, never a
 * boolean. `effectsAsDemand` closes the demand loop: witnessed views fold
 * into the demand charge that creates the next assignment.
 */

// ---------- terms and predicates ----------
export { telosTerm, declaresTelosPredicate, furthersPredicate } from "./propaganda-topology.mjs";

// ---------- the declared telos ----------
export { declareTelos, telosDeclarationUtterance } from "./propaganda-topology.mjs";
export type { TelosCarrier, TelosInput } from "./propaganda-topology.mjs";

// ---------- the propaganda object and its effect trace ----------
export { propagandaObject, witnessEffect, effectWitness } from "./propaganda-topology.mjs";
export type {
  PropagandaObjectCarrier,
  EffectWitness, EffectWitnessInput, WitnessEffectInput,
  ContentObject, AudienceCoordinate, DemandChargeCarrier, UtteranceCarrier,
} from "./propaganda-topology.mjs";

// ---------- the furtherance judgment ----------
export { furtherance, effectsAsDemand } from "./furtherance.mjs";
export type { FurtheranceJudgment, ChargeCarrier, ChargeValueName } from "./furtherance.mjs";
