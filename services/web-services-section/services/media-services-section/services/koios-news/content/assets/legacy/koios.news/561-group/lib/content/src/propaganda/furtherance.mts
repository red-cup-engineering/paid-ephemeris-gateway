/**
 * furtherance — does the witnessed effect move toward the declared telos?
 *
 * The judgment is a charge with two-sided evidence (the floor's bilattice
 * charge, evidence-for on the truth side, evidence-against on the falsity
 * side), never a boolean:
 *
 *   potential — witnessed movement aligned with the telos, none against
 *   active    — witnessed movement against the telos, none aligned
 *   stable    — movement both ways: a held contradiction, kept with receipts
 *   absurd    — no witnessed movement on the telos target at all
 *
 * Movement is computed exactly: the effect trace folds into a demand
 * charge over the telos target's term space, and each target term's
 * realized sign is compared with its intended sign.
 */
import { charge, chargeValue, mark, type ChargeCarrier, type ChargeValueName } from "@emsenn/relating";
import {
  demandAt,
  demandCharge,
  witnessDemand,
  demandEntry,
  type DemandChargeCarrier,
} from "../topology/index.mjs";
import type { EffectWitness, PropagandaObjectCarrier } from "./propaganda-topology.mjs";

export type { ChargeCarrier, ChargeValueName };

/** Fold an effect trace into a demand charge: every witnessed response is
 *  a demand entry on its term. This is the demand loop's wire — witnessed
 *  views move the demand charge that feeds the next assignment. */
export function effectsAsDemand(
  effects: readonly EffectWitness[],
  space: readonly string[] = [],
): DemandChargeCarrier {
  let folded = demandCharge(space);
  for (const witness of effects) {
    folded = witnessDemand(folded, demandEntry(witness.term, witness.magnitude, witness.evidence));
  }
  return folded;
}

const sign = (value: bigint): -1 | 0 | 1 => (value > 0n ? 1 : value < 0n ? -1 : 0);

/**
 * The furtherance verdict for a propaganda object: pairs the object with a
 * bilattice `charge` whose evidence is [witnesses-for-movement-toward-telos,
 * witnesses-against] and with the exact realized `movement` demand charge over
 * the telos target space (widened by any off-target effect terms).
 */
export interface FurtheranceJudgment {
  readonly kind: "propaganda.furtherance.judgment";
  readonly object: PropagandaObjectCarrier;
  /** The verdict: a bilattice charge whose evidence is
   *  [witnesses-for-movement-toward, witnesses-against]. */
  readonly charge: ChargeCarrier;
  /** The realized movement, exact, over the telos target space (widened by
   *  any effect terms that landed off-target — they are kept, not dropped). */
  readonly movement: DemandChargeCarrier;
}

/** Judge furtherance: for each term the telos intends to move, compare the
 *  realized movement's sign against the intended sign. Aligned witnesses
 *  are evidence-for; opposed witnesses are evidence-against; a target term
 *  nobody moved contributes nothing. The result is a value with evidence —
 *  conflict settles to `stable` and keeps its receipts. */
export function furtherance(object: PropagandaObjectCarrier): FurtheranceJudgment {
  const target = object.telos.target;
  const movement = effectsAsDemand(object.effects, target.space);

  const evidenceFor: EffectWitness[] = [];
  const evidenceAgainst: EffectWitness[] = [];
  for (const term of target.space) {
    const intended = sign(demandAt(target, [term]));
    if (intended === 0) continue;
    const realized = sign(demandAt(movement, [term]));
    if (realized === 0) continue;
    const witnesses = object.effects.filter((witness) => witness.term === term);
    if (realized === intended) evidenceFor.push(...witnesses);
    else evidenceAgainst.push(...witnesses);
  }

  const name: ChargeValueName =
    evidenceFor.length > 0 && evidenceAgainst.length > 0 ? "stable"
      : evidenceFor.length > 0 ? "potential"
        : evidenceAgainst.length > 0 ? "active"
          : "absurd";

  return Object.freeze({
    kind: "propaganda.furtherance.judgment" as const,
    object,
    charge: charge(chargeValue(name), [
      Object.freeze(evidenceFor.map((witness) => mark(witness))),
      Object.freeze(evidenceAgainst.map((witness) => mark(witness))),
    ]),
    movement,
  });
}
