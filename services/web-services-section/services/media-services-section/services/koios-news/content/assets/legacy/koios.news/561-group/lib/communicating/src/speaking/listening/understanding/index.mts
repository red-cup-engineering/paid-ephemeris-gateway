/**
 * @emsenn/communicating/speaking/listening/understanding — semantic readings of language.
 *
 * What a settled parse *means*: semantic frames (roles, polarity, scope, tense,
 * presupposition, logical form) and discourse structure (entity linking,
 * reference resolution). Everything here reads parsing's ParseResult and
 * produces measures and structures over it; it never re-settles the parse.
 */


export {
  roles, polarity, scope, temporal, presuppositions, logicalForm,
} from "./semantics/index.mjs";
export type {
  SemanticFrame,
  PolarityFrame,
  ScopeResult, Quantifier, ScopeReading,
  TemporalFrame, TenseValue, AspectValue, EvidentialValue,
  Presupposition, PresuppositionTrigger, TriggerKind,
  LogicalFormResult, LogicalFormReading, LogicalFormNode,
} from "./semantics/index.mjs";


export { linkEntity } from "./linking.mjs";
export { resolveReferences } from "./referring.mjs";


export type {
  LinkResult,
  ReferenceResolution, ReferenceResult,
} from "./types.mjs";
