/**
 * cognizing/morphisms/ruminate — the DIVERGENT reflexive orbit of knowing-as-comonad.
 *
 * knowing is the comonad on Meme (dev/docs/notes/2026-06-21-knowing-as-comonad-on-meme.md):
 * it works the knowledge order ≤_k, and cognizing settles a meme along that order by
 * folding the meme back onto its own predication. `reflect` is the CONVERGENT orbit —
 * the self-referential fold whose charge climbs to the ≤_k fixpoint and settles.
 * `ruminate` is its named SHADOW: the SAME self-referential fold whose charge is reset
 * to an unsettled `potential` on every pass, so the value NEVER climbs to the fixpoint
 * and the orbit NEVER converges. This is rumination as memory dynamics define it —
 * oscillation between "explanation, judgement of that explanation, ..." without
 * resolution. knowing must NAME this pathology, not hide it: ruminate is settling that
 * FAILS to settle, kept visible as the non-converging counterpart of reflect.
 */
import { action, memeCarrier, type Action } from "@emsenn/relating";
import { codomainSettlementWitnessKey } from "@emsenn/relating/running";
import { cognizerRuminate } from "../expressing.mjs";

/** ruminate — the divergent reflexive orbit: settling that FAILS to settle. */
export const ruminateAction: Action = action({
  verb: "ruminate",
  inputFormat: "json",
  outputFormat: "json",
  summary: "The divergent reflexive orbit: self-referential settling that FAILS to settle (the non-converging shadow of reflect), named not hidden — rumination as oscillation without resolution.",
  description: "Domain: a meme carrier. Codomain: a meme carrier. ruminate is the named pathology of knowing-as-comonad: the SAME self-referential fold as reflect, but its charge is reset to an unsettled witnessedPotential on every pass, so the value never climbs to the ≤_k fixpoint and the orbit never converges. The prior meme is nested as BOTH subject AND object of one cell (the oscillation turns on itself) reusing the prior predicate — explanation, judgement of that explanation, without resolution. This is settling that fails to settle, kept visible as the divergent counterpart of reflect.",
  domain: memeCarrier,
  codomainSchema: {
    $ref: memeCarrier.id,
    [codomainSettlementWitnessKey]: {
      kind: "relating.codomain.settlement-filtration",
      limitStage: true,
      nonScottLimitFiring: true,
      cofinality: "uncountable",
    },
  },
  runTerm: cognizerRuminate,
});
