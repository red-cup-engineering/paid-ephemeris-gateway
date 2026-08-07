







export type {
  CommunicatingCarrier, CommunicationBoundaryDocument, CommunicationClaim, CommunicationToken,
} from "./carrier.mjs";
export type {
  Tier, Span, ContainmentEdge, SequenceEdge, ArticulateResult,
  Word, Arc, Entry, SpecializationEdge, Question, ConstrainedResult,
  DescentResult,
  ChargeValue, ChargeStatus,
  ParsedWord, ParsedArc, ParsedAnswer, FoldPath, FoldTower, ParseResult,
  CohomologyObstruction, CohomologyResult,
  BundleMeta, BundleLexicon, SuffixRule, BundleMorphology,
  PronounFeatures, BundleReference, BundleAttachment, BundleSegmentation,
  RawBundle, CompiledBundle,
} from "./types.mjs";
export type { Charge } from "./types.mjs";


export {
  admitCommunication,
  carrierOfUtterance,
  communicationMark,
  communicationDocument,
  isMark,
} from "./carrier.mjs";






export { articulateCommunication } from "./articulating.mjs";


export { parse, parseCommunication } from "./parsing.mjs";







