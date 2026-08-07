// index.mts — animating's federation layer: coordination-free federation over
// append-only assertion worlds. Exposed as the `@emsenn/animating/becoming/doing/working/governing/federating/assertion-worlds`
// subpath.
//
// It is animating's cross-observer extension — assertion identity, world
// union/admission gated by source recognition, per-observer section reads,
// governance regimes, and structural bottleneck cost graphs — resting on the
// @emsenn/relating substrate (ChargeValueName) like the rest of animating.

export type {
  AdmissionRefusal,
  ContraryOptions,
  Disagreement,
  Folded,
  FoldedCell,
  FoldOptions,
  FunctionalPredicate,
  GovernanceCone,
  GovernanceContext,
  GovernanceDecision,
  Provenance,
  RecognitionInput,
  Recognizer,
  Assertion,
  AssertionTrace,
  Section,
  SectionCell,
  SectionSpace,
  SettleOptions,
  World,
  WorldInput,
} from "./types.mjs";

export { jcs } from "./json.mjs";
export { REIFIED_PREFIX, assertAssertion, dedupe, isReified, reify, relate, relateFrom, assertionId, supersede } from "./assertions.mjs";
export { allAssertions, asWorld, contentKey, emptyWorld, inertFor, logFor, subjects } from "./world.mjs";
export { admit, admitLog, provenanceOf, recognizerFrom } from "./admission.mjs";
export { federate, mergeWorlds, migrate } from "./federation.mjs";
export { CONTRARY_PREDICATE, disagreements, fold, frontier, section, sectionConeOf, sectionOf, sectionSpace, settle } from "./sections.mjs";
export {
  DEFAULT_REGIME,
  GOV_AXES,
  KNOWN_REGIME_FAMILIES,
  REGIMES,
  admitUnder,
  governAction,
  isAdmitted,
  regimeNames,
  selectRegime,
} from "./governance.mjs";
export { costGraphSummary } from "./cost-graph.mjs";
