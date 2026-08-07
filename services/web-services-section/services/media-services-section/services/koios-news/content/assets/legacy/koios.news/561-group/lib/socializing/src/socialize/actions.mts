/**
 * socialize/actions — socializing's operation surface, as cocone legs on the
 * @emsenn/relating `acting` boundary.
 *
 * socializing WORKS OVER the Social Field carrier: its CORE morphisms transform it (field in,
 * field out — `socialActions`), the way communicating's core morphisms transform memes. That
 * field→field shape is a description of the core, not socializing's definition — it does not gate
 * the surface: the READINGS (`socialReadings`: assertion-disagreements, aggregate-preferences) are
 * first-class operations that project the field into a derived carrier. The core is communicating's
 * full morphism set LIFTED, plus the scale-2-specific morphisms:
 *
 * The OFF-DIAGONAL morphisms (the social heart — genuinely inter-observer over the
 * observer category O):
 *   - admit — grow the observer category / the initial-object inclusion communicating ↪
 *     socializing (scale-2-native: a lone agent has no society to be admitted into);
 *   - merge — the CRDT ∨_k knowledge exchange across an edge (scale-2-native: a lone
 *     agent has no peer to merge with);
 *   - settle — the closure-driven social settling: iterate the gossip-merge to the
 *     quiescent limit v∞ across settling stages τ, recording the settling depth κ
 *     (scale-2-native: the inter-observer settling dynamics);
 *   - glue — the Mayer–Vietoris gluing of a node's replica-cover into its H⁰ global
 *     section, with the cover's δ⁰/H¹ obstruction explicit (scale-2-native: a node's
 *     covering family);
 *   - translate — the inter-observer perspective map V(α): carry one observer's memes
 *     into another's frame along a translation morphism (supersedes the stalkwise translate↑);
 *   - broadcast (speak↑), attend (listen↑) — cross-stalk linear-resource transmission;
 *   - converge (ground↑) — the consensus LIMIT lim_O V (knowledge-meet) + its H¹
 *     obstruction (over the whole graph or a given replica-cover) + the CALM flag.
 *
 * The DIAGONAL morphisms (subordinate — per-observer internal semiosis): the ten
 * WITHIN-AGENT lifts (communicate, semiose, illocute, negate, conflate, refer,
 * modalize, presuppose, quote, compose) — communicating's own actions applied stalkwise
 * by the one reusable `liftStalkwise` primitive (see ./lifted.mts). Each restricted to
 * one agent IS the communicating morphism (the diagonal embedding).
 *
 * Every communicating verb therefore has exactly one socializing realization (10
 * diagonal + broadcast/attend/converge/translate off-diagonal), plus the two
 * scale-2-native morphisms admit and merge. There is no parallel surface.
 * `induceBins(socialActions)` projects them as the manifold's package-bin transport.
 */
import { induceBins, type Action, type InducedBins } from "@emsenn/relating";

import { admitAction } from "./admit.mjs";
import { broadcastAction } from "./broadcast.mjs";
import { attendAction } from "./attend.mjs";
import { convergeAction } from "./converge.mjs";
import { mergeAction } from "./merge.mjs";
import { settleAction } from "./settle.mjs";
import { glueAction } from "./glue.mjs";
import { translateAction } from "./translate.mjs";
import { liftedActions } from "./lifted.mjs";
import { assertAction, assertionDisagreementsAction } from "./assertions.mjs";
import { aggregateAction } from "./preference.mjs";
import { governAction, decideByMarketAction } from "./govern.mjs";
import { priceActions } from "./price.mjs";
import { coordinationCurrencyAction } from "./currency.mjs";
import { institutionActions } from "./institution.mjs";
import { mobilizationActions, mobilizeAction } from "./mobilization.mjs";
import { publicsActions, publicsAction } from "./publics.mjs";
import { anomieActions, anomieAction } from "./anomie.mjs";
import { boundaryWorkActions, boundaryWorkAction } from "./boundary.mjs";
import { legitimacyActions, legitimateAction } from "./legitimacy.mjs";
export { aggregateAction } from "./preference.mjs";
export { aggregatePreferences, type CollectivePreference, type PreferencePair } from "./preference.mjs";
export { governAction, decideByMarketAction } from "./govern.mjs";
export { priceActions, priceAction, spreadH1Action, noArbitrageAction, martingaleAction } from "./price.mjs";
export { coordinationCurrencyAction, coordinationCurrency, COORDINATION_CURRENCY_ID } from "./currency.mjs";
export type {
  CoordinationCurrency,
  CoordinationCurrencyCell,
  CoordinationCurrencyCellInput,
  CoordinationCurrencyCellStatus,
  CoordinationCurrencyLens,
} from "./currency.mjs";
export { institutionActions, institutionalizeAction, recognitionAction, institutionalize, recognition } from "./institution.mjs";
export type {
  Institutionalization,
  InstitutionalizationInput,
  Recognition,
  RecognitionInput,
} from "./institution.mjs";
export { mobilizationActions, mobilizeAction, mobilize } from "./mobilization.mjs";
export type { Mobilization, MobilizationInput } from "./mobilization.mjs";
export { publicsActions, publicsAction, publics } from "./publics.mjs";
export type { Publics, PublicsInput } from "./publics.mjs";
export { anomieActions, anomieAction, anomie } from "./anomie.mjs";
export type { Anomie, AnomieInput } from "./anomie.mjs";
export { boundaryWorkActions, boundaryWorkAction, boundaryWork } from "./boundary.mjs";
export type { BoundaryWork, BoundaryWorkInput } from "./boundary.mjs";
export { legitimacyActions, legitimateAction, legitimate } from "./legitimacy.mjs";
export type { Legitimacy, LegitimacyInput } from "./legitimacy.mjs";
export {
  governance,
  decideByMarket,
  correlate,
  correlativeKind,
  JURAL_KINDS,
} from "./govern.mjs";
export type {
  Governance,
  JuralRelation,
  JuralKind,
  GovernanceDiscipline,
  MarketSettledGovernance,
  MarketDecisionCell,
  MarketConsensusProof,
} from "./govern.mjs";

