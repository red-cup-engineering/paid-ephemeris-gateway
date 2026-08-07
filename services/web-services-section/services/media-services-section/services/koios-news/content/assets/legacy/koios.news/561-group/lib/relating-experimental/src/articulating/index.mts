/**
 * articulating — the base object surface of the category of relating.
 *
 * A Mark is opaque; a Token and Claim carry Marks; an Utterance pairs them; and
 * `articulate` opens the aperiodic articulation category at its potential cell.
 * Every public morphism downstream normalizes back through this surface.
 */
export {
  Mark,
  Token,
  Claim,
  mark,
  token,
  claim,
  utterance,
  articulate,
  tokenIdentity,
  claimIdentity,
  isArticulationCell,
} from "./utterance.mjs";
export type {
  UtteranceCarrier,
  TokenArticulationSlot,
  ClaimArticulationSlot,
  AperiodicArticulationPairing,
  AperiodicArticulationCell,
  PotentialAperiodicArticulationCell,
  ArticulationCell,
  MarkCoincidenceWitness,
  MarkCoincidenceObstruction,
  TokenIdentityJudgment,
  ClaimIdentityJudgment,
} from "./utterance.mjs";
export { coincides } from "./utterance.mjs";

export * as predicating from "./predicating/index.mjs";
