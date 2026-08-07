/**
 * Interaction — the central morphism of ludics, realized as knowledge-join.
 *
 * Theorem (corpus, "interaction is the knowledge join of dual valuations"):
 * two dual designs $\mathfrak{D}, \mathfrak{E}$ realize as valuations on the
 * same locus tree with opposite polarities, and the interaction
 * $\mathfrak{D} \perp \mathfrak{E}$ realizes as the knowledge join
 * $v_\mathfrak{D} \sqcup_k v_\mathfrak{E}$ at every shared locus.  Where both
 * commit opposite polarities the join is $t \sqcup_k f = \top$ (`stable`): the
 * meeting point.  The model is *paraconsistent* — $\top$ is designated, so the
 * interaction closes *against* a $\top$ rather than aborting on it.
 *
 * This module computes the join (the interaction normal form) and reports the
 * meeting loci.  It deliberately does NOT decide convergence: convergence is
 * "the joined valuation is a fixed point of the closure operator $\mathrm{cl}$"
 * (Knaster-Tarski), which belongs to `@emsenn/game-topology`.  Here we give the
 * raw morphism; settling is downstream.
 */
import {
  type ChargeValue,
  chargeValue,
  joinKnowledgeValue,
  sameChargeValue,
} from "@emsenn/relating";
import { type Design, type DesignAct, design, designAct, designCharge, supportKeys } from "../ludicizing/design.mjs";
import { type Locus, locusFromKey } from "../ludicizing/locus.mjs";

const sharedAndUnionKeys = (d1: Design, d2: Design): { union: readonly string[]; shared: readonly string[] } => {
  const keys1 = new Set(supportKeys(d1));
  const keys2 = new Set(supportKeys(d2));
  const union = [...new Set([...keys1, ...keys2])].sort();
  const shared = union.filter((k) => keys1.has(k) && keys2.has(k));
  return { union: Object.freeze(union), shared: Object.freeze(shared) };
};

/**
 * The interaction normal form: the pointwise knowledge-join of the two designs.
 * `interact(d1, d2)` is itself a design (a charge valuation) — the join is an
 * operation of the meme apex, reused verbatim.
 */
export function interact(d1: Design, d2: Design): Design {
  const { union } = sharedAndUnionKeys(d1, d2);
  const labelling = new Map<string, ChargeValue>();
  for (const key of union) {
    const xi = locusFromKey(key);
    labelling.set(key, joinKnowledgeValue(designCharge(d1, xi), designCharge(d2, xi)));
  }
  return design(labelling);
}

export interface MeetingPoint {
  readonly kind: "game.interaction.meeting";
  readonly locus: Locus;
  readonly left: DesignAct;
  readonly right: DesignAct;
  readonly joined: ChargeValue;
  /** True when both designs commit a polarity here and they collide into $\top$ (`stable`). */
  readonly daimonized: boolean;
}

export interface InteractionReport {
  readonly kind: "game.interaction.report";
  readonly normalForm: Design;
  readonly meetings: readonly MeetingPoint[];
  /** Loci where the two designs collide into $\top$ — the give-up points of the play. */
  readonly daimonLoci: readonly Locus[];
}

const stable = (): ChargeValue => chargeValue("stable");

/** Report the per-locus meeting of two dual designs: their acts, the join, and the $\top$-collisions. */
export function interactionReport(d1: Design, d2: Design): InteractionReport {
  const normalForm = interact(d1, d2);
  const { shared } = sharedAndUnionKeys(d1, d2);
  const meetings: MeetingPoint[] = [];
  const daimonLoci: Locus[] = [];
  for (const key of shared) {
    const xi = locusFromKey(key);
    const joined = joinKnowledgeValue(designCharge(d1, xi), designCharge(d2, xi));
    const daimonized = sameChargeValue(joined, stable());
    meetings.push(Object.freeze({
      kind: "game.interaction.meeting" as const,
      locus: xi,
      left: designAct(d1, xi),
      right: designAct(d2, xi),
      joined,
      daimonized,
    }));
    if (daimonized) daimonLoci.push(xi);
  }
  return Object.freeze({
    kind: "game.interaction.report" as const,
    normalForm,
    meetings: Object.freeze(meetings),
    daimonLoci: Object.freeze(daimonLoci),
  });
}

/** Whether two designs meet at all — share at least one committed locus. */
export function meets(d1: Design, d2: Design): boolean {
  return sharedAndUnionKeys(d1, d2).shared.length > 0;
}
