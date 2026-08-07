/**
 * @emsenn/communicating — communicating admitted through @emsenn/relating.
 *
 * The package root is the universal admission surface and the language-neutral
 * machinery: parsing, understanding, grammatical judgment, codecs, geometry, the
 * language algebra, signifying, grounding, illocuting, messaging, and the
 * `actions(bundle)` cocone factory. Every morphism that reads a language is
 * parameterized over a `CompiledBundle`; this package injects no bundle of its
 * own. Concrete languages — their bundles, realization, and prose conformance —
 * live in `@emsenn/communicating-in-<language>` packages downstream. The root
 * deliberately does not re-export subpaths as a namespace bag.
 */

import {
  admitCommunication,
  type CommunicatingCarrier,
  type CommunicationClaim,
  type CommunicationToken,
} from "./speaking/listening/parsing/index.mjs";

export type {
  CommunicatingCarrier,
  CommunicationBoundaryDocument,
  CommunicationClaim,
  CommunicationToken,
  ArticulateResult,
  ParseResult,
} from "./speaking/listening/parsing/index.mjs";

export { actions } from "./communicate/actions.mjs";

export {
  projectReading,
  read,
  settle,
} from "./holography/index.mjs";
export type { Reading } from "./holography/index.mjs";

export {
  advanceSemiosis,
  semiosphere,
  signRelation,
  translateAcrossSemiosphereBoundary,
} from "./speaking/signifying/index.mjs";
export type {
  SemiosisStepCarrier,
  SemiosphereBoundaryTranslation,
  SemiosphereCarrier,
  SignRelationCarrier,
} from "./speaking/signifying/index.mjs";

export {
  accommodateCommonGround,
  assertIntoCommonGround,
  challengeCommonGround,
  commonGround,
  commonGroundProposition,
} from "./speaking/listening/grounding/index.mjs";
export type {
  CommonGroundBasis,
  CommonGroundCarrier,
  CommonGroundProposition,
  CommonGroundUpdate,
} from "./speaking/listening/grounding/index.mjs";

export {
  illocute,
  locute,
  performSpeechAct,
  perlocute,
  speechAct,
} from "./speaking/illocuting/index.mjs";
export type {
  IllocutionaryAct,
  IllocutionaryForce,
  LocutionaryAct,
  PerlocutionaryAct,
  SpeechActCarrier,
} from "./speaking/illocuting/index.mjs";

export {
  admitCommunication,
  articulateCommunication,
  carrierOfUtterance,
  communicationDocument,
  communicationMark,
  isMark,
  parseCommunication,
} from "./speaking/listening/parsing/index.mjs";

export {
  chargeStatus,
  conjugate,
  fuse,
  implies,
  indefiniteArticle,
  lemma,
  load,
  pluralize,
} from "./speaking/listening/algebra/index.mjs";
export type {
  BundleAttachment,
  BundleLexicon,
  BundleMeta,
  BundleMorphology,
  BundleReference,
  BundleSegmentation,
  ChargeStatus,
  CompiledBundle,
  PronounFeatures,
  RawBundle,
  SuffixRule,
} from "./speaking/listening/algebra/index.mjs";

export {
  linkEntity,
  logicalForm,
  polarity,
  presuppositions,
  resolveReferences,
  roles,
  scope,
  temporal,
} from "./speaking/listening/understanding/index.mjs";
export type {
  AspectValue,
  EvidentialValue,
  LinkResult,
  LogicalFormNode,
  LogicalFormReading,
  LogicalFormResult,
  PolarityFrame,
  Presupposition,
  PresuppositionTrigger,
  Quantifier,
  ReferenceResolution,
  ReferenceResult,
  ScopeReading,
  ScopeResult,
  SemanticFrame,
  TemporalFrame,
  TenseValue,
  TriggerKind,
} from "./speaking/listening/understanding/index.mjs";

export { render, renderArcs } from "./speaking/listening/codecs/index.mjs";
export { similarity, similarPairsFrom } from "./speaking/listening/geometry/index.mjs";
export type { SimilarPair } from "./speaking/listening/geometry/index.mjs";
export { grammaticality } from "./speaking/listening/judging/grammaticality/index.mjs";
export type {
  GrammaticalityResult,
  GrammaticalityViolation,
} from "./speaking/listening/judging/grammaticality/index.mjs";

export {
  channelBetween,
  listener,
  openChannel,
  receiveMessage,
  sendMessage,
  speaker,
  withinCapacity,
  messageChargeName,
} from "./messaging/index.mjs";
export type {
  ChannelCarrier,
  ListenerCarrier,
  MessageCarrier,
  MessageStatus,
  SpeakerCarrier,
  UptakeCarrier,
} from "./messaging/index.mjs";

export type CommunicationAction = "communicating.admit";

export interface CommunicationAdmission {
  readonly action: CommunicationAction;
  readonly carrier: CommunicatingCarrier;
}

/**
 * Admit a communicating act into the relating substrate.
 *
 * Domain: `communicating.admit x token x claim?`, where boundary strings are
 * decoded documents and Mark inputs are already admitted relating carriers.
 * Codomain: a communicating carrier whose utterance descends to Mark/Utterance.
 * Law: all communication normalizes through `Mark -> Utterance -> articulate`;
 * no text span, parse result, or grammatical reading is primitive at the root.
 */
export function communicate(
  action: CommunicationAction,
  token: CommunicationToken,
  claim?: CommunicationClaim,
): CommunicationAdmission {
  if (action !== "communicating.admit") {
    throw new TypeError(`communicate: unsupported action ${JSON.stringify(action)}`);
  }
  return Object.freeze({
    action,
    carrier: admitCommunication(token, claim),
  });
}