export { admitAction } from "./admit.mjs";
export { broadcastAction } from "./broadcast.mjs";
export { attendAction } from "./attend.mjs";
export { convergeAction } from "./converge.mjs";
export { mergeAction } from "./merge.mjs";
export { settleAction } from "./settle.mjs";
export { settleTrajectory } from "./settle.mjs";
export { glueAction } from "./glue.mjs";
export { replicaCoverConsensus } from "./glue.mjs";
export type { ReplicaCoverConsensus, CoverOverlap } from "./glue.mjs";
export { translateAction } from "./translate.mjs";
export {
  assertAction,
  assertionDisagreementsAction,
  assertionMeme,
  admitAssertions,
  assertionDisagreements,
} from "./assertions.mjs";
export type { SocialAssertion, AssertionDisagreement } from "./assertions.mjs";
export {
  liftedActions,
  communicateLiftedAction,
  semioseLiftedAction,
  illocuteLiftedAction,
  negateLiftedAction,
  conflateLiftedAction,
  referLiftedAction,
  modalizeLiftedAction,
  presupposeLiftedAction,
  quoteLiftedAction,
  composeLiftedAction,
} from "./lifted.mjs";

/** The Social Field endomorphisms — socializing, endomorphic on the social-field
 *  carrier (field → field). Off-diagonal (the social heart): admit (grow O), merge
 *  (CRDT ∨_k), settle (the gossip-merge settling to v∞), and glue (the Mayer–Vietoris
 *  cover gluing) — all scale-2-native; translate (the inter-observer V(α)); assert
 *  (EAV assertion admission into an observer stalk); broadcast (speak↑), attend
 *  (listen↑), converge (ground↑ — the consensus limit + H¹ + CALM + regime). Diagonal
 *  (subordinate, per-observer): the ten within-agent stalkwise lifts. Nineteen verbs —
 *  every communicating verb realized, plus the four scale-2-native morphisms and assert.
 *  assertion-disagreements is NOT listed here: it reads disagreements (returns
 *  AssertionDisagreements, not a field) and is therefore not endomorphic. */
export const socialActions: readonly Action[] = Object.freeze([
  admitAction,
  mergeAction,
  settleAction,
  glueAction,
  translateAction,
  assertAction,
  broadcastAction,
  attendAction,
  convergeAction,
  ...liftedActions,
]);

/**
 * The READINGS — projections OUT of the Social Field into a derived carrier (NOT endomorphisms).
 * socializing genuinely IS a monoid of Field endomorphisms (`socialActions`, the theorem the laws
 * test checks); but the endomorphism structure is a property of that CORE generating set, not a
 * constraint that the package may ONLY expose endomorphisms. Readings (`assertion-disagreements` =
 * the derived ⊤-disagreement read; `aggregate-preferences` = the Condorcet/Arrow escape) are
 * first-class faculty operations — dispatchable like every OTHER faculty's readings (knowing's
 * bind/attract, computing's eventual-consistency, organizing's community/symmetry) — they simply
 * are not part of the endomorphism monoid.
 */
export const socialReadings: readonly Action[] = Object.freeze([
  assertionDisagreementsAction,
  aggregateAction,
  governAction,
  decideByMarketAction,
  coordinationCurrencyAction,
  ...institutionActions,
  ...mobilizationActions,
  ...publicsActions,
  ...anomieActions,
  ...boundaryWorkActions,
  ...legitimacyActions,
  ...priceActions,
]);

/** The single operation surface, named `actions` to match the ecosystem idiom: the endomorphism
 *  monoid PLUS the readings (projections out of the field). Readings are first-class dispatchable,
 *  as in every other faculty — the field→field endomorphism property is the theorem `socialActions`
 *  carries, not a gate on the dispatch surface. */
export const actions: readonly Action[] = Object.freeze([...socialActions, ...socialReadings]);

/** The package-bin transport surface the manifold mounts (induced from the full surface, so the
 *  readings dispatch too). */
export const inducedBins: InducedBins = induceBins(actions, {
  packageName: "@emsenn/socializing",
});
