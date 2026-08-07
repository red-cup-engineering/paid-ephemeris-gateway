/**
 * Shadow — the embedding of game objects into the meme apex.
 *
 * The theory-of-computing claim reads each computational paradigm as "a shadow
 * of $\mathbf{CGS}$ under the appropriate restriction."  This module makes the
 * dual fact first-class on our side: every game object is a configuration of
 * the meme apex, and its *shadow* is the meme charge it is built from.  The
 * embedding is not a lossy projection bolted on after the fact — designs ARE
 * charge valuations, polarity IS a Belnap class, interaction IS the knowledge
 * join — so the shadow maps are (almost) identities that simply forget the
 * game-theoretic vocabulary and keep the apex content.
 *
 * The naturality witness `interactionShadowCommutes` certifies the square:
 * the shadow of an interaction equals the knowledge-join of the shadows.
 */
import {
  type ChargeValue,
  joinKnowledgeValue,
  sameChargeValue,
} from "@emsenn/relating";
import { type Polarity, polarityCharge } from "../../../polarity.mjs";
import { type Design, designCharge } from "../ludicizing/design.mjs";
import { type Locus } from "../ludicizing/locus.mjs";
import { interact } from "./interaction.mjs";

/** The meme shadow of a polarity: its Belnap charge value. */
export const polarityShadow = (p: Polarity): ChargeValue => polarityCharge(p);

/** The meme shadow of a design at a locus: the charge it commits there. */
export const designShadow = (d: Design, xi: Locus): ChargeValue => designCharge(d, xi);

/** The meme shadow of an interaction at a locus: the knowledge-join of the two designs' charges. */
export const interactionShadow = (d1: Design, d2: Design, xi: Locus): ChargeValue =>
  joinKnowledgeValue(designCharge(d1, xi), designCharge(d2, xi));

export interface InteractionShadowWitness {
  readonly kind: "game.shadow.interactionCommutes:witness";
  readonly locus: Locus;
  readonly viaInteraction: ChargeValue;
  readonly viaJoin: ChargeValue;
}

export interface InteractionShadowObstruction {
  readonly kind: "game.shadow.interactionCommutes-obstruction";
  readonly locus: Locus;
  readonly viaInteraction: ChargeValue;
  readonly viaJoin: ChargeValue;
}

export type InteractionShadowJudgment = InteractionShadowWitness | InteractionShadowObstruction;

/**
 * Witness naturality: shadow(interact(d1, d2)) at $\xi$ equals
 * join(shadow(d1, $\xi$), shadow(d2, $\xi$)).  The game morphism and the apex
 * operation agree — game interaction is meme join, seen through the design
 * vocabulary.
 */
export function interactionShadowCommutes(d1: Design, d2: Design, xi: Locus): InteractionShadowJudgment {
  const viaInteraction = designShadow(interact(d1, d2), xi);
  const viaJoin = interactionShadow(d1, d2, xi);
  return sameChargeValue(viaInteraction, viaJoin)
    ? Object.freeze({ kind: "game.shadow.interactionCommutes:witness" as const, locus: xi, viaInteraction, viaJoin })
    : Object.freeze({ kind: "game.shadow.interactionCommutes-obstruction" as const, locus: xi, viaInteraction, viaJoin });
}

/**
 * A short statement of the apex relationship, carried as data so downstream
 * packages and servers can surface it.  Game sits below meme; meme is the apex.
 */
export const APEX = Object.freeze({
  kind: "game.shadow.apex" as const,
  apexPackage: "@emsenn/meme-algebra",
  thisPackage: "@emsenn/gaming/structuring/concurrent-game/with-symmetry",
  relationship: "game is a configuration of the meme apex: designs are charge valuations, polarity is a Belnap class, interaction is the knowledge join",
} as const);
