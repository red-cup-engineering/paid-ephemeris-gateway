/**
 * @emsenn/knowing/dreaming — the four forms of dreaming, one per closure regime.
 *
 * Dreaming is what knowing does at each of its four regimes — confirmed by the
 * memorystore (the dreaming-tick journal; the dream convergence/emergence functions).
 * Three regimes are inward, deterministic, network-free learning acts that
 * RECOMBINE held observations (the convergence reading Ξᵣ — mutual stabilization of
 * difference toward a shared unrealized future):
 *
 *   - strict-finite (κ<ω): compose observations chaining object → subject;
 *   - Scott-continuous (κ=ω): consolidate repeated cells by knowledge-join (ω-limit);
 *   - transfinite (ω<κ<ω₁): co-predicate pairs sharing a subject (bounded).
 *
 * The fourth regime — **aperiodic (κ≥ω₁)** — is dreaming proper: the EMERGENCE
 * reading Dᵣ, "the persistence of intention in the absence of realizable
 * constraint", where genuinely new generators enter from OUTSIDE the settled
 * fibers. That can only happen by reaching past the closure, so the aperiodic
 * enactor is an external boundary (today: the LLM in
 * @emsenn/organizing-with-llm-agents/dreaming). Aperiodic knowing IS dreaming; this
 * surface owns the structure and the inward three, and exposes `"aperiodic"` as a
 * regime its downstream enactor fills.
 */

import {
  action,
  bottom,
  claim,
  cellIdentity,
  joinKnowledge,
  jsonResource,
  mark,
  meetKnowledge,
  predicateOfClaim,
  predicationTermIdentity,
  token,
  type Action,
  type ChargeCarrier,
  type Cell,
  type JsonRecord,
  type JsonValue,
  type Mark,
  type PredicationPredicate,
  type PredicationTerm,
} from "@emsenn/relating";
import { observation as makeObservation, type Observation } from "./observation.mjs";
import { task as makeTask } from "./task.mjs";

export { task, taskCell } from "./task.mjs";
export type { Task, Term, Utterance, TaskEvidenceCarrier } from "./task.mjs";
export { observation } from "./observation.mjs";
export type { Observation } from "./observation.mjs";

/** The four closure regimes a dream settles at; `aperiodic` is filled by an external enactor. */
export type DreamRegime = "strict-finite" | "scott-continuous" | "transfinite" | "aperiodic";

/** The result of a dream: its regime, the observations it generated, and their joined charge. */
export interface DreamResult {
  readonly regime: DreamRegime;
  readonly observations: readonly Observation[];
  readonly charge: ChargeCarrier;
}

/** Whether the three finite inward regimes can derive a residue pair. */
export interface FiniteRegimeReachability {
  readonly "strict-finite": boolean;
  readonly "scott-continuous": boolean;
  readonly transfinite: boolean;
}

/** One finite-regime exclusion witness for a conjecture candidate. */
export interface StrictRegimeExclusion {
  readonly regime: Exclude<DreamRegime, "aperiodic">;
  readonly reachable: false;
  readonly because: string;
}

/** One non-convergent residue pair, with the finite-regime impossibility certificate attached. */
export interface AperiodicResiduePair {
  readonly kind: "knowing.dream.aperiodic-residue-pair";
  readonly left: Observation;
  readonly right: Observation;
  readonly finiteReachability: FiniteRegimeReachability;
  readonly strictRegimeExclusions: readonly StrictRegimeExclusion[];
}

/** The residue field: exactly the observation pairs no finite dream regime reaches. */
export interface AperiodicResidue {
  readonly kind: "knowing.dream.aperiodic-residue";
  readonly regime: "aperiodic";
  readonly observations: number;
  readonly pairs: readonly AperiodicResiduePair[];
  readonly theory: {
    readonly closure: "finite-regime-exclusion";
    readonly order: "aperiodic-non-convergence";
    readonly practice: "praxis-frontier";
  };
}

export interface FiniteDreamDiscovery {
  readonly kind: "knowing.dream.finite-discovery";
  readonly regime: Exclude<DreamRegime, "aperiodic">;
  readonly observations: readonly Observation[];
  readonly count: number;
}

export interface AperiodicDreamDiscovery {
  readonly kind: "knowing.dream.aperiodic-discovery";
  readonly regime: "aperiodic";
  readonly candidate: AperiodicConjecture;
  readonly genuinelyNew: true;
  readonly unreachableBy: readonly Exclude<DreamRegime, "aperiodic">[];
}

/** Audit ledger: finite products versus genuinely new aperiodic candidates. */
export interface AperiodicDiscoveryLedger {
  readonly kind: "knowing.dream.discovery-ledger";
  readonly regime: "aperiodic";
  readonly finite: readonly FiniteDreamDiscovery[];
  readonly aperiodic: readonly AperiodicDreamDiscovery[];
  readonly residue: AperiodicResidue;
  readonly verdict: {
    readonly genuineNovelty: "finite-regime-exclusion";
    readonly finiteProducts: number;
    readonly aperiodicCandidates: number;
    readonly allAperiodicUnreachable: boolean;
  };
  readonly theory: {
    readonly finite: "closure-products";
    readonly aperiodic: "non-convergent-residue";
    readonly discovery: "new-iff-finite-unreachable";
  };
}

export type AperiodicPraxisProbeKind =
  | "strict-chain-probe"
  | "repeat-cell-probe"
  | "shared-subject-probe";

/** A concrete candidate observation that would test whether residue can become finite-reachable. */
export interface AperiodicPraxisProbe {
  readonly kind: "knowing.dream.praxis-probe";
  readonly index: number;
  readonly regime: "aperiodic";
  readonly targetRegime: Exclude<DreamRegime, "aperiodic">;
  readonly probe: AperiodicPraxisProbeKind;
  readonly source: AperiodicResiduePair;
  readonly observation: Observation;
  readonly predictedFeedback: AperiodicPraxisFeedbackEffectKind;
  readonly rationale: string;
}

/** Intervention design: concrete probes for moving residue into finite reachability tests. */
export interface AperiodicPraxisProbeSet {
  readonly kind: "knowing.dream.praxis-probes";
  readonly regime: "aperiodic";
  readonly residue: AperiodicResidue;
  readonly probes: readonly AperiodicPraxisProbe[];
  readonly method: {
    readonly analysis: "finite-regime-exclusion";
    readonly design: "minimal-observation-probes";
    readonly feedback: "praxis-feedback-classifies-the-result";
  };
  readonly theory: {
    readonly praxis: "concrete-analysis-into-situated-action";
    readonly activeInference: "epistemic-probing";
    readonly dreaming: "test-non-convergence-without-forcing-settlement";
  };
}

export type PraxisLineage =
  | "aperiodic-order"
  | "sheaf-contextuality"
  | "autopoietic-cognition"
  | "south-american-especifismo"
  | "critical-pedagogy";

/** One action obligation produced by folding non-convergent residue back into material practice. */
export interface AperiodicPraxisIntervention {
  readonly kind: "knowing.dream.praxis-intervention";
  readonly index: number;
  readonly regime: "aperiodic";
  readonly source: AperiodicResiduePair;
  readonly lineages: readonly PraxisLineage[];
  readonly reflection: string;
  readonly action: string;
  readonly materialCheck: string;
  readonly feedback: {
    readonly observeAgain: true;
    readonly nextCarrier: "knowing.dream.aperiodic-residue";
    readonly loop: "theory-practice-theory";
  };
}

/** The praxis frontier: residue transformed into intervention obligations and feedback loops. */
export interface AperiodicPraxisFrontier {
  readonly kind: "knowing.dream.praxis-frontier";
  readonly regime: "aperiodic";
  readonly residue: AperiodicResidue;
  readonly interventions: readonly AperiodicPraxisIntervention[];
  readonly doctrine: {
    readonly analysis: "finite closure cannot settle this pair";
    readonly organization: "intervene at the material boundary";
    readonly feedback: "return action results as new observations";
  };
}

export type AperiodicPraxisFeedbackEffectKind =
  | "strict-chain-created"
  | "repeat-cell-created"
  | "shared-subject-created"
  | "persistent-residue";

/** One intervention result: did practice make a finite regime newly able to reach the pair? */
export interface AperiodicPraxisFeedbackEffect {
  readonly kind: "knowing.dream.praxis-feedback-effect";
  readonly index: number;
  readonly regime: "aperiodic";
  readonly source: AperiodicResiduePair;
  readonly effect: AperiodicPraxisFeedbackEffectKind;
  readonly finiteReachability: FiniteRegimeReachability;
  readonly reachableBy: readonly Exclude<DreamRegime, "aperiodic">[];
  readonly interpretation: string;
}

/** Theory-practice-theory feedback: post-intervention observations folded back into residue. */
export interface AperiodicPraxisFeedback {
  readonly kind: "knowing.dream.praxis-feedback";
  readonly regime: "aperiodic";
  readonly before: AperiodicResidue;
  readonly after: AperiodicResidue;
  readonly effects: readonly AperiodicPraxisFeedbackEffect[];
  readonly loop: {
    readonly theory: "finite-regime-exclusion";
    readonly practice: "situated-intervention";
    readonly return: "reobserve-and-reclassify";
  };
}

export type AperiodicHologramPhase = "empty" | "local" | "motile" | "persistent";

/** One local spatiotemporal projection of the aperiodic residue field. */
export interface AperiodicHologramProjection {
  readonly kind: "knowing.dream.aperiodic-hologram-projection";
  readonly index: number;
  readonly regime: "aperiodic";
  readonly window: {
    readonly start: number;
    readonly end: number;
    readonly observations: number;
    readonly observers: number;
  };
  readonly residue: AperiodicResidue;
  readonly candidates: readonly AperiodicConjecture[];
}

/** A residue pair that recurs across local windows, visible from more than one local cut. */
export interface AperiodicHologramRecurrence {
  readonly kind: "knowing.dream.aperiodic-hologram-recurrence";
  readonly regime: "aperiodic";
  readonly source: AperiodicResiduePair;
  readonly windows: readonly number[];
  readonly finiteReachability: FiniteRegimeReachability;
}

/** Spatiotemporal agentic holography: local windows carrying the non-convergent frontier. */
export interface AperiodicHologram {
  readonly kind: "knowing.dream.aperiodic-hologram";
  readonly regime: "aperiodic";
  readonly settles: false;
  readonly transport: "event-stream";
  readonly projections: readonly AperiodicHologramProjection[];
  readonly recurrences: readonly AperiodicHologramRecurrence[];
  readonly frontier: {
    readonly phase: AperiodicHologramPhase;
    readonly windows: number;
    readonly maxResiduePairs: number;
    readonly recurrentResidues: number;
  };
  readonly theory: {
    readonly spatial: "local-window-projection";
    readonly temporal: "ordered-observation-stream";
    readonly agentic: "observer-indexed-field";
    readonly holographic: "local-projection-carries-frontier";
    readonly aperiodic: "finite-regime-exclusion";
  };
}

/** A recurrent hologram residue turned into an organized praxis obligation. */
export interface AperiodicHolographicPraxisIntervention {
  readonly kind: "knowing.dream.holographic-praxis-intervention";
  readonly index: number;
  readonly regime: "aperiodic";
  readonly recurrence: AperiodicHologramRecurrence;
  readonly intervention: AperiodicPraxisIntervention;
  readonly organization: {
    readonly method: "social-insertion-through-local-windows";
    readonly target: "recurrent-non-convergent-residue";
    readonly windows: readonly number[];
  };
  readonly feedback: {
    readonly observeAgain: true;
    readonly nextCarrier: "knowing.dream.praxis-feedback";
    readonly measure: "local-window-recurrence-after-intervention";
  };
}

/** Holographic praxis: recurrent local residue becomes the organized intervention frontier. */
export interface AperiodicHolographicPraxis {
  readonly kind: "knowing.dream.holographic-praxis";
  readonly regime: "aperiodic";
  readonly hologram: AperiodicHologram;
  readonly interventions: readonly AperiodicHolographicPraxisIntervention[];
  readonly doctrine: {
    readonly analysis: "local projections reveal the frontier";
    readonly organization: "act where residue recurs across cuts";
    readonly feedback: "reobserve the windows and classify praxis feedback";
  };
  readonly theory: {
    readonly aperiodic: "non-convergent-residue";
    readonly holographic: "whole-frontier-visible-locally";
    readonly autopoietic: "structural-coupling";
    readonly southAmericanPraxis: "specific-organization-and-social-insertion";
    readonly participatoryResearch: "knowledge-through-action";
  };
}

/** One conjunctural line: analysis -> strategy -> tactics -> feedback over recurrent residue. */
export interface AperiodicConjuncturalPraxisLine {
  readonly kind: "knowing.dream.conjunctural-praxis-line";
  readonly index: number;
  readonly regime: "aperiodic";
  readonly source: AperiodicHolographicPraxisIntervention;
  readonly analysis: {
    readonly conjuncture: "recurrent-non-convergent-residue";
    readonly correlationOfForces: "finite-regimes-excluded";
    readonly windows: readonly number[];
  };
  readonly strategy: {
    readonly orientation: "social-insertion";
    readonly objective: "change-the-observation-field";
    readonly criterion: "finite-bridge-created-or-persistent-residue-certified";
  };
  readonly tactics: readonly string[];
  readonly feedback: {
    readonly nextCarrier: "knowing.dream.praxis-feedback";
    readonly after: "append-situated-observations";
    readonly question: "which finite regime became reachable, if any?";
  };
}

/** Conjunctural praxis: a strategy/program layer over holographic praxis. */
export interface AperiodicConjuncturalPraxis {
  readonly kind: "knowing.dream.conjunctural-praxis";
  readonly regime: "aperiodic";
  readonly praxis: AperiodicHolographicPraxis;
  readonly lines: readonly AperiodicConjuncturalPraxisLine[];
  readonly program: {
    readonly analysis: "concrete-analysis-of-concrete-residue";
    readonly strategy: "select-recurrent-local-windows";
    readonly tactics: "situated-probes-and-reobservation";
    readonly feedback: "participatory-action-research-cycle";
  };
  readonly theory: {
    readonly huertaGrande: "theory-as-practical-tool";
    readonly especifismo: "specific-organization-and-social-insertion";
    readonly falsBorda: "participatory-action-research";
    readonly dreaming: "aperiodic-research-that-does-not-terminate";
  };
}

/** A full PAR/theory-practice-theory cycle over the aperiodic dream frontier. */
export interface AperiodicActionResearchCycle {
  readonly kind: "knowing.dream.action-research-cycle";
  readonly regime: "aperiodic";
  readonly settles: false;
  readonly before: AperiodicConjuncturalPraxis;
  readonly feedback: AperiodicPraxisFeedback;
  readonly after: AperiodicConjuncturalPraxis;
  readonly delta: {
    readonly strictBridges: number;
    readonly scottJoins: number;
    readonly transfiniteCovers: number;
    readonly persistentResidues: number;
    readonly beforeLines: number;
    readonly afterLines: number;
  };
  readonly loop: {
    readonly reflection: "analyze-recurrent-residue";
    readonly action: "intervene-and-observe";
    readonly observation: "classify-finite-reachability";
    readonly next: "repeat";
    readonly continues: true;
  };
  readonly theory: {
    readonly falsBorda: "participatory-action-research-cycle";
    readonly huertaGrande: "analysis-strategy-tactics-feedback";
    readonly autopoietic: "structural-coupling-through-observation";
    readonly dreaming: "valuable-because-it-does-not-terminate";
  };
}

/** One emitted event from the non-terminating action-research sequence. */
export interface AperiodicActionResearchSequenceEvent {
  readonly kind: "knowing.dream.action-research-sequence-event";
  readonly index: number;
  readonly regime: "aperiodic";
  readonly cycle: AperiodicActionResearchCycle;
  readonly field: {
    readonly before: number;
    readonly after: number;
    readonly total: number;
  };
  readonly trajectory: {
    readonly settles: false;
    readonly next: "repeat";
  };
}

/** A bounded prefix of the action-research stream. */
export interface AperiodicActionResearchSequenceResult {
  readonly kind: "knowing.dream.action-research-sequence";
  readonly regime: "aperiodic";
  readonly settles: false;
  readonly transport: "event-stream";
  readonly events: readonly AperiodicActionResearchSequenceEvent[];
  readonly trajectory: {
    readonly batches: number;
    readonly emitted: number;
    readonly observations: number;
    readonly continues: true;
  };
}

export type AperiodicMetastableTrajectoryPhase =
  | "quiescent"
  | "integrated"
  | "segregated"
  | "metastable";

/** One read of a non-terminating action-research event as a metastable trajectory step. */
export interface AperiodicMetastableTrajectoryStep {
  readonly kind: "knowing.dream.metastable-trajectory-step";
  readonly index: number;
  readonly regime: "aperiodic";
  readonly source: AperiodicActionResearchSequenceEvent;
  readonly integration: number;
  readonly segregation: number;
  readonly novelty: number;
  readonly drift: number;
  readonly recommendation: "consolidate-bridge" | "organize-residue" | "probe-again";
}

/** The aperiodic stream read as productive non-stationary coordination, not convergence. */
export interface AperiodicMetastableTrajectory {
  readonly kind: "knowing.dream.metastable-trajectory";
  readonly regime: "aperiodic";
  readonly settles: false;
  readonly sequence: AperiodicActionResearchSequenceResult;
  readonly steps: readonly AperiodicMetastableTrajectoryStep[];
  readonly assessment: {
    readonly phase: AperiodicMetastableTrajectoryPhase;
    readonly integration: number;
    readonly segregation: number;
    readonly novelty: number;
    readonly drift: number;
    readonly nonstationary: boolean;
  };
  readonly next: {
    readonly carrier: "knowing.dream.frontier-agenda";
    readonly reason: string;
  };
  readonly theory: {
    readonly metastability: "integration-segregation-without-stationary-settlement";
    readonly activeInference: "epistemic-value-of-probing-uncertain-frontiers";
    readonly falsBorda: "knowledge-through-action-and-return";
    readonly huertaGrande: "theory-guides-situated-strategy";
    readonly dreaming: "aperiodic-trajectory-as-discovery-surface";
  };
}

export type AperiodicWorldMethodKind =
  | "active-inference-epistemic-probing"
  | "enactive-autopoiesis"
  | "catuskoti-paraconsistency"
  | "ibn-khaldun-asabiyyah"
  | "huerta-grande-conjunctural-praxis"
  | "second-order-cybernetics"
  | "yijing-change-pattern"
  | "polynesian-wayfinding"
  | "daoist-wuwei-minimal-action"
  | "decolonizing-methodologies"
  | "reflective-practice"
  | "kula-reciprocity";

/** One global-historical research method selected for the current aperiodic trajectory. */
export interface AperiodicWorldMethod {
  readonly kind: "knowing.dream.world-method";
  readonly index: number;
  readonly regime: "aperiodic";
  readonly method: AperiodicWorldMethodKind;
  readonly region: string;
  readonly period: string;
  readonly fits: readonly AperiodicMetastableTrajectoryPhase[];
  readonly score: number;
  readonly question: string;
  readonly intervention: string;
  readonly evidence: string;
  readonly nextCarrier: "knowing.dream.praxis-probes" | "knowing.dream.praxis-feedback" | "knowing.dream.frontier-agenda";
}

/** A global and historical repertoire for choosing how the aperiodic stream should act next. */
export interface AperiodicWorldMethodRepertoire {
  readonly kind: "knowing.dream.world-method-repertoire";
  readonly regime: "aperiodic";
  readonly settles: false;
  readonly trajectory: AperiodicMetastableTrajectory;
  readonly agenda: AperiodicFrontierAgenda;
  readonly methods: readonly AperiodicWorldMethod[];
  readonly selected: readonly AperiodicWorldMethod[];
  readonly doctrine: {
    readonly compare: "multiple-historical-inquiry-lineages";
    readonly choose: "fit-method-to-trajectory-phase";
    readonly act: "return-method-as-carrier-obligation";
    readonly repeat: true;
  };
  readonly theory: {
    readonly activeInference: "epistemic-value-probing";
    readonly enaction: "sense-making-through-structural-coupling";
    readonly catuskoti: "four-corner-paraconsistent-obstruction";
    readonly asabiyyah: "cohesion-as-collective-capacity";
    readonly cybernetics: "observer-in-the-loop";
    readonly dreaming: "world-methods-for-non-convergent-research";
  };
}

/** One selected world method turned into an observation obligation for the next cycle. */
export interface AperiodicWorldMethodIntervention {
  readonly kind: "knowing.dream.world-method-intervention";
  readonly index: number;
  readonly regime: "aperiodic";
  readonly method: AperiodicWorldMethod;
  readonly observation: Observation;
  readonly protocol: {
    readonly read: string;
    readonly act: string;
    readonly verify: string;
    readonly nextCarrier: AperiodicWorldMethod["nextCarrier"];
  };
}

/** A concrete next-batch plan produced by global-historical methods. */
export interface AperiodicWorldMethodInterventionPlan {
  readonly kind: "knowing.dream.world-method-intervention-plan";
  readonly regime: "aperiodic";
  readonly settles: false;
  readonly repertoire: AperiodicWorldMethodRepertoire;
  readonly interventions: readonly AperiodicWorldMethodIntervention[];
  readonly after: readonly Observation[];
  readonly projected: AperiodicActionResearchCycle;
  readonly loop: {
    readonly currentField: number;
    readonly nextBatch: number;
    readonly next: "run-action-research-cycle";
    readonly continues: true;
  };
  readonly theory: {
    readonly comparativeMethod: "global-historical-methods-as-operational-probes";
    readonly navigation: "wayfinding-through-non-convergent-fields";
    readonly change: "pattern-change-without-final-settlement";
    readonly action: "minimal-situated-intervention";
    readonly dreaming: "methods-become-observations";
  };
}

export type AperiodicWorldMethodFeedbackAssessment =
  | "finite-bridge-created"
  | "residue-persisted"
  | "trajectory-shifted"
  | "no-method-signal";

/** One selected method evaluated by its own generated observation against the current field. */
export interface AperiodicWorldMethodFeedbackEffect {
  readonly kind: "knowing.dream.world-method-feedback-effect";
  readonly index: number;
  readonly regime: "aperiodic";
  readonly intervention: AperiodicWorldMethodIntervention;
  readonly cycle: AperiodicActionResearchCycle;
  readonly assessment: AperiodicWorldMethodFeedbackAssessment;
  readonly scoreDelta: number;
  readonly next: "amplify" | "repeat" | "hold-open" | "retire-for-now";
}

/** Adaptive feedback for global-historical methods: which ones changed the aperiodic frontier? */
export interface AperiodicWorldMethodFeedback {
  readonly kind: "knowing.dream.world-method-feedback";
  readonly regime: "aperiodic";
  readonly settles: false;
  readonly plan: AperiodicWorldMethodInterventionPlan;
  readonly effects: readonly AperiodicWorldMethodFeedbackEffect[];
  readonly adapted: readonly AperiodicWorldMethod[];
  readonly summary: {
    readonly amplified: number;
    readonly repeated: number;
    readonly heldOpen: number;
    readonly retiredForNow: number;
  };
  readonly loop: {
    readonly nextCarrier: "knowing.dream.world-method-repertoire";
    readonly action: "adjust-method-priorities-and-repeat";
    readonly continues: true;
  };
  readonly theory: {
    readonly bayesianDesign: "rank-methods-by-information-producing-intervention";
    readonly reflectivePractice: "reflection-in-action";
    readonly decolonizingMethodology: "method-accountability-to-the-field";
    readonly reciprocity: "methods-return-value-to-the-observation-community";
    readonly dreaming: "adaptive-method-feedback-without-settlement";
  };
}

export type AperiodicWorldMethodEcologyVerdict =
  | "requisite-variety"
  | "under-varied"
  | "method-monoculture";

export interface AperiodicWorldMethodEcologyObligation {
  readonly kind: "knowing.dream.world-method-ecology-obligation";
  readonly index: number;
  readonly regime: "aperiodic";
  readonly priority: "add-variety" | "preserve-conflict" | "return-to-field";
  readonly question: string;
  readonly nextCarrier: "knowing.dream.world-method-repertoire" | "knowing.dream.world-method-feedback";
}

/** Audit whether the method ecology has enough variety for the aperiodic frontier it regulates. */
export interface AperiodicWorldMethodEcology {
  readonly kind: "knowing.dream.world-method-ecology";
  readonly regime: "aperiodic";
  readonly settles: false;
  readonly feedback: AperiodicWorldMethodFeedback;
  readonly variety: {
    readonly selectedMethods: number;
    readonly regions: number;
    readonly periods: number;
    readonly nextCarriers: number;
    readonly assessments: number;
    readonly effectiveVariety: number;
    readonly requiredVariety: number;
  };
  readonly verdict: AperiodicWorldMethodEcologyVerdict;
  readonly obligations: readonly AperiodicWorldMethodEcologyObligation[];
  readonly loop: {
    readonly nextCarrier: "knowing.dream.world-method-feedback";
    readonly action: "increase-method-variety-and-repeat";
    readonly continues: true;
  };
  readonly theory: {
    readonly requisiteVariety: "method-variety-must-match-frontier-variety";
    readonly epistemologicalPluralism: "no-single-method-governs-discovery";
    readonly strongObjectivity: "situated-standpoints-increase-reflexive-correction";
    readonly collectiveIntelligence: "heterogeneous-search-can-outperform-homogeneous-search";
    readonly dreaming: "aperiodic-method-ecology";
  };
}

/** Two distinct world methods braided into one combined intervention. */
export interface AperiodicWorldMethodBraidPair {
  readonly kind: "knowing.dream.world-method-braid-pair";
  readonly index: number;
  readonly regime: "aperiodic";
  readonly left: AperiodicWorldMethod;
  readonly right: AperiodicWorldMethod;
  readonly complementarity: {
    readonly regionDifference: boolean;
    readonly periodDifference: boolean;
    readonly carrierDifference: boolean;
    readonly score: number;
  };
  readonly question: string;
  readonly observation: Observation;
}

/** Compose diverse methods into paired interventions so the ecology acts with variety. */
export interface AperiodicWorldMethodBraid {
  readonly kind: "knowing.dream.world-method-braid";
  readonly regime: "aperiodic";
  readonly settles: false;
  readonly ecology: AperiodicWorldMethodEcology;
  readonly pairs: readonly AperiodicWorldMethodBraidPair[];
  readonly after: readonly Observation[];
  readonly projected: AperiodicActionResearchCycle;
  readonly loop: {
    readonly currentField: number;
    readonly braidedPairs: number;
    readonly next: "run-action-research-cycle";
    readonly continues: true;
  };
  readonly theory: {
    readonly requisiteVariety: "compose-response-variety";
    readonly epistemologicalPluralism: "methods-check-each-other";
    readonly standpoint: "situated-difference-as-correction";
    readonly collectiveIntelligence: "diverse-heuristics-as-search";
    readonly dreaming: "braided-methods-for-aperiodic-research";
  };
}

export type AperiodicWorldMethodConstellationRelation =
  | "braided-complementarity"
  | "historical-translation"
  | "standpoint-tension"
  | "reciprocity-obligation";

export interface AperiodicWorldMethodConstellationNode {
  readonly kind: "knowing.dream.world-method-constellation-node";
  readonly index: number;
  readonly regime: "aperiodic";
  readonly method: AperiodicWorldMethod;
}

export interface AperiodicWorldMethodConstellationEdge {
  readonly kind: "knowing.dream.world-method-constellation-edge";
  readonly index: number;
  readonly regime: "aperiodic";
  readonly relation: AperiodicWorldMethodConstellationRelation;
  readonly left: AperiodicWorldMethod;
  readonly right: AperiodicWorldMethod;
  readonly weight: number;
  readonly reason: string;
}

/** A graph read of the method ecology: how global methods relate before the next action. */
export interface AperiodicWorldMethodConstellation {
  readonly kind: "knowing.dream.world-method-constellation";
  readonly regime: "aperiodic";
  readonly settles: false;
  readonly braid: AperiodicWorldMethodBraid;
  readonly nodes: readonly AperiodicWorldMethodConstellationNode[];
  readonly edges: readonly AperiodicWorldMethodConstellationEdge[];
  readonly topology: {
    readonly components: number;
    readonly connected: boolean;
    readonly isolates: number;
    readonly braidedEdges: number;
    readonly reciprocityEdges: number;
  };
  readonly obligations: readonly AperiodicWorldMethodEcologyObligation[];
  readonly theory: {
    readonly boundaryObjects: "methods-coordinate-without-identical-meanings";
    readonly actorNetwork: "relations-between-methods-change-the-research-field";
    readonly pluriverse: "many-worlds-of-inquiry-without-single-sovereign-method";
    readonly dreaming: "constellated-method-field-for-aperiodic-research";
  };
}

export interface AperiodicWorldMethodWayfindingEvent {
  readonly kind: "knowing.dream.world-method-wayfinding-event";
  readonly index: number;
  readonly regime: "aperiodic";
  readonly edge: AperiodicWorldMethodConstellationEdge;
  readonly from: AperiodicWorldMethod;
  readonly to: AperiodicWorldMethod;
  readonly step: "short" | "long";
  readonly observation: Observation;
  readonly question: string;
}

/** A bounded aperiodic walk through the method constellation. */
export interface AperiodicWorldMethodWayfinding {
  readonly kind: "knowing.dream.world-method-wayfinding";
  readonly regime: "aperiodic";
  readonly settles: false;
  readonly transport: "event-stream";
  readonly constellation: AperiodicWorldMethodConstellation;
  readonly events: readonly AperiodicWorldMethodWayfindingEvent[];
  readonly trajectory: {
    readonly emitted: number;
    readonly visitedMethods: number;
    readonly relations: number;
    readonly continues: true;
  };
  readonly theory: {
    readonly graphWalks: "walk-record-as-graph-learning-signal";
    readonly foraging: "aperiodic-search-through-sparse-method-space";
    readonly songlines: "navigation-as-storied-relation";
    readonly ifa: "structured-interpretive-traversal";
    readonly dreaming: "wayfinding-through-method-constellation";
  };
}

export type AperiodicFrontierAgendaPriority = "consolidate" | "experiment" | "organize";

/** One next research obligation derived from a non-terminating action-research stream. */
export interface AperiodicFrontierAgendaItem {
  readonly kind: "knowing.dream.frontier-agenda-item";
  readonly index: number;
  readonly regime: "aperiodic";
  readonly source: AperiodicActionResearchSequenceEvent;
  readonly priority: AperiodicFrontierAgendaPriority;
  readonly score: number;
  readonly question: string;
  readonly next: {
    readonly carrier: "knowing.dream.action-research-cycle";
    readonly reason: string;
  };
}

/** The live agenda: what the non-terminating dream loop should pursue next. */
export interface AperiodicFrontierAgenda {
  readonly kind: "knowing.dream.frontier-agenda";
  readonly regime: "aperiodic";
  readonly sequence: AperiodicActionResearchSequenceResult;
  readonly items: readonly AperiodicFrontierAgendaItem[];
  readonly method: {
    readonly analyze: "rank-residue-by-persistence-and-reachability";
    readonly decide: "prefer-unsettled-recurrent-frontiers";
    readonly act: "feed-next-cycle";
    readonly repeat: true;
  };
  readonly theory: {
    readonly researchProgram: "progressive-problemshift";
    readonly participatoryResearch: "return-results-to-action";
    readonly especifismo: "organized-priority-from-social-insertion";
    readonly dreaming: "agenda-emerges-from-non-convergence";
  };
}

export type AperiodicResearchProgramPhase =
  | "progressive-problemshift"
  | "open-problemshift"
  | "degenerating-problemshift";

/** Audit whether the non-terminating research stream is producing progressive novelty. */
export interface AperiodicResearchProgramAudit {
  readonly kind: "knowing.dream.research-program-audit";
  readonly regime: "aperiodic";
  readonly agenda: AperiodicFrontierAgenda;
  readonly assessment: {
    readonly phase: AperiodicResearchProgramPhase;
    readonly finiteBridges: number;
    readonly persistentResidues: number;
    readonly agendaItems: number;
    readonly organize: number;
    readonly experiment: number;
    readonly consolidate: number;
  };
  readonly heuristics: {
    readonly positive: "prefer-cycles-that-produce-new-reachability-or-sharper-residue";
    readonly negative: "do-not-declare-final-settlement-from-one-finite-bridge";
    readonly next: "feed-the-agenda-back-into-action-research";
  };
  readonly theory: {
    readonly lakatos: "progressive-versus-degenerating-problemshift";
    readonly falsBorda: "participatory-return-to-the-field";
    readonly dreaming: "non-termination-with-novelty-audit";
  };
}

/** A conjecture emitted from the aperiodic residue of the dream trajectory. */
export interface AperiodicConjecture {
  readonly kind: "knowing.dream.conjecture";
  readonly index: number;
  readonly regime: "aperiodic";
  readonly maturity: "Research-grade";
  readonly trajectory: {
    readonly kind: "sturmian-golden";
    readonly step: "short" | "long";
    readonly prefix: string;
    readonly neverSettles: true;
  };
  readonly finiteReachability: FiniteRegimeReachability;
  readonly strictRegimeExclusions: readonly StrictRegimeExclusion[];
  readonly novelty: {
    readonly genuinelyNew: true;
    readonly reason: string;
  };
  readonly source: {
    readonly left: Observation;
    readonly right: Observation;
  };
  readonly conjecture: Observation;
}

/** A bounded prefix of the aperiodic dream stream. */
export interface AperiodicDreamResult {
  readonly kind: "knowing.dream.aperiodic-research";
  readonly regime: "aperiodic";
  readonly settles: false;
  readonly transport: "event-stream";
  readonly candidates: readonly AperiodicConjecture[];
  readonly residue: {
    readonly observations: number;
    readonly pairs: number;
    readonly emitted: number;
  };
}

/** Options shared by the dream regimes: where, who observes, and a generation cap. */
export interface DreamOptions {
  readonly at?: Mark;
  readonly observer?: PredicationTerm;
  readonly limit?: number;
  readonly start?: number;
}

type DreamMarkLabel =
  | "knowing"
  | "dream"
  | "observer"
  | DreamRegime
  | "strict-finite-composition"
  | "strict-finite-dream"
  | "scott-continuous-dream"
  | "co-predicate"
  | "transfinite-dream"
  | "aperiodic-residue-conjecture"
  | "aperiodic-dream"
  | "non-convergent-residue"
  | "praxis-probe"
  | "world-method"
  | "world-method-intervention"
  | "world-method-braid"
  | "world-method-wayfinding";

type DreamMarkPart = DreamMarkLabel | Mark | PredicationTerm | PredicationPredicate | Cell;

/** strict-finite (κ<ω): compose observations where one's object is the next's subject. */
export function strictFiniteDream(observations: readonly Observation[], options: DreamOptions = {}): DreamResult {
  const observer = options.observer ?? dreamTerm(["observer", "strict-finite"]);
  const at = options.at ?? dreamMark(["strict-finite"]);
  const limit = options.limit ?? 50;
  const out: Observation[] = [];
  for (const left of observations) {
    for (const right of observations) {
      if (out.length >= limit) break;
      if (!sameTerm(left.task.object, right.task.subject)) continue;
      out.push(makeObservation({
        observer,
        task: makeTask({
          subject: left.task.subject,
          predicate: dreamPredicate(["strict-finite-composition", left.task.predicate, right.task.predicate]),
          object: right.task.object,
        }),
        charge: meetKnowledge(left.charge, right.charge),
        at,
        note: dreamMark(["strict-finite-dream", left.task.cell, right.task.cell]),
      }));
    }
    if (out.length >= limit) break;
  }
  return dreamResult("strict-finite", out);
}

/** Scott-continuous (κ=ω): consolidate repeated cells by knowledge-join. */
export function scottContinuousDream(observations: readonly Observation[], options: DreamOptions = {}): DreamResult {
  const observer = options.observer ?? dreamTerm(["observer", "scott-continuous"]);
  const at = options.at ?? dreamMark(["scott-continuous"]);
  const limit = options.limit ?? 50;
  const grouped: { cell: Cell; observations: Observation[] }[] = [];
  for (const obs of observations) {
    const group = grouped.find((candidate) => sameCell(candidate.cell, obs.task.cell));
    if (group) group.observations.push(obs);
    else grouped.push({ cell: obs.task.cell, observations: [obs] });
  }
  const out: Observation[] = [];
  for (const group of grouped) {
    if (out.length >= limit) break;
    if (group.observations.length < 2) continue;
    const [first, ...rest] = group.observations;
    out.push(makeObservation({
      observer,
      task: first!.task,
      charge: rest.reduce((left, obs) => joinKnowledge(left, obs.charge), first!.charge),
      at,
      note: dreamMark(["scott-continuous-dream", group.cell]),
    }));
  }
  return dreamResult("scott-continuous", out);
}

/** transfinite (ω<κ<ω₁): co-predicate every pair sharing a subject. */
export function transfiniteDream(observations: readonly Observation[], options: DreamOptions = {}): DreamResult {
  const observer = options.observer ?? dreamTerm(["observer", "transfinite"]);
  const at = options.at ?? dreamMark(["transfinite"]);
  const limit = options.limit ?? 50;
  const bySubject: { subject: PredicationTerm; observations: Observation[] }[] = [];
  for (const obs of observations) {
    const group = bySubject.find((candidate) => sameTerm(candidate.subject, obs.task.subject));
    if (group) group.observations.push(obs);
    else bySubject.push({ subject: obs.task.subject, observations: [obs] });
  }
  const out: Observation[] = [];
  for (const group of bySubject) {
    const members = group.observations;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        if (out.length >= limit) break;
        const left = members[i]!;
        const right = members[j]!;
        out.push(makeObservation({
          observer,
          task: makeTask({
            subject: group.subject,
            predicate: dreamPredicate(["co-predicate", left.task.predicate, right.task.predicate]),
          }),
          charge: meetKnowledge(left.charge, right.charge),
          at,
          note: dreamMark(["transfinite-dream", left.task.cell, right.task.cell]),
        }));
      }
      if (out.length >= limit) break;
    }
    if (out.length >= limit) break;
  }
  return dreamResult("transfinite", out);
}

/** Dispatch the three synchronous inward regimes over a single observation set. */
export function dreaming(
  input: { readonly observations?: readonly Observation[]; readonly regime?: Exclude<DreamRegime, "aperiodic"> } = {},
  options: DreamOptions = {},
): DreamResult {
  const regime = input.regime ?? "strict-finite";
  const observations = input.observations ?? [];
  if (regime === "scott-continuous") return scottContinuousDream(observations, options);
  if (regime === "transfinite") return transfiniteDream(observations, options);
  return strictFiniteDream(observations, options);
}

/** Aperiodic (kappa >= omega_1): stream conjectures from residue no finite regime derives. */
export function* aperiodicDreamConjectures(
  observations: readonly Observation[],
  options: DreamOptions = {},
): Generator<AperiodicConjecture> {
  const residue = aperiodicResiduePairs(observations);
  if (residue.length === 0) return;
  const observer = options.observer ?? dreamTerm(["observer", "aperiodic"]);
  const at = options.at ?? dreamMark(["aperiodic"]);
  let index = options.start ?? 0;
  while (true) {
    const step = sturmianStep(index);
    const pair = residue[(index + (step === "long" ? 1 : 0)) % residue.length]!;
    const [left, right] = step === "long" ? [pair.right, pair.left] : [pair.left, pair.right];
    const conjecture = makeObservation({
      observer,
      task: makeTask({
        subject: left.task.subject,
        predicate: dreamPredicate(["aperiodic-residue-conjecture", left.task.predicate, right.task.predicate, mark(`step:${index}`)]),
        object: right.task.object,
      }),
      charge: meetKnowledge(left.charge, right.charge),
      at,
      note: dreamMark(["non-convergent-residue", left.task.cell, right.task.cell, mark(`sturmian:${sturmianPrefix(index + 1)}`)]),
    });
    yield Object.freeze({
      kind: "knowing.dream.conjecture" as const,
      index,
      regime: "aperiodic" as const,
      maturity: "Research-grade" as const,
      trajectory: Object.freeze({
        kind: "sturmian-golden" as const,
        step,
        prefix: sturmianPrefix(index + 1),
        neverSettles: true as const,
      }),
      finiteReachability: pair.finiteReachability,
      strictRegimeExclusions: pair.strictRegimeExclusions,
      novelty: Object.freeze({
        genuinelyNew: true as const,
        reason: "The source observations are in the non-convergent residue: no object-to-subject chain, repeated cell, or shared-subject co-predicate lets the finite dream regimes derive this conjecture.",
      }),
      source: Object.freeze({ left, right }),
      conjecture,
    });
    index += 1;
  }
}

/** Return a bounded prefix of the aperiodic dream stream for request/response callers. */
export function aperiodicDream(
  input: { readonly observations?: readonly Observation[]; readonly limit?: number } = {},
  options: DreamOptions = {},
): AperiodicDreamResult {
  const observations = input.observations ?? [];
  const limit = finiteLimit(input.limit ?? options.limit ?? 8);
  const candidates: AperiodicConjecture[] = [];
  const stream = aperiodicDreamConjectures(observations, options);
  for (const candidate of stream) {
    if (candidates.length >= limit) break;
    candidates.push(candidate);
  }
  return Object.freeze({
    kind: "knowing.dream.aperiodic-research" as const,
    regime: "aperiodic" as const,
    settles: false as const,
    transport: "event-stream" as const,
    candidates: Object.freeze(candidates),
    residue: Object.freeze({
      observations: observations.length,
      pairs: aperiodicResidue(observations).pairs.length,
      emitted: candidates.length,
    }),
  });
}

/** Extract the non-convergent residue as a reusable carrier. */
export function aperiodicResidue(observations: readonly Observation[]): AperiodicResidue {
  return Object.freeze({
    kind: "knowing.dream.aperiodic-residue" as const,
    regime: "aperiodic" as const,
    observations: observations.length,
    pairs: aperiodicResiduePairs(observations),
    theory: Object.freeze({
      closure: "finite-regime-exclusion" as const,
      order: "aperiodic-non-convergence" as const,
      practice: "praxis-frontier" as const,
    }),
  });
}

/** Compare finite closure products with genuinely new aperiodic candidates. */
export function aperiodicDiscoveryLedger(
  input: { readonly observations?: readonly Observation[]; readonly limit?: number; readonly start?: number } = {},
): AperiodicDiscoveryLedger {
  const observations = input.observations ?? [];
  const limit = finiteLimit(input.limit ?? 8);
  const finite = Object.freeze([
    finiteDiscovery("strict-finite", strictFiniteDream(observations)),
    finiteDiscovery("scott-continuous", scottContinuousDream(observations)),
    finiteDiscovery("transfinite", transfiniteDream(observations)),
  ]);
  const candidates = aperiodicDream({ observations, limit }, { ...(input.start === undefined ? {} : { start: input.start }) }).candidates;
  const aperiodic = Object.freeze(candidates.map((candidate) => aperiodicDiscovery(candidate)));
  return Object.freeze({
    kind: "knowing.dream.discovery-ledger" as const,
    regime: "aperiodic" as const,
    finite,
    aperiodic,
    residue: aperiodicResidue(observations),
    verdict: Object.freeze({
      genuineNovelty: "finite-regime-exclusion" as const,
      finiteProducts: finite.reduce((sum, discovery) => sum + discovery.count, 0),
      aperiodicCandidates: aperiodic.length,
      allAperiodicUnreachable: aperiodic.every((discovery) => discovery.unreachableBy.length === 3),
    }),
    theory: Object.freeze({
      finite: "closure-products" as const,
      aperiodic: "non-convergent-residue" as const,
      discovery: "new-iff-finite-unreachable" as const,
    }),
  });
}

/** Design concrete probes that can test whether residue becomes finite-reachable after action. */
export function aperiodicPraxisProbes(
  input: { readonly observations?: readonly Observation[]; readonly limit?: number } = {},
): AperiodicPraxisProbeSet {
  const residue = aperiodicResidue(input.observations ?? []);
  const pairLimit = finiteLimit(input.limit ?? residue.pairs.length);
  const probes = residue.pairs
    .slice(0, pairLimit)
    .flatMap((pair, pairIndex) => praxisProbesForPair(pair, pairIndex));
  return Object.freeze({
    kind: "knowing.dream.praxis-probes" as const,
    regime: "aperiodic" as const,
    residue,
    probes: Object.freeze(probes),
    method: Object.freeze({
      analysis: "finite-regime-exclusion" as const,
      design: "minimal-observation-probes" as const,
      feedback: "praxis-feedback-classifies-the-result" as const,
    }),
    theory: Object.freeze({
      praxis: "concrete-analysis-into-situated-action" as const,
      activeInference: "epistemic-probing" as const,
      dreaming: "test-non-convergence-without-forcing-settlement" as const,
    }),
  });
}

/** Fold residue into praxis: the non-settling frontier becomes material intervention obligations. */
export function aperiodicPraxisFrontier(
  input: { readonly observations?: readonly Observation[]; readonly limit?: number } = {},
): AperiodicPraxisFrontier {
  const residue = aperiodicResidue(input.observations ?? []);
  const limit = finiteLimit(input.limit ?? residue.pairs.length);
  return Object.freeze({
    kind: "knowing.dream.praxis-frontier" as const,
    regime: "aperiodic" as const,
    residue,
    interventions: Object.freeze(residue.pairs.slice(0, limit).map((pair, index) => praxisIntervention(pair, index))),
    doctrine: Object.freeze({
      analysis: "finite closure cannot settle this pair" as const,
      organization: "intervene at the material boundary" as const,
      feedback: "return action results as new observations" as const,
    }),
  });
}

/** Fold intervention results back into dreaming and classify whether finite regimes can now reach. */
export function aperiodicPraxisFeedback(
  input: { readonly before?: readonly Observation[]; readonly after?: readonly Observation[]; readonly limit?: number } = {},
): AperiodicPraxisFeedback {
  const beforeObservations = input.before ?? [];
  const afterObservations = input.after ?? [];
  const before = aperiodicResidue(beforeObservations);
  const after = aperiodicResidue(Object.freeze([...beforeObservations, ...afterObservations]));
  const limit = finiteLimit(input.limit ?? before.pairs.length);
  return Object.freeze({
    kind: "knowing.dream.praxis-feedback" as const,
    regime: "aperiodic" as const,
    before,
    after,
    effects: Object.freeze(before.pairs.slice(0, limit).map((pair, index) => praxisFeedbackEffect(pair, index, afterObservations))),
    loop: Object.freeze({
      theory: "finite-regime-exclusion" as const,
      practice: "situated-intervention" as const,
      return: "reobserve-and-reclassify" as const,
    }),
  });
}

/** Project the aperiodic residue through local observation windows as a spatiotemporal hologram. */
export function aperiodicHologram(
  input: {
    readonly observations?: readonly Observation[];
    readonly window?: number;
    readonly stride?: number;
    readonly limit?: number;
    readonly candidatesPerWindow?: number;
  } = {},
): AperiodicHologram {
  const observations = input.observations ?? [];
  const windowSize = positiveInteger(input.window ?? Math.max(2, observations.length || 2), "aperiodic-hologram: window");
  const stride = positiveInteger(input.stride ?? 1, "aperiodic-hologram: stride");
  const candidatesPerWindow = finiteLimit(input.candidatesPerWindow ?? 1);
  const limit = finiteLimit(input.limit ?? observations.length);
  const projections: AperiodicHologramProjection[] = [];
  for (let start = 0; start < observations.length && projections.length < limit; start += stride) {
    const end = Math.min(observations.length, start + windowSize);
    const segment = observations.slice(start, end);
    if (segment.length < 2) continue;
    const residue = aperiodicResidue(segment);
    projections.push(Object.freeze({
      kind: "knowing.dream.aperiodic-hologram-projection" as const,
      index: projections.length,
      regime: "aperiodic" as const,
      window: Object.freeze({
        start,
        end,
        observations: segment.length,
        observers: observerCount(segment),
      }),
      residue,
      candidates: aperiodicDream({ observations: segment, limit: candidatesPerWindow }).candidates,
    }));
  }
  const recurrences = hologramRecurrences(projections);
  return Object.freeze({
    kind: "knowing.dream.aperiodic-hologram" as const,
    regime: "aperiodic" as const,
    settles: false as const,
    transport: "event-stream" as const,
    projections: Object.freeze(projections),
    recurrences,
    frontier: Object.freeze({
      phase: hologramPhase(projections, recurrences),
      windows: projections.length,
      maxResiduePairs: projections.reduce((max, projection) => Math.max(max, projection.residue.pairs.length), 0),
      recurrentResidues: recurrences.length,
    }),
    theory: Object.freeze({
      spatial: "local-window-projection" as const,
      temporal: "ordered-observation-stream" as const,
      agentic: "observer-indexed-field" as const,
      holographic: "local-projection-carries-frontier" as const,
      aperiodic: "finite-regime-exclusion" as const,
    }),
  });
}

/** Turn recurrent local residue into organized praxis obligations. */
export function aperiodicHolographicPraxis(
  input: {
    readonly observations?: readonly Observation[];
    readonly window?: number;
    readonly stride?: number;
    readonly limit?: number;
    readonly candidatesPerWindow?: number;
  } = {},
): AperiodicHolographicPraxis {
  const hologram = aperiodicHologram(input);
  const limit = finiteLimit(input.limit ?? hologram.recurrences.length);
  return Object.freeze({
    kind: "knowing.dream.holographic-praxis" as const,
    regime: "aperiodic" as const,
    hologram,
    interventions: Object.freeze(hologram.recurrences.slice(0, limit).map((recurrence, index) => holographicPraxisIntervention(recurrence, index))),
    doctrine: Object.freeze({
      analysis: "local projections reveal the frontier" as const,
      organization: "act where residue recurs across cuts" as const,
      feedback: "reobserve the windows and classify praxis feedback" as const,
    }),
    theory: Object.freeze({
      aperiodic: "non-convergent-residue" as const,
      holographic: "whole-frontier-visible-locally" as const,
      autopoietic: "structural-coupling" as const,
      southAmericanPraxis: "specific-organization-and-social-insertion" as const,
      participatoryResearch: "knowledge-through-action" as const,
    }),
  });
}

/** Build a conjunctural strategy/program from holographic praxis. */
export function aperiodicConjuncturalPraxis(
  input: {
    readonly observations?: readonly Observation[];
    readonly window?: number;
    readonly stride?: number;
    readonly limit?: number;
    readonly candidatesPerWindow?: number;
  } = {},
): AperiodicConjuncturalPraxis {
  const praxis = aperiodicHolographicPraxis(input);
  return Object.freeze({
    kind: "knowing.dream.conjunctural-praxis" as const,
    regime: "aperiodic" as const,
    praxis,
    lines: Object.freeze(praxis.interventions.map((intervention, index) => conjuncturalPraxisLine(intervention, index))),
    program: Object.freeze({
      analysis: "concrete-analysis-of-concrete-residue" as const,
      strategy: "select-recurrent-local-windows" as const,
      tactics: "situated-probes-and-reobservation" as const,
      feedback: "participatory-action-research-cycle" as const,
    }),
    theory: Object.freeze({
      huertaGrande: "theory-as-practical-tool" as const,
      especifismo: "specific-organization-and-social-insertion" as const,
      falsBorda: "participatory-action-research" as const,
      dreaming: "aperiodic-research-that-does-not-terminate" as const,
    }),
  });
}

/** Run one action-research cycle and keep the next aperiodic frontier open. */
export function aperiodicActionResearchCycle(
  input: {
    readonly before?: readonly Observation[];
    readonly after?: readonly Observation[];
    readonly window?: number;
    readonly stride?: number;
    readonly limit?: number;
    readonly candidatesPerWindow?: number;
  } = {},
): AperiodicActionResearchCycle {
  const beforeObservations = input.before ?? [];
  const afterObservations = input.after ?? [];
  const options = {
    ...(input.window === undefined ? {} : { window: input.window }),
    ...(input.stride === undefined ? {} : { stride: input.stride }),
    ...(input.limit === undefined ? {} : { limit: input.limit }),
    ...(input.candidatesPerWindow === undefined ? {} : { candidatesPerWindow: input.candidatesPerWindow }),
  };
  const before = aperiodicConjuncturalPraxis({ observations: beforeObservations, ...options });
  const feedback = aperiodicPraxisFeedback({
    before: beforeObservations,
    after: afterObservations,
    ...(input.limit === undefined ? {} : { limit: input.limit }),
  });
  const after = aperiodicConjuncturalPraxis({ observations: Object.freeze([...beforeObservations, ...afterObservations]), ...options });
  return Object.freeze({
    kind: "knowing.dream.action-research-cycle" as const,
    regime: "aperiodic" as const,
    settles: false as const,
    before,
    feedback,
    after,
    delta: actionResearchDelta(before, feedback, after),
    loop: Object.freeze({
      reflection: "analyze-recurrent-residue" as const,
      action: "intervene-and-observe" as const,
      observation: "classify-finite-reachability" as const,
      next: "repeat" as const,
      continues: true as const,
    }),
    theory: Object.freeze({
      falsBorda: "participatory-action-research-cycle" as const,
      huertaGrande: "analysis-strategy-tactics-feedback" as const,
      autopoietic: "structural-coupling-through-observation" as const,
      dreaming: "valuable-because-it-does-not-terminate" as const,
    }),
  });
}

/** Stream action-research cycles over successive observation batches, accumulating the field. */
export function* aperiodicActionResearchCycles(
  input: {
    readonly before?: readonly Observation[];
    readonly batches?: readonly (readonly Observation[])[];
    readonly window?: number;
    readonly stride?: number;
    readonly limit?: number;
    readonly candidatesPerWindow?: number;
    readonly cycleLimit?: number;
  } = {},
): Generator<AperiodicActionResearchSequenceEvent> {
  const batches = input.batches ?? [];
  const cycleLimit = finiteLimit(input.cycleLimit ?? batches.length);
  let field = Object.freeze([...(input.before ?? [])] as Observation[]);
  for (let index = 0; index < batches.length && index < cycleLimit; index++) {
    const batch = Object.freeze([...batches[index]!] as Observation[]);
    const cycle = aperiodicActionResearchCycle({
      before: field,
      after: batch,
      ...(input.window === undefined ? {} : { window: input.window }),
      ...(input.stride === undefined ? {} : { stride: input.stride }),
      ...(input.limit === undefined ? {} : { limit: input.limit }),
      ...(input.candidatesPerWindow === undefined ? {} : { candidatesPerWindow: input.candidatesPerWindow }),
    });
    const nextField = Object.freeze([...field, ...batch] as Observation[]);
    yield Object.freeze({
      kind: "knowing.dream.action-research-sequence-event" as const,
      index,
      regime: "aperiodic" as const,
      cycle,
      field: Object.freeze({
        before: field.length,
        after: batch.length,
        total: nextField.length,
      }),
      trajectory: Object.freeze({
        settles: false as const,
        next: "repeat" as const,
      }),
    });
    field = nextField;
  }
}

/** Return a bounded prefix of the non-terminating action-research sequence. */
export function aperiodicActionResearchSequence(
  input: {
    readonly before?: readonly Observation[];
    readonly batches?: readonly (readonly Observation[])[];
    readonly window?: number;
    readonly stride?: number;
    readonly limit?: number;
    readonly candidatesPerWindow?: number;
    readonly cycleLimit?: number;
  } = {},
): AperiodicActionResearchSequenceResult {
  const events = Object.freeze([...aperiodicActionResearchCycles(input)]);
  return Object.freeze({
    kind: "knowing.dream.action-research-sequence" as const,
    regime: "aperiodic" as const,
    settles: false as const,
    transport: "event-stream" as const,
    events,
    trajectory: Object.freeze({
      batches: input.batches?.length ?? 0,
      emitted: events.length,
      observations: events.at(-1)?.field.total ?? input.before?.length ?? 0,
      continues: true as const,
    }),
  });
}

/** Read the non-terminating action-research stream as a metastable aperiodic trajectory. */
export function aperiodicMetastableTrajectory(
  input: {
    readonly before?: readonly Observation[];
    readonly batches?: readonly (readonly Observation[])[];
    readonly window?: number;
    readonly stride?: number;
    readonly limit?: number;
    readonly candidatesPerWindow?: number;
    readonly cycleLimit?: number;
  } = {},
): AperiodicMetastableTrajectory {
  const sequence = aperiodicActionResearchSequence(input);
  const steps = Object.freeze(sequence.events.map((event) => metastableTrajectoryStep(event)));
  const integration = steps.reduce((sum, step) => sum + step.integration, 0);
  const segregation = steps.reduce((sum, step) => sum + step.segregation, 0);
  const novelty = steps.reduce((sum, step) => sum + step.novelty, 0);
  const drift = steps.reduce((sum, step) => sum + step.drift, 0);
  const nonstationary = metastableNonstationary(steps);
  const phase = metastableTrajectoryPhase(steps.length, integration, segregation, nonstationary);
  return Object.freeze({
    kind: "knowing.dream.metastable-trajectory" as const,
    regime: "aperiodic" as const,
    settles: false as const,
    sequence,
    steps,
    assessment: Object.freeze({
      phase,
      integration,
      segregation,
      novelty,
      drift,
      nonstationary,
    }),
    next: Object.freeze({
      carrier: "knowing.dream.frontier-agenda" as const,
      reason: metastableNextReason(phase),
    }),
    theory: Object.freeze({
      metastability: "integration-segregation-without-stationary-settlement" as const,
      activeInference: "epistemic-value-of-probing-uncertain-frontiers" as const,
      falsBorda: "knowledge-through-action-and-return" as const,
      huertaGrande: "theory-guides-situated-strategy" as const,
      dreaming: "aperiodic-trajectory-as-discovery-surface" as const,
    }),
  });
}

/** Choose global-historical research methods fitted to the current aperiodic trajectory. */
export function aperiodicWorldMethodRepertoire(
  input: {
    readonly before?: readonly Observation[];
    readonly batches?: readonly (readonly Observation[])[];
    readonly window?: number;
    readonly stride?: number;
    readonly limit?: number;
    readonly candidatesPerWindow?: number;
    readonly cycleLimit?: number;
    readonly methodLimit?: number;
  } = {},
): AperiodicWorldMethodRepertoire {
  const trajectory = aperiodicMetastableTrajectory(input);
  const agenda = aperiodicFrontierAgenda(input);
  const methods = Object.freeze(worldMethodsFor(trajectory, agenda));
  const selected = Object.freeze(methods.slice(0, finiteLimit(input.methodLimit ?? Math.min(3, methods.length))));
  return Object.freeze({
    kind: "knowing.dream.world-method-repertoire" as const,
    regime: "aperiodic" as const,
    settles: false as const,
    trajectory,
    agenda,
    methods,
    selected,
    doctrine: Object.freeze({
      compare: "multiple-historical-inquiry-lineages" as const,
      choose: "fit-method-to-trajectory-phase" as const,
      act: "return-method-as-carrier-obligation" as const,
      repeat: true as const,
    }),
    theory: Object.freeze({
      activeInference: "epistemic-value-probing" as const,
      enaction: "sense-making-through-structural-coupling" as const,
      catuskoti: "four-corner-paraconsistent-obstruction" as const,
      asabiyyah: "cohesion-as-collective-capacity" as const,
      cybernetics: "observer-in-the-loop" as const,
      dreaming: "world-methods-for-non-convergent-research" as const,
    }),
  });
}

/** Turn selected world methods into concrete next-batch observations and project the next cycle. */
export function aperiodicWorldMethodInterventionPlan(
  input: {
    readonly before?: readonly Observation[];
    readonly batches?: readonly (readonly Observation[])[];
    readonly window?: number;
    readonly stride?: number;
    readonly limit?: number;
    readonly candidatesPerWindow?: number;
    readonly cycleLimit?: number;
    readonly methodLimit?: number;
  } = {},
): AperiodicWorldMethodInterventionPlan {
  const repertoire = aperiodicWorldMethodRepertoire(input);
  const interventions = Object.freeze(repertoire.selected.map((method, index) => worldMethodIntervention(method, index, repertoire)));
  const after = Object.freeze(interventions.map((intervention) => intervention.observation));
  const currentField = accumulatedActionResearchField(input);
  const projected = aperiodicActionResearchCycle({
    before: currentField,
    after,
    ...(input.window === undefined ? {} : { window: input.window }),
    ...(input.stride === undefined ? {} : { stride: input.stride }),
    ...(input.limit === undefined ? {} : { limit: input.limit }),
    ...(input.candidatesPerWindow === undefined ? {} : { candidatesPerWindow: input.candidatesPerWindow }),
  });
  return Object.freeze({
    kind: "knowing.dream.world-method-intervention-plan" as const,
    regime: "aperiodic" as const,
    settles: false as const,
    repertoire,
    interventions,
    after,
    projected,
    loop: Object.freeze({
      currentField: currentField.length,
      nextBatch: after.length,
      next: "run-action-research-cycle" as const,
      continues: true as const,
    }),
    theory: Object.freeze({
      comparativeMethod: "global-historical-methods-as-operational-probes" as const,
      navigation: "wayfinding-through-non-convergent-fields" as const,
      change: "pattern-change-without-final-settlement" as const,
      action: "minimal-situated-intervention" as const,
      dreaming: "methods-become-observations" as const,
    }),
  });
}

/** Evaluate selected world methods by their actual effect on the aperiodic frontier. */
export function aperiodicWorldMethodFeedback(
  input: {
    readonly before?: readonly Observation[];
    readonly batches?: readonly (readonly Observation[])[];
    readonly window?: number;
    readonly stride?: number;
    readonly limit?: number;
    readonly candidatesPerWindow?: number;
    readonly cycleLimit?: number;
    readonly methodLimit?: number;
  } = {},
): AperiodicWorldMethodFeedback {
  const plan = aperiodicWorldMethodInterventionPlan(input);
  const currentField = accumulatedActionResearchField(input);
  const effects = Object.freeze(plan.interventions.map((intervention, index) => worldMethodFeedbackEffect(intervention, index, currentField, input)));
  const adapted = Object.freeze(effects
    .map((effect) => adaptWorldMethod(effect))
    .sort((left, right) => right.score - left.score || left.index - right.index));
  return Object.freeze({
    kind: "knowing.dream.world-method-feedback" as const,
    regime: "aperiodic" as const,
    settles: false as const,
    plan,
    effects,
    adapted,
    summary: Object.freeze({
      amplified: effects.filter((effect) => effect.next === "amplify").length,
      repeated: effects.filter((effect) => effect.next === "repeat").length,
      heldOpen: effects.filter((effect) => effect.next === "hold-open").length,
      retiredForNow: effects.filter((effect) => effect.next === "retire-for-now").length,
    }),
    loop: Object.freeze({
      nextCarrier: "knowing.dream.world-method-repertoire" as const,
      action: "adjust-method-priorities-and-repeat" as const,
      continues: true as const,
    }),
    theory: Object.freeze({
      bayesianDesign: "rank-methods-by-information-producing-intervention" as const,
      reflectivePractice: "reflection-in-action" as const,
      decolonizingMethodology: "method-accountability-to-the-field" as const,
      reciprocity: "methods-return-value-to-the-observation-community" as const,
      dreaming: "adaptive-method-feedback-without-settlement" as const,
    }),
  });
}

/** Audit the global-historical method ecology for requisite variety against the aperiodic frontier. */
export function aperiodicWorldMethodEcology(
  input: {
    readonly before?: readonly Observation[];
    readonly batches?: readonly (readonly Observation[])[];
    readonly window?: number;
    readonly stride?: number;
    readonly limit?: number;
    readonly candidatesPerWindow?: number;
    readonly cycleLimit?: number;
    readonly methodLimit?: number;
  } = {},
): AperiodicWorldMethodEcology {
  const feedback = aperiodicWorldMethodFeedback(input);
  const selected = feedback.plan.repertoire.selected;
  const regions = uniqueCount(selected.map((method) => method.region));
  const periods = uniqueCount(selected.map((method) => method.period));
  const nextCarriers = uniqueCount(selected.map((method) => method.nextCarrier));
  const assessments = uniqueCount(feedback.effects.map((effect) => effect.assessment));
  const requiredVariety = worldMethodRequiredVariety(feedback.plan.repertoire.trajectory.assessment.phase, selected.length);
  const effectiveVariety = regions + periods + nextCarriers + assessments;
  const verdict = worldMethodEcologyVerdict(selected.length, regions, effectiveVariety, requiredVariety);
  return Object.freeze({
    kind: "knowing.dream.world-method-ecology" as const,
    regime: "aperiodic" as const,
    settles: false as const,
    feedback,
    variety: Object.freeze({
      selectedMethods: selected.length,
      regions,
      periods,
      nextCarriers,
      assessments,
      effectiveVariety,
      requiredVariety,
    }),
    verdict,
    obligations: worldMethodEcologyObligations(verdict, regions, periods, nextCarriers, assessments),
    loop: Object.freeze({
      nextCarrier: "knowing.dream.world-method-feedback" as const,
      action: "increase-method-variety-and-repeat" as const,
      continues: true as const,
    }),
    theory: Object.freeze({
      requisiteVariety: "method-variety-must-match-frontier-variety" as const,
      epistemologicalPluralism: "no-single-method-governs-discovery" as const,
      strongObjectivity: "situated-standpoints-increase-reflexive-correction" as const,
      collectiveIntelligence: "heterogeneous-search-can-outperform-homogeneous-search" as const,
      dreaming: "aperiodic-method-ecology" as const,
    }),
  });
}

/** Braid complementary world methods into combined next-cycle observations. */
export function aperiodicWorldMethodBraid(
  input: {
    readonly before?: readonly Observation[];
    readonly batches?: readonly (readonly Observation[])[];
    readonly window?: number;
    readonly stride?: number;
    readonly limit?: number;
    readonly candidatesPerWindow?: number;
    readonly cycleLimit?: number;
    readonly methodLimit?: number;
    readonly braidLimit?: number;
  } = {},
): AperiodicWorldMethodBraid {
  const ecology = aperiodicWorldMethodEcology(input);
  const braidLimit = finiteLimit(input.braidLimit ?? Math.max(0, Math.floor(ecology.feedback.adapted.length / 2)));
  const pairs = Object.freeze(worldMethodBraidPairs(ecology.feedback.adapted, ecology, braidLimit));
  const after = Object.freeze(pairs.map((pair) => pair.observation));
  const currentField = accumulatedActionResearchField(input);
  const projected = aperiodicActionResearchCycle({
    before: currentField,
    after,
    ...(input.window === undefined ? {} : { window: input.window }),
    ...(input.stride === undefined ? {} : { stride: input.stride }),
    ...(input.limit === undefined ? {} : { limit: input.limit }),
    ...(input.candidatesPerWindow === undefined ? {} : { candidatesPerWindow: input.candidatesPerWindow }),
  });
  return Object.freeze({
    kind: "knowing.dream.world-method-braid" as const,
    regime: "aperiodic" as const,
    settles: false as const,
    ecology,
    pairs,
    after,
    projected,
    loop: Object.freeze({
      currentField: currentField.length,
      braidedPairs: pairs.length,
      next: "run-action-research-cycle" as const,
      continues: true as const,
    }),
    theory: Object.freeze({
      requisiteVariety: "compose-response-variety" as const,
      epistemologicalPluralism: "methods-check-each-other" as const,
      standpoint: "situated-difference-as-correction" as const,
      collectiveIntelligence: "diverse-heuristics-as-search" as const,
      dreaming: "braided-methods-for-aperiodic-research" as const,
    }),
  });
}

/** Build a constellation graph over the selected/adapted global method ecology. */
export function aperiodicWorldMethodConstellation(
  input: {
    readonly before?: readonly Observation[];
    readonly batches?: readonly (readonly Observation[])[];
    readonly window?: number;
    readonly stride?: number;
    readonly limit?: number;
    readonly candidatesPerWindow?: number;
    readonly cycleLimit?: number;
    readonly methodLimit?: number;
    readonly braidLimit?: number;
  } = {},
): AperiodicWorldMethodConstellation {
  const braid = aperiodicWorldMethodBraid(input);
  const nodes = Object.freeze(braid.ecology.feedback.adapted.map((method, index) => worldMethodConstellationNode(method, index)));
  const edges = Object.freeze(worldMethodConstellationEdges(nodes, braid));
  const topology = worldMethodConstellationTopology(nodes, edges);
  return Object.freeze({
    kind: "knowing.dream.world-method-constellation" as const,
    regime: "aperiodic" as const,
    settles: false as const,
    braid,
    nodes,
    edges,
    topology,
    obligations: worldMethodConstellationObligations(topology, braid.ecology.obligations),
    theory: Object.freeze({
      boundaryObjects: "methods-coordinate-without-identical-meanings" as const,
      actorNetwork: "relations-between-methods-change-the-research-field" as const,
      pluriverse: "many-worlds-of-inquiry-without-single-sovereign-method" as const,
      dreaming: "constellated-method-field-for-aperiodic-research" as const,
    }),
  });
}

/** Walk the method constellation with an aperiodic step schedule and emit navigation events. */
export function aperiodicWorldMethodWayfinding(
  input: {
    readonly before?: readonly Observation[];
    readonly batches?: readonly (readonly Observation[])[];
    readonly window?: number;
    readonly stride?: number;
    readonly limit?: number;
    readonly candidatesPerWindow?: number;
    readonly cycleLimit?: number;
    readonly methodLimit?: number;
    readonly braidLimit?: number;
    readonly pathLimit?: number;
  } = {},
): AperiodicWorldMethodWayfinding {
  const constellation = aperiodicWorldMethodConstellation(input);
  const pathLimit = finiteLimit(input.pathLimit ?? Math.min(8, constellation.edges.length));
  const events = Object.freeze(worldMethodWayfindingEvents(constellation, pathLimit));
  return Object.freeze({
    kind: "knowing.dream.world-method-wayfinding" as const,
    regime: "aperiodic" as const,
    settles: false as const,
    transport: "event-stream" as const,
    constellation,
    events,
    trajectory: Object.freeze({
      emitted: events.length,
      visitedMethods: uniqueCount(events.flatMap((event) => [event.from.method, event.to.method])),
      relations: uniqueCount(events.map((event) => event.edge.relation)),
      continues: true as const,
    }),
    theory: Object.freeze({
      graphWalks: "walk-record-as-graph-learning-signal" as const,
      foraging: "aperiodic-search-through-sparse-method-space" as const,
      songlines: "navigation-as-storied-relation" as const,
      ifa: "structured-interpretive-traversal" as const,
      dreaming: "wayfinding-through-method-constellation" as const,
    }),
  });
}

/** Rank the live frontiers produced by an action-research stream into next obligations. */
export function aperiodicFrontierAgenda(
  input: {
    readonly before?: readonly Observation[];
    readonly batches?: readonly (readonly Observation[])[];
    readonly window?: number;
    readonly stride?: number;
    readonly limit?: number;
    readonly candidatesPerWindow?: number;
    readonly cycleLimit?: number;
  } = {},
): AperiodicFrontierAgenda {
  const sequence = aperiodicActionResearchSequence(input);
  const items = Object.freeze(sequence.events
    .map((event) => frontierAgendaItem(event))
    .sort((left, right) => right.score - left.score || left.index - right.index));
  return Object.freeze({
    kind: "knowing.dream.frontier-agenda" as const,
    regime: "aperiodic" as const,
    sequence,
    items,
    method: Object.freeze({
      analyze: "rank-residue-by-persistence-and-reachability" as const,
      decide: "prefer-unsettled-recurrent-frontiers" as const,
      act: "feed-next-cycle" as const,
      repeat: true as const,
    }),
    theory: Object.freeze({
      researchProgram: "progressive-problemshift" as const,
      participatoryResearch: "return-results-to-action" as const,
      especifismo: "organized-priority-from-social-insertion" as const,
      dreaming: "agenda-emerges-from-non-convergence" as const,
    }),
  });
}

/** Audit the research programme carried by a non-terminating frontier agenda. */
export function aperiodicResearchProgramAudit(
  input: {
    readonly before?: readonly Observation[];
    readonly batches?: readonly (readonly Observation[])[];
    readonly window?: number;
    readonly stride?: number;
    readonly limit?: number;
    readonly candidatesPerWindow?: number;
    readonly cycleLimit?: number;
  } = {},
): AperiodicResearchProgramAudit {
  const agenda = aperiodicFrontierAgenda(input);
  const finiteBridges = agenda.sequence.events.reduce(
    (sum, event) => sum + event.cycle.delta.strictBridges + event.cycle.delta.scottJoins + event.cycle.delta.transfiniteCovers,
    0,
  );
  const persistentResidues = agenda.sequence.events.reduce((sum, event) => sum + event.cycle.delta.persistentResidues, 0);
  const organize = agenda.items.filter((item) => item.priority === "organize").length;
  const experiment = agenda.items.filter((item) => item.priority === "experiment").length;
  const consolidate = agenda.items.filter((item) => item.priority === "consolidate").length;
  return Object.freeze({
    kind: "knowing.dream.research-program-audit" as const,
    regime: "aperiodic" as const,
    agenda,
    assessment: Object.freeze({
      phase: researchProgramPhase(finiteBridges, persistentResidues, agenda.items.length),
      finiteBridges,
      persistentResidues,
      agendaItems: agenda.items.length,
      organize,
      experiment,
      consolidate,
    }),
    heuristics: Object.freeze({
      positive: "prefer-cycles-that-produce-new-reachability-or-sharper-residue" as const,
      negative: "do-not-declare-final-settlement-from-one-finite-bridge" as const,
      next: "feed-the-agenda-back-into-action-research" as const,
    }),
    theory: Object.freeze({
      lakatos: "progressive-versus-degenerating-problemshift" as const,
      falsBorda: "participatory-return-to-the-field" as const,
      dreaming: "non-termination-with-novelty-audit" as const,
    }),
  });
}

export function admitAperiodicDreamInput(input: JsonValue, verb = "aperiodic-dream"): {
  readonly observations: readonly Observation[];
  readonly limit?: number;
  readonly start?: number;
} {
  const value = jsonResource(input, `${verb} input`);
  const record: JsonRecord | null = Array.isArray(value)
    ? { observations: value }
    : value !== null && typeof value === "object"
      ? value as JsonRecord
      : null;
  if (record === null) throw new TypeError(`${verb}: expected an array of observations or { observations, limit }`);
  const rawObservations = record["observations"];
  if (!Array.isArray(rawObservations)) throw new TypeError(`${verb}: observations must be an array`);
  const observations = rawObservations.map((obs) => admitObservation(obs, verb));
  const limit = optionalNonNegativeInteger(record["limit"], `${verb}: limit`);
  const start = optionalNonNegativeInteger(record["start"], `${verb}: start`);
  return Object.freeze({
    observations: Object.freeze(observations),
    ...(limit === undefined ? {} : { limit }),
    ...(start === undefined ? {} : { start }),
  });
}

export function admitAperiodicHologramInput(input: JsonValue, verb = "aperiodic-hologram"): {
  readonly observations: readonly Observation[];
  readonly window?: number;
  readonly stride?: number;
  readonly limit?: number;
  readonly candidatesPerWindow?: number;
} {
  const value = jsonResource(input, `${verb} input`);
  const record: JsonRecord | null = Array.isArray(value)
    ? { observations: value }
    : value !== null && typeof value === "object"
      ? value as JsonRecord
      : null;
  if (record === null) throw new TypeError(`${verb}: expected an array of observations or { observations, window?, stride?, limit?, candidatesPerWindow? }`);
  const rawObservations = record["observations"];
  if (!Array.isArray(rawObservations)) throw new TypeError(`${verb}: observations must be an array`);
  const observations = rawObservations.map((obs) => admitObservation(obs, verb));
  const window = optionalPositiveInteger(record["window"], `${verb}: window`);
  const stride = optionalPositiveInteger(record["stride"], `${verb}: stride`);
  const limit = optionalNonNegativeInteger(record["limit"], `${verb}: limit`);
  const candidatesPerWindow = optionalNonNegativeInteger(record["candidatesPerWindow"], `${verb}: candidatesPerWindow`);
  return Object.freeze({
    observations: Object.freeze(observations),
    ...(window === undefined ? {} : { window }),
    ...(stride === undefined ? {} : { stride }),
    ...(limit === undefined ? {} : { limit }),
    ...(candidatesPerWindow === undefined ? {} : { candidatesPerWindow }),
  });
}

export function admitActionResearchCycleInput(input: JsonValue, verb = "action-research-cycle"): {
  readonly before: readonly Observation[];
  readonly after: readonly Observation[];
  readonly window?: number;
  readonly stride?: number;
  readonly limit?: number;
  readonly candidatesPerWindow?: number;
} {
  const value = jsonResource(input, `${verb} input`);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${verb}: expected { before, after, window?, stride?, limit?, candidatesPerWindow? }`);
  }
  const record = value as JsonRecord;
  const rawBefore = record["before"];
  const rawAfter = record["after"];
  if (!Array.isArray(rawBefore)) throw new TypeError(`${verb}: before must be an array of observations`);
  if (!Array.isArray(rawAfter)) throw new TypeError(`${verb}: after must be an array of observations`);
  const before = rawBefore.map((obs) => admitObservation(obs, verb));
  const after = rawAfter.map((obs) => admitObservation(obs, verb));
  const window = optionalPositiveInteger(record["window"], `${verb}: window`);
  const stride = optionalPositiveInteger(record["stride"], `${verb}: stride`);
  const limit = optionalNonNegativeInteger(record["limit"], `${verb}: limit`);
  const candidatesPerWindow = optionalNonNegativeInteger(record["candidatesPerWindow"], `${verb}: candidatesPerWindow`);
  return Object.freeze({
    before: Object.freeze(before),
    after: Object.freeze(after),
    ...(window === undefined ? {} : { window }),
    ...(stride === undefined ? {} : { stride }),
    ...(limit === undefined ? {} : { limit }),
    ...(candidatesPerWindow === undefined ? {} : { candidatesPerWindow }),
  });
}

export function admitActionResearchSequenceInput(input: JsonValue, verb = "action-research-sequence"): {
  readonly before: readonly Observation[];
  readonly batches: readonly (readonly Observation[])[];
  readonly window?: number;
  readonly stride?: number;
  readonly limit?: number;
  readonly candidatesPerWindow?: number;
  readonly cycleLimit?: number;
} {
  const value = jsonResource(input, `${verb} input`);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${verb}: expected { before, batches, window?, stride?, limit?, candidatesPerWindow?, cycleLimit? }`);
  }
  const record = value as JsonRecord;
  const rawBefore = record["before"];
  const rawBatches = record["batches"];
  if (!Array.isArray(rawBefore)) throw new TypeError(`${verb}: before must be an array of observations`);
  if (!Array.isArray(rawBatches)) throw new TypeError(`${verb}: batches must be an array of observation arrays`);
  const before = rawBefore.map((obs) => admitObservation(obs, verb));
  const batches = rawBatches.map((batch, index) => {
    if (!Array.isArray(batch)) throw new TypeError(`${verb}: batches[${index}] must be an array of observations`);
    return Object.freeze(batch.map((obs) => admitObservation(obs, verb)));
  });
  const window = optionalPositiveInteger(record["window"], `${verb}: window`);
  const stride = optionalPositiveInteger(record["stride"], `${verb}: stride`);
  const limit = optionalNonNegativeInteger(record["limit"], `${verb}: limit`);
  const candidatesPerWindow = optionalNonNegativeInteger(record["candidatesPerWindow"], `${verb}: candidatesPerWindow`);
  const cycleLimit = optionalNonNegativeInteger(record["cycleLimit"], `${verb}: cycleLimit`);
  return Object.freeze({
    before: Object.freeze(before),
    batches: Object.freeze(batches),
    ...(window === undefined ? {} : { window }),
    ...(stride === undefined ? {} : { stride }),
    ...(limit === undefined ? {} : { limit }),
    ...(candidatesPerWindow === undefined ? {} : { candidatesPerWindow }),
    ...(cycleLimit === undefined ? {} : { cycleLimit }),
  });
}

export function admitPraxisFeedbackInput(input: JsonValue, verb = "praxis-feedback"): {
  readonly before: readonly Observation[];
  readonly after: readonly Observation[];
  readonly limit?: number;
} {
  const value = jsonResource(input, `${verb} input`);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${verb}: expected { before, after, limit? }`);
  }
  const record = value as JsonRecord;
  const rawBefore = record["before"];
  const rawAfter = record["after"];
  if (!Array.isArray(rawBefore)) throw new TypeError(`${verb}: before must be an array of observations`);
  if (!Array.isArray(rawAfter)) throw new TypeError(`${verb}: after must be an array of observations`);
  const before = rawBefore.map((obs) => admitObservation(obs, verb));
  const after = rawAfter.map((obs) => admitObservation(obs, verb));
  const limit = optionalNonNegativeInteger(record["limit"], `${verb}: limit`);
  return Object.freeze({
    before: Object.freeze(before),
    after: Object.freeze(after),
    ...(limit === undefined ? {} : { limit }),
  });
}

export const aperiodicDreamAction: Action = action({
  verb: "aperiodic-dream",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Stream aperiodic dreaming as research-grade conjectures emitted from non-convergent residue.",
  description: "Domain: { observations, limit?, start? } or an observation array. Codomain: a bounded event-stream prefix of knowing.dream.aperiodic-research. Each candidate is tagged with the finite regimes that cannot derive it; the genuinely-new candidates are exactly the non-convergent residue outside strict-finite, Scott-continuous, and transfinite dreaming.",
  domainSchema: Object.freeze({
    type: "object",
    properties: Object.freeze({
      observations: Object.freeze({ type: "array" }),
      limit: Object.freeze({ type: "integer", minimum: 0 }),
      start: Object.freeze({ type: "integer", minimum: 0 }),
    }),
    required: Object.freeze(["observations"]),
    additionalProperties: true,
  }),
  codomainSchema: Object.freeze({
    $id: "knowing/dreaming/aperiodic-research",
    type: "object",
    required: Object.freeze(["kind", "regime", "settles", "transport", "candidates", "residue"]),
    properties: Object.freeze({
      kind: Object.freeze({ const: "knowing.dream.aperiodic-research" }),
      regime: Object.freeze({ const: "aperiodic" }),
      settles: Object.freeze({ const: false }),
      transport: Object.freeze({ const: "event-stream" }),
      candidates: Object.freeze({ type: "array" }),
      residue: Object.freeze({ type: "object" }),
    }),
    "x-settlement-filtration": Object.freeze({
      kind: "relating.codomain.settlement-filtration",
      limitStage: true,
      nonScottLimitFiring: false,
      cofinality: "countable",
    }),
  }),
  run: (input: unknown): JsonValue => {
    const admitted = admitAperiodicDreamInput(input as JsonValue);
    const options: DreamOptions = {
      ...(admitted.limit === undefined ? {} : { limit: admitted.limit }),
      ...(admitted.start === undefined ? {} : { start: admitted.start }),
    };
    return jsonResource(aperiodicDream(admitted, options), "aperiodic dream");
  },
});

export const discoveryLedgerAction: Action = action({
  verb: "discovery-ledger",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Audit finite dream products against genuinely new aperiodic candidates.",
  description: "Domain: { observations, limit?, start? } or an observation array. Codomain: knowing.dream.discovery-ledger. The ledger runs strict-finite, Scott-continuous, and transfinite dreaming, then records aperiodic candidates whose novelty is exactly certified by finite-regime exclusion.",
  domainSchema: Object.freeze({
    type: "object",
    properties: Object.freeze({
      observations: Object.freeze({ type: "array" }),
      limit: Object.freeze({ type: "integer", minimum: 0 }),
      start: Object.freeze({ type: "integer", minimum: 0 }),
    }),
    required: Object.freeze(["observations"]),
    additionalProperties: true,
  }),
  codomainSchema: Object.freeze({
    $id: "knowing/dreaming/discovery-ledger",
    type: "object",
    required: Object.freeze(["kind", "regime", "finite", "aperiodic", "residue", "verdict", "theory"]),
    properties: Object.freeze({
      kind: Object.freeze({ const: "knowing.dream.discovery-ledger" }),
      regime: Object.freeze({ const: "aperiodic" }),
      finite: Object.freeze({ type: "array" }),
      aperiodic: Object.freeze({ type: "array" }),
      residue: Object.freeze({ type: "object" }),
      verdict: Object.freeze({ type: "object" }),
      theory: Object.freeze({ type: "object" }),
    }),
  }),
  run: (input: unknown): JsonValue => {
    const admitted = admitAperiodicDreamInput(input as JsonValue, "discovery-ledger");
    return jsonResource(aperiodicDiscoveryLedger(admitted), "discovery ledger");
  },
});

export const praxisProbesAction: Action = action({
  verb: "praxis-probes",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Generate concrete observation probes for testing aperiodic residue against finite regimes.",
  description: "Domain: { observations, limit? } or an observation array. Codomain: knowing.dream.praxis-probes. For each finite-excluded residue pair, emits strict-chain, repeated-cell, and shared-subject probe observations whose results should be re-entered through praxis-feedback.",
  domainSchema: Object.freeze({
    type: "object",
    properties: Object.freeze({
      observations: Object.freeze({ type: "array" }),
      limit: Object.freeze({ type: "integer", minimum: 0 }),
    }),
    required: Object.freeze(["observations"]),
    additionalProperties: true,
  }),
  codomainSchema: Object.freeze({
    $id: "knowing/dreaming/praxis-probes",
    type: "object",
    required: Object.freeze(["kind", "regime", "residue", "probes", "method", "theory"]),
    properties: Object.freeze({
      kind: Object.freeze({ const: "knowing.dream.praxis-probes" }),
      regime: Object.freeze({ const: "aperiodic" }),
      residue: Object.freeze({ type: "object" }),
      probes: Object.freeze({ type: "array" }),
      method: Object.freeze({ type: "object" }),
      theory: Object.freeze({ type: "object" }),
    }),
  }),
  run: (input: unknown): JsonValue => {
    const admitted = admitAperiodicDreamInput(input as JsonValue, "praxis-probes");
    return jsonResource(aperiodicPraxisProbes(admitted), "praxis probes");
  },
});

export const aperiodicResidueAction: Action = action({
  verb: "aperiodic-residue",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Extract the non-convergent residue: observation pairs no finite dream regime can reach.",
  description: "Domain: { observations } or an observation array. Codomain: knowing.dream.aperiodic-residue, the reusable residue carrier whose pairs carry strict-finite, Scott-continuous, and transfinite exclusion witnesses. This is the theory/practice hinge: the part finite closure cannot settle is the frontier dreaming acts on.",
  domainSchema: Object.freeze({
    type: "object",
    properties: Object.freeze({
      observations: Object.freeze({ type: "array" }),
    }),
    required: Object.freeze(["observations"]),
    additionalProperties: true,
  }),
  codomainSchema: Object.freeze({
    $id: "knowing/dreaming/aperiodic-residue",
    type: "object",
    required: Object.freeze(["kind", "regime", "observations", "pairs", "theory"]),
    properties: Object.freeze({
      kind: Object.freeze({ const: "knowing.dream.aperiodic-residue" }),
      regime: Object.freeze({ const: "aperiodic" }),
      observations: Object.freeze({ type: "integer", minimum: 0 }),
      pairs: Object.freeze({ type: "array" }),
      theory: Object.freeze({ type: "object" }),
    }),
  }),
  run: (input: unknown): JsonValue => {
    const admitted = admitAperiodicDreamInput(input as JsonValue, "aperiodic-residue");
    return jsonResource(aperiodicResidue(admitted.observations), "aperiodic residue");
  },
});

export const praxisFrontierAction: Action = action({
  verb: "praxis-frontier",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Turn aperiodic residue into theory-practice intervention obligations with feedback loops.",
  description: "Domain: { observations, limit? } or an observation array. Codomain: knowing.dream.praxis-frontier. This reads non-convergent residue through aperiodic order, contextual obstruction, autopoietic structural coupling, and South American especifista praxis: theory only counts when it returns to material intervention and re-observation.",
  domainSchema: Object.freeze({
    type: "object",
    properties: Object.freeze({
      observations: Object.freeze({ type: "array" }),
      limit: Object.freeze({ type: "integer", minimum: 0 }),
    }),
    required: Object.freeze(["observations"]),
    additionalProperties: true,
  }),
  codomainSchema: Object.freeze({
    $id: "knowing/dreaming/praxis-frontier",
    type: "object",
    required: Object.freeze(["kind", "regime", "residue", "interventions", "doctrine"]),
    properties: Object.freeze({
      kind: Object.freeze({ const: "knowing.dream.praxis-frontier" }),
      regime: Object.freeze({ const: "aperiodic" }),
      residue: Object.freeze({ type: "object" }),
      interventions: Object.freeze({ type: "array" }),
      doctrine: Object.freeze({ type: "object" }),
    }),
  }),
  run: (input: unknown): JsonValue => {
    const admitted = admitAperiodicDreamInput(input as JsonValue, "praxis-frontier");
    return jsonResource(aperiodicPraxisFrontier(admitted), "praxis frontier");
  },
});

export const aperiodicHologramAction: Action = action({
  verb: "aperiodic-hologram",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Project an ordered agent observation stream into local aperiodic residue windows and recurrent holographic frontiers.",
  description: "Domain: { observations, window?, stride?, limit?, candidatesPerWindow? } or an observation array. Codomain: knowing.dream.aperiodic-hologram. Each local window computes the finite-regime-excluded residue and a bounded conjecture prefix; recurrences report non-convergent structures visible across multiple local projections.",
  domainSchema: Object.freeze({
    type: "object",
    properties: Object.freeze({
      observations: Object.freeze({ type: "array" }),
      window: Object.freeze({ type: "integer", minimum: 1 }),
      stride: Object.freeze({ type: "integer", minimum: 1 }),
      limit: Object.freeze({ type: "integer", minimum: 0 }),
      candidatesPerWindow: Object.freeze({ type: "integer", minimum: 0 }),
    }),
    required: Object.freeze(["observations"]),
    additionalProperties: true,
  }),
  codomainSchema: Object.freeze({
    $id: "knowing/dreaming/aperiodic-hologram",
    type: "object",
    required: Object.freeze(["kind", "regime", "settles", "transport", "projections", "recurrences", "frontier", "theory"]),
    properties: Object.freeze({
      kind: Object.freeze({ const: "knowing.dream.aperiodic-hologram" }),
      regime: Object.freeze({ const: "aperiodic" }),
      settles: Object.freeze({ const: false }),
      transport: Object.freeze({ const: "event-stream" }),
      projections: Object.freeze({ type: "array" }),
      recurrences: Object.freeze({ type: "array" }),
      frontier: Object.freeze({ type: "object" }),
      theory: Object.freeze({ type: "object" }),
    }),
    "x-settlement-filtration": Object.freeze({
      kind: "relating.codomain.settlement-filtration",
      localWindows: true,
      nonConvergentResidue: true,
      cofinality: "countable",
    }),
  }),
  run: (input: unknown): JsonValue => {
    const admitted = admitAperiodicHologramInput(input as JsonValue);
    return jsonResource(aperiodicHologram(admitted), "aperiodic hologram");
  },
});

export const holographicPraxisAction: Action = action({
  verb: "holographic-praxis",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Turn recurrent aperiodic hologram residue into organized praxis obligations.",
  description: "Domain: { observations, window?, stride?, limit?, candidatesPerWindow? } or an observation array. Codomain: knowing.dream.holographic-praxis. This reads recurrent non-convergent residue across local windows as the organized frontier: act where the same finite-excluded structure keeps becoming locally visible, then reobserve those windows and classify praxis feedback.",
  domainSchema: Object.freeze({
    type: "object",
    properties: Object.freeze({
      observations: Object.freeze({ type: "array" }),
      window: Object.freeze({ type: "integer", minimum: 1 }),
      stride: Object.freeze({ type: "integer", minimum: 1 }),
      limit: Object.freeze({ type: "integer", minimum: 0 }),
      candidatesPerWindow: Object.freeze({ type: "integer", minimum: 0 }),
    }),
    required: Object.freeze(["observations"]),
    additionalProperties: true,
  }),
  codomainSchema: Object.freeze({
    $id: "knowing/dreaming/holographic-praxis",
    type: "object",
    required: Object.freeze(["kind", "regime", "hologram", "interventions", "doctrine", "theory"]),
    properties: Object.freeze({
      kind: Object.freeze({ const: "knowing.dream.holographic-praxis" }),
      regime: Object.freeze({ const: "aperiodic" }),
      hologram: Object.freeze({ type: "object" }),
      interventions: Object.freeze({ type: "array" }),
      doctrine: Object.freeze({ type: "object" }),
      theory: Object.freeze({ type: "object" }),
    }),
  }),
  run: (input: unknown): JsonValue => {
    const admitted = admitAperiodicHologramInput(input as JsonValue, "holographic-praxis");
    return jsonResource(aperiodicHolographicPraxis(admitted), "holographic praxis");
  },
});

export const conjuncturalPraxisAction: Action = action({
  verb: "conjunctural-praxis",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Build an analysis-strategy-tactics-feedback program from recurrent aperiodic hologram residue.",
  description: "Domain: { observations, window?, stride?, limit?, candidatesPerWindow? } or an observation array. Codomain: knowing.dream.conjunctural-praxis. This turns holographic praxis into a concrete program: analyze the recurrent finite-excluded residue, select local windows for social insertion, name situated tactics, and send results back through praxis-feedback.",
  domainSchema: Object.freeze({
    type: "object",
    properties: Object.freeze({
      observations: Object.freeze({ type: "array" }),
      window: Object.freeze({ type: "integer", minimum: 1 }),
      stride: Object.freeze({ type: "integer", minimum: 1 }),
      limit: Object.freeze({ type: "integer", minimum: 0 }),
      candidatesPerWindow: Object.freeze({ type: "integer", minimum: 0 }),
    }),
    required: Object.freeze(["observations"]),
    additionalProperties: true,
  }),
  codomainSchema: Object.freeze({
    $id: "knowing/dreaming/conjunctural-praxis",
    type: "object",
    required: Object.freeze(["kind", "regime", "praxis", "lines", "program", "theory"]),
    properties: Object.freeze({
      kind: Object.freeze({ const: "knowing.dream.conjunctural-praxis" }),
      regime: Object.freeze({ const: "aperiodic" }),
      praxis: Object.freeze({ type: "object" }),
      lines: Object.freeze({ type: "array" }),
      program: Object.freeze({ type: "object" }),
      theory: Object.freeze({ type: "object" }),
    }),
  }),
  run: (input: unknown): JsonValue => {
    const admitted = admitAperiodicHologramInput(input as JsonValue, "conjunctural-praxis");
    return jsonResource(aperiodicConjuncturalPraxis(admitted), "conjunctural praxis");
  },
});

export const actionResearchCycleAction: Action = action({
  verb: "action-research-cycle",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Run one participatory action-research cycle over aperiodic conjunctural praxis.",
  description: "Domain: { before, after, window?, stride?, limit?, candidatesPerWindow? }. Codomain: knowing.dream.action-research-cycle. This composes conjunctural-praxis before action, praxis-feedback after situated observations, and the next conjunctural-praxis frontier, explicitly marking the loop as continuing rather than terminating.",
  domainSchema: Object.freeze({
    type: "object",
    properties: Object.freeze({
      before: Object.freeze({ type: "array" }),
      after: Object.freeze({ type: "array" }),
      window: Object.freeze({ type: "integer", minimum: 1 }),
      stride: Object.freeze({ type: "integer", minimum: 1 }),
      limit: Object.freeze({ type: "integer", minimum: 0 }),
      candidatesPerWindow: Object.freeze({ type: "integer", minimum: 0 }),
    }),
    required: Object.freeze(["before", "after"]),
    additionalProperties: true,
  }),
  codomainSchema: Object.freeze({
    $id: "knowing/dreaming/action-research-cycle",
    type: "object",
    required: Object.freeze(["kind", "regime", "settles", "before", "feedback", "after", "delta", "loop", "theory"]),
    properties: Object.freeze({
      kind: Object.freeze({ const: "knowing.dream.action-research-cycle" }),
      regime: Object.freeze({ const: "aperiodic" }),
      settles: Object.freeze({ const: false }),
      before: Object.freeze({ type: "object" }),
      feedback: Object.freeze({ type: "object" }),
      after: Object.freeze({ type: "object" }),
      delta: Object.freeze({ type: "object" }),
      loop: Object.freeze({ type: "object" }),
      theory: Object.freeze({ type: "object" }),
    }),
  }),
  run: (input: unknown): JsonValue => {
    const admitted = admitActionResearchCycleInput(input as JsonValue);
    return jsonResource(aperiodicActionResearchCycle(admitted), "action research cycle");
  },
});

export const actionResearchSequenceAction: Action = action({
  verb: "action-research-sequence",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Return a bounded event-stream prefix of repeated aperiodic action-research cycles.",
  description: "Domain: { before, batches, window?, stride?, limit?, candidatesPerWindow?, cycleLimit? }. Codomain: knowing.dream.action-research-sequence. Each batch is folded into the accumulated observation field, producing an action-research-cycle event whose trajectory remains aperiodic and explicitly continues.",
  domainSchema: Object.freeze({
    type: "object",
    properties: Object.freeze({
      before: Object.freeze({ type: "array" }),
      batches: Object.freeze({ type: "array" }),
      window: Object.freeze({ type: "integer", minimum: 1 }),
      stride: Object.freeze({ type: "integer", minimum: 1 }),
      limit: Object.freeze({ type: "integer", minimum: 0 }),
      candidatesPerWindow: Object.freeze({ type: "integer", minimum: 0 }),
      cycleLimit: Object.freeze({ type: "integer", minimum: 0 }),
    }),
    required: Object.freeze(["before", "batches"]),
    additionalProperties: true,
  }),
  codomainSchema: Object.freeze({
    $id: "knowing/dreaming/action-research-sequence",
    type: "object",
    required: Object.freeze(["kind", "regime", "settles", "transport", "events", "trajectory"]),
    properties: Object.freeze({
      kind: Object.freeze({ const: "knowing.dream.action-research-sequence" }),
      regime: Object.freeze({ const: "aperiodic" }),
      settles: Object.freeze({ const: false }),
      transport: Object.freeze({ const: "event-stream" }),
      events: Object.freeze({ type: "array" }),
      trajectory: Object.freeze({ type: "object" }),
    }),
    "x-settlement-filtration": Object.freeze({
      kind: "relating.codomain.settlement-filtration",
      nonTerminatingLoop: true,
      eventStreamPrefix: true,
      cofinality: "countable",
    }),
  }),
  run: (input: unknown): JsonValue => {
    const admitted = admitActionResearchSequenceInput(input as JsonValue);
    return jsonResource(aperiodicActionResearchSequence(admitted), "action research sequence");
  },
});

export const metastableTrajectoryAction: Action = action({
  verb: "metastable-trajectory",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read an aperiodic action-research stream as a metastable, non-stationary discovery trajectory.",
  description: "Domain: { before, batches, window?, stride?, limit?, candidatesPerWindow?, cycleLimit? }. Codomain: knowing.dream.metastable-trajectory. Interprets finite bridges as integration, persistent residue as segregation, and changing cycle signatures as non-stationary drift, then routes the open trajectory back to frontier-agenda rather than declaring settlement.",
  domainSchema: Object.freeze({
    type: "object",
    properties: Object.freeze({
      before: Object.freeze({ type: "array" }),
      batches: Object.freeze({ type: "array" }),
      window: Object.freeze({ type: "integer", minimum: 1 }),
      stride: Object.freeze({ type: "integer", minimum: 1 }),
      limit: Object.freeze({ type: "integer", minimum: 0 }),
      candidatesPerWindow: Object.freeze({ type: "integer", minimum: 0 }),
      cycleLimit: Object.freeze({ type: "integer", minimum: 0 }),
    }),
    required: Object.freeze(["before", "batches"]),
    additionalProperties: true,
  }),
  codomainSchema: Object.freeze({
    $id: "knowing/dreaming/metastable-trajectory",
    type: "object",
    required: Object.freeze(["kind", "regime", "settles", "sequence", "steps", "assessment", "next", "theory"]),
    properties: Object.freeze({
      kind: Object.freeze({ const: "knowing.dream.metastable-trajectory" }),
      regime: Object.freeze({ const: "aperiodic" }),
      settles: Object.freeze({ const: false }),
      sequence: Object.freeze({ type: "object" }),
      steps: Object.freeze({ type: "array" }),
      assessment: Object.freeze({ type: "object" }),
      next: Object.freeze({ type: "object" }),
      theory: Object.freeze({ type: "object" }),
    }),
    "x-settlement-filtration": Object.freeze({
      kind: "relating.codomain.settlement-filtration",
      nonTerminatingLoop: true,
      eventStreamPrefix: true,
      cofinality: "countable",
    }),
  }),
  run: (input: unknown): JsonValue => {
    const admitted = admitActionResearchSequenceInput(input as JsonValue, "metastable-trajectory");
    return jsonResource(aperiodicMetastableTrajectory(admitted), "metastable trajectory");
  },
});

export const worldMethodRepertoireAction: Action = action({
  verb: "world-method-repertoire",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Choose global-historical inquiry methods for the current aperiodic research trajectory.",
  description: "Domain: { before, batches, window?, stride?, limit?, candidatesPerWindow?, cycleLimit?, methodLimit? }. Codomain: knowing.dream.world-method-repertoire. Reads the metastable trajectory and frontier agenda, then ranks intervention methods drawn from active inference, enaction/autopoiesis, catuskoti-style paraconsistency, Ibn Khaldun's asabiyyah, Huerta Grande conjunctural praxis, and second-order cybernetics.",
  domainSchema: Object.freeze({
    type: "object",
    properties: Object.freeze({
      before: Object.freeze({ type: "array" }),
      batches: Object.freeze({ type: "array" }),
      window: Object.freeze({ type: "integer", minimum: 1 }),
      stride: Object.freeze({ type: "integer", minimum: 1 }),
      limit: Object.freeze({ type: "integer", minimum: 0 }),
      candidatesPerWindow: Object.freeze({ type: "integer", minimum: 0 }),
      cycleLimit: Object.freeze({ type: "integer", minimum: 0 }),
      methodLimit: Object.freeze({ type: "integer", minimum: 0 }),
    }),
    required: Object.freeze(["before", "batches"]),
    additionalProperties: true,
  }),
  codomainSchema: Object.freeze({
    $id: "knowing/dreaming/world-method-repertoire",
    type: "object",
    required: Object.freeze(["kind", "regime", "settles", "trajectory", "agenda", "methods", "selected", "doctrine", "theory"]),
    properties: Object.freeze({
      kind: Object.freeze({ const: "knowing.dream.world-method-repertoire" }),
      regime: Object.freeze({ const: "aperiodic" }),
      settles: Object.freeze({ const: false }),
      trajectory: Object.freeze({ type: "object" }),
      agenda: Object.freeze({ type: "object" }),
      methods: Object.freeze({ type: "array" }),
      selected: Object.freeze({ type: "array" }),
      doctrine: Object.freeze({ type: "object" }),
      theory: Object.freeze({ type: "object" }),
    }),
    "x-settlement-filtration": Object.freeze({
      kind: "relating.codomain.settlement-filtration",
      nonTerminatingLoop: true,
      eventStreamPrefix: true,
      cofinality: "countable",
    }),
  }),
  run: (input: unknown): JsonValue => {
    const admitted = admitActionResearchSequenceInput(input as JsonValue, "world-method-repertoire");
    const value = jsonResource(input as JsonValue, "world-method-repertoire input");
    const methodLimit = value !== null && typeof value === "object" && !Array.isArray(value)
      ? optionalNonNegativeInteger((value as JsonRecord)["methodLimit"], "world-method-repertoire: methodLimit")
      : undefined;
    return jsonResource(aperiodicWorldMethodRepertoire({ ...admitted, ...(methodLimit === undefined ? {} : { methodLimit }) }), "world method repertoire");
  },
});

export const worldMethodInterventionPlanAction: Action = action({
  verb: "world-method-intervention-plan",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Turn selected global-historical methods into concrete next-batch observations.",
  description: "Domain: { before, batches, window?, stride?, limit?, candidatesPerWindow?, cycleLimit?, methodLimit? }. Codomain: knowing.dream.world-method-intervention-plan. Selects methods with world-method-repertoire, emits one first-class Observation obligation per selected method, and projects the next action-research-cycle over those observations without terminating the aperiodic loop.",
  domainSchema: Object.freeze({
    type: "object",
    properties: Object.freeze({
      before: Object.freeze({ type: "array" }),
      batches: Object.freeze({ type: "array" }),
      window: Object.freeze({ type: "integer", minimum: 1 }),
      stride: Object.freeze({ type: "integer", minimum: 1 }),
      limit: Object.freeze({ type: "integer", minimum: 0 }),
      candidatesPerWindow: Object.freeze({ type: "integer", minimum: 0 }),
      cycleLimit: Object.freeze({ type: "integer", minimum: 0 }),
      methodLimit: Object.freeze({ type: "integer", minimum: 0 }),
    }),
    required: Object.freeze(["before", "batches"]),
    additionalProperties: true,
  }),
  codomainSchema: Object.freeze({
    $id: "knowing/dreaming/world-method-intervention-plan",
    type: "object",
    required: Object.freeze(["kind", "regime", "settles", "repertoire", "interventions", "after", "projected", "loop", "theory"]),
    properties: Object.freeze({
      kind: Object.freeze({ const: "knowing.dream.world-method-intervention-plan" }),
      regime: Object.freeze({ const: "aperiodic" }),
      settles: Object.freeze({ const: false }),
      repertoire: Object.freeze({ type: "object" }),
      interventions: Object.freeze({ type: "array" }),
      after: Object.freeze({ type: "array" }),
      projected: Object.freeze({ type: "object" }),
      loop: Object.freeze({ type: "object" }),
      theory: Object.freeze({ type: "object" }),
    }),
    "x-settlement-filtration": Object.freeze({
      kind: "relating.codomain.settlement-filtration",
      nonTerminatingLoop: true,
      eventStreamPrefix: true,
      cofinality: "countable",
    }),
  }),
  run: (input: unknown): JsonValue => {
    const admitted = admitActionResearchSequenceInput(input as JsonValue, "world-method-intervention-plan");
    const value = jsonResource(input as JsonValue, "world-method-intervention-plan input");
    const methodLimit = value !== null && typeof value === "object" && !Array.isArray(value)
      ? optionalNonNegativeInteger((value as JsonRecord)["methodLimit"], "world-method-intervention-plan: methodLimit")
      : undefined;
    return jsonResource(aperiodicWorldMethodInterventionPlan({ ...admitted, ...(methodLimit === undefined ? {} : { methodLimit }) }), "world method intervention plan");
  },
});

export const worldMethodFeedbackAction: Action = action({
  verb: "world-method-feedback",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Evaluate which global-historical methods changed the aperiodic frontier.",
  description: "Domain: { before, batches, window?, stride?, limit?, candidatesPerWindow?, cycleLimit?, methodLimit? }. Codomain: knowing.dream.world-method-feedback. Builds a world-method-intervention-plan, tests each selected method's observation through its own action-research-cycle, and adapts method priorities without settling the research loop.",
  domainSchema: Object.freeze({
    type: "object",
    properties: Object.freeze({
      before: Object.freeze({ type: "array" }),
      batches: Object.freeze({ type: "array" }),
      window: Object.freeze({ type: "integer", minimum: 1 }),
      stride: Object.freeze({ type: "integer", minimum: 1 }),
      limit: Object.freeze({ type: "integer", minimum: 0 }),
      candidatesPerWindow: Object.freeze({ type: "integer", minimum: 0 }),
      cycleLimit: Object.freeze({ type: "integer", minimum: 0 }),
      methodLimit: Object.freeze({ type: "integer", minimum: 0 }),
    }),
    required: Object.freeze(["before", "batches"]),
    additionalProperties: true,
  }),
  codomainSchema: Object.freeze({
    $id: "knowing/dreaming/world-method-feedback",
    type: "object",
    required: Object.freeze(["kind", "regime", "settles", "plan", "effects", "adapted", "summary", "loop", "theory"]),
    properties: Object.freeze({
      kind: Object.freeze({ const: "knowing.dream.world-method-feedback" }),
      regime: Object.freeze({ const: "aperiodic" }),
      settles: Object.freeze({ const: false }),
      plan: Object.freeze({ type: "object" }),
      effects: Object.freeze({ type: "array" }),
      adapted: Object.freeze({ type: "array" }),
      summary: Object.freeze({ type: "object" }),
      loop: Object.freeze({ type: "object" }),
      theory: Object.freeze({ type: "object" }),
    }),
    "x-settlement-filtration": Object.freeze({
      kind: "relating.codomain.settlement-filtration",
      nonTerminatingLoop: true,
      eventStreamPrefix: true,
      cofinality: "countable",
    }),
  }),
  run: (input: unknown): JsonValue => {
    const admitted = admitActionResearchSequenceInput(input as JsonValue, "world-method-feedback");
    const value = jsonResource(input as JsonValue, "world-method-feedback input");
    const methodLimit = value !== null && typeof value === "object" && !Array.isArray(value)
      ? optionalNonNegativeInteger((value as JsonRecord)["methodLimit"], "world-method-feedback: methodLimit")
      : undefined;
    return jsonResource(aperiodicWorldMethodFeedback({ ...admitted, ...(methodLimit === undefined ? {} : { methodLimit }) }), "world method feedback");
  },
});

export const worldMethodEcologyAction: Action = action({
  verb: "world-method-ecology",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Audit whether the global-historical method loop has enough variety for the aperiodic frontier.",
  description: "Domain: { before, batches, window?, stride?, limit?, candidatesPerWindow?, cycleLimit?, methodLimit? }. Codomain: knowing.dream.world-method-ecology. Reads world-method-feedback and audits selected methods for requisite variety across regions, periods, next carriers, and feedback assessments, producing obligations when the method ecology collapses toward monoculture.",
  domainSchema: Object.freeze({
    type: "object",
    properties: Object.freeze({
      before: Object.freeze({ type: "array" }),
      batches: Object.freeze({ type: "array" }),
      window: Object.freeze({ type: "integer", minimum: 1 }),
      stride: Object.freeze({ type: "integer", minimum: 1 }),
      limit: Object.freeze({ type: "integer", minimum: 0 }),
      candidatesPerWindow: Object.freeze({ type: "integer", minimum: 0 }),
      cycleLimit: Object.freeze({ type: "integer", minimum: 0 }),
      methodLimit: Object.freeze({ type: "integer", minimum: 0 }),
    }),
    required: Object.freeze(["before", "batches"]),
    additionalProperties: true,
  }),
  codomainSchema: Object.freeze({
    $id: "knowing/dreaming/world-method-ecology",
    type: "object",
    required: Object.freeze(["kind", "regime", "settles", "feedback", "variety", "verdict", "obligations", "loop", "theory"]),
    properties: Object.freeze({
      kind: Object.freeze({ const: "knowing.dream.world-method-ecology" }),
      regime: Object.freeze({ const: "aperiodic" }),
      settles: Object.freeze({ const: false }),
      feedback: Object.freeze({ type: "object" }),
      variety: Object.freeze({ type: "object" }),
      verdict: Object.freeze({ type: "string" }),
      obligations: Object.freeze({ type: "array" }),
      loop: Object.freeze({ type: "object" }),
      theory: Object.freeze({ type: "object" }),
    }),
    "x-settlement-filtration": Object.freeze({
      kind: "relating.codomain.settlement-filtration",
      nonTerminatingLoop: true,
      eventStreamPrefix: true,
      cofinality: "countable",
    }),
  }),
  run: (input: unknown): JsonValue => {
    const admitted = admitActionResearchSequenceInput(input as JsonValue, "world-method-ecology");
    const value = jsonResource(input as JsonValue, "world-method-ecology input");
    const methodLimit = value !== null && typeof value === "object" && !Array.isArray(value)
      ? optionalNonNegativeInteger((value as JsonRecord)["methodLimit"], "world-method-ecology: methodLimit")
      : undefined;
    return jsonResource(aperiodicWorldMethodEcology({ ...admitted, ...(methodLimit === undefined ? {} : { methodLimit }) }), "world method ecology");
  },
});

export const worldMethodBraidAction: Action = action({
  verb: "world-method-braid",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Braid complementary global-historical methods into combined aperiodic interventions.",
  description: "Domain: { before, batches, window?, stride?, limit?, candidatesPerWindow?, cycleLimit?, methodLimit?, braidLimit? }. Codomain: knowing.dream.world-method-braid. Reads world-method-ecology, pairs complementary adapted methods across regions, periods, and next carriers, emits one combined Observation per pair, and projects the next action-research-cycle without settling the loop.",
  domainSchema: Object.freeze({
    type: "object",
    properties: Object.freeze({
      before: Object.freeze({ type: "array" }),
      batches: Object.freeze({ type: "array" }),
      window: Object.freeze({ type: "integer", minimum: 1 }),
      stride: Object.freeze({ type: "integer", minimum: 1 }),
      limit: Object.freeze({ type: "integer", minimum: 0 }),
      candidatesPerWindow: Object.freeze({ type: "integer", minimum: 0 }),
      cycleLimit: Object.freeze({ type: "integer", minimum: 0 }),
      methodLimit: Object.freeze({ type: "integer", minimum: 0 }),
      braidLimit: Object.freeze({ type: "integer", minimum: 0 }),
    }),
    required: Object.freeze(["before", "batches"]),
    additionalProperties: true,
  }),
  codomainSchema: Object.freeze({
    $id: "knowing/dreaming/world-method-braid",
    type: "object",
    required: Object.freeze(["kind", "regime", "settles", "ecology", "pairs", "after", "projected", "loop", "theory"]),
    properties: Object.freeze({
      kind: Object.freeze({ const: "knowing.dream.world-method-braid" }),
      regime: Object.freeze({ const: "aperiodic" }),
      settles: Object.freeze({ const: false }),
      ecology: Object.freeze({ type: "object" }),
      pairs: Object.freeze({ type: "array" }),
      after: Object.freeze({ type: "array" }),
      projected: Object.freeze({ type: "object" }),
      loop: Object.freeze({ type: "object" }),
      theory: Object.freeze({ type: "object" }),
    }),
    "x-settlement-filtration": Object.freeze({
      kind: "relating.codomain.settlement-filtration",
      nonTerminatingLoop: true,
      eventStreamPrefix: true,
      cofinality: "countable",
    }),
  }),
  run: (input: unknown): JsonValue => {
    const admitted = admitActionResearchSequenceInput(input as JsonValue, "world-method-braid");
    const value = jsonResource(input as JsonValue, "world-method-braid input");
    const record = value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
    const methodLimit = optionalNonNegativeInteger(record["methodLimit"], "world-method-braid: methodLimit");
    const braidLimit = optionalNonNegativeInteger(record["braidLimit"], "world-method-braid: braidLimit");
    return jsonResource(aperiodicWorldMethodBraid({
      ...admitted,
      ...(methodLimit === undefined ? {} : { methodLimit }),
      ...(braidLimit === undefined ? {} : { braidLimit }),
    }), "world method braid");
  },
});

export const worldMethodConstellationAction: Action = action({
  verb: "world-method-constellation",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Build a constellation graph over the global-historical method ecology.",
  description: "Domain: { before, batches, window?, stride?, limit?, candidatesPerWindow?, cycleLimit?, methodLimit?, braidLimit? }. Codomain: knowing.dream.world-method-constellation. Reads world-method-braid and builds a graph of selected/adapted methods with braided-complementarity, historical-translation, standpoint-tension, and reciprocity-obligation edges.",
  domainSchema: Object.freeze({
    type: "object",
    properties: Object.freeze({
      before: Object.freeze({ type: "array" }),
      batches: Object.freeze({ type: "array" }),
      window: Object.freeze({ type: "integer", minimum: 1 }),
      stride: Object.freeze({ type: "integer", minimum: 1 }),
      limit: Object.freeze({ type: "integer", minimum: 0 }),
      candidatesPerWindow: Object.freeze({ type: "integer", minimum: 0 }),
      cycleLimit: Object.freeze({ type: "integer", minimum: 0 }),
      methodLimit: Object.freeze({ type: "integer", minimum: 0 }),
      braidLimit: Object.freeze({ type: "integer", minimum: 0 }),
    }),
    required: Object.freeze(["before", "batches"]),
    additionalProperties: true,
  }),
  codomainSchema: Object.freeze({
    $id: "knowing/dreaming/world-method-constellation",
    type: "object",
    required: Object.freeze(["kind", "regime", "settles", "braid", "nodes", "edges", "topology", "obligations", "theory"]),
    properties: Object.freeze({
      kind: Object.freeze({ const: "knowing.dream.world-method-constellation" }),
      regime: Object.freeze({ const: "aperiodic" }),
      settles: Object.freeze({ const: false }),
      braid: Object.freeze({ type: "object" }),
      nodes: Object.freeze({ type: "array" }),
      edges: Object.freeze({ type: "array" }),
      topology: Object.freeze({ type: "object" }),
      obligations: Object.freeze({ type: "array" }),
      theory: Object.freeze({ type: "object" }),
    }),
    "x-settlement-filtration": Object.freeze({
      kind: "relating.codomain.settlement-filtration",
      nonTerminatingLoop: true,
      eventStreamPrefix: true,
      cofinality: "countable",
    }),
  }),
  run: (input: unknown): JsonValue => {
    const admitted = admitActionResearchSequenceInput(input as JsonValue, "world-method-constellation");
    const value = jsonResource(input as JsonValue, "world-method-constellation input");
    const record = value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
    const methodLimit = optionalNonNegativeInteger(record["methodLimit"], "world-method-constellation: methodLimit");
    const braidLimit = optionalNonNegativeInteger(record["braidLimit"], "world-method-constellation: braidLimit");
    return jsonResource(aperiodicWorldMethodConstellation({
      ...admitted,
      ...(methodLimit === undefined ? {} : { methodLimit }),
      ...(braidLimit === undefined ? {} : { braidLimit }),
    }), "world method constellation");
  },
});

export const worldMethodWayfindingAction: Action = action({
  verb: "world-method-wayfinding",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Walk the world-method constellation as an aperiodic event-stream prefix.",
  description: "Domain: { before, batches, window?, stride?, limit?, candidatesPerWindow?, cycleLimit?, methodLimit?, braidLimit?, pathLimit? }. Codomain: knowing.dream.world-method-wayfinding. Builds a world-method-constellation, traverses its method-relation graph with a Sturmian aperiodic step schedule, and emits navigation observations for the next research loop.",
  domainSchema: Object.freeze({
    type: "object",
    properties: Object.freeze({
      before: Object.freeze({ type: "array" }),
      batches: Object.freeze({ type: "array" }),
      window: Object.freeze({ type: "integer", minimum: 1 }),
      stride: Object.freeze({ type: "integer", minimum: 1 }),
      limit: Object.freeze({ type: "integer", minimum: 0 }),
      candidatesPerWindow: Object.freeze({ type: "integer", minimum: 0 }),
      cycleLimit: Object.freeze({ type: "integer", minimum: 0 }),
      methodLimit: Object.freeze({ type: "integer", minimum: 0 }),
      braidLimit: Object.freeze({ type: "integer", minimum: 0 }),
      pathLimit: Object.freeze({ type: "integer", minimum: 0 }),
    }),
    required: Object.freeze(["before", "batches"]),
    additionalProperties: true,
  }),
  codomainSchema: Object.freeze({
    $id: "knowing/dreaming/world-method-wayfinding",
    type: "object",
    required: Object.freeze(["kind", "regime", "settles", "transport", "constellation", "events", "trajectory", "theory"]),
    properties: Object.freeze({
      kind: Object.freeze({ const: "knowing.dream.world-method-wayfinding" }),
      regime: Object.freeze({ const: "aperiodic" }),
      settles: Object.freeze({ const: false }),
      transport: Object.freeze({ const: "event-stream" }),
      constellation: Object.freeze({ type: "object" }),
      events: Object.freeze({ type: "array" }),
      trajectory: Object.freeze({ type: "object" }),
      theory: Object.freeze({ type: "object" }),
    }),
    "x-settlement-filtration": Object.freeze({
      kind: "relating.codomain.settlement-filtration",
      nonTerminatingLoop: true,
      eventStreamPrefix: true,
      cofinality: "countable",
    }),
  }),
  run: (input: unknown): JsonValue => {
    const admitted = admitActionResearchSequenceInput(input as JsonValue, "world-method-wayfinding");
    const value = jsonResource(input as JsonValue, "world-method-wayfinding input");
    const record = value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
    const methodLimit = optionalNonNegativeInteger(record["methodLimit"], "world-method-wayfinding: methodLimit");
    const braidLimit = optionalNonNegativeInteger(record["braidLimit"], "world-method-wayfinding: braidLimit");
    const pathLimit = optionalNonNegativeInteger(record["pathLimit"], "world-method-wayfinding: pathLimit");
    return jsonResource(aperiodicWorldMethodWayfinding({
      ...admitted,
      ...(methodLimit === undefined ? {} : { methodLimit }),
      ...(braidLimit === undefined ? {} : { braidLimit }),
      ...(pathLimit === undefined ? {} : { pathLimit }),
    }), "world method wayfinding");
  },
});

export const frontierAgendaAction: Action = action({
  verb: "frontier-agenda",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Rank aperiodic action-research stream events into next research obligations.",
  description: "Domain: { before, batches, window?, stride?, limit?, candidatesPerWindow?, cycleLimit? }. Codomain: knowing.dream.frontier-agenda. This reads the non-terminating action-research sequence and ranks each cycle by persistent residue, new finite reachability, and remaining lines, producing the next agenda for participatory aperiodic research.",
  domainSchema: Object.freeze({
    type: "object",
    properties: Object.freeze({
      before: Object.freeze({ type: "array" }),
      batches: Object.freeze({ type: "array" }),
      window: Object.freeze({ type: "integer", minimum: 1 }),
      stride: Object.freeze({ type: "integer", minimum: 1 }),
      limit: Object.freeze({ type: "integer", minimum: 0 }),
      candidatesPerWindow: Object.freeze({ type: "integer", minimum: 0 }),
      cycleLimit: Object.freeze({ type: "integer", minimum: 0 }),
    }),
    required: Object.freeze(["before", "batches"]),
    additionalProperties: true,
  }),
  codomainSchema: Object.freeze({
    $id: "knowing/dreaming/frontier-agenda",
    type: "object",
    required: Object.freeze(["kind", "regime", "sequence", "items", "method", "theory"]),
    properties: Object.freeze({
      kind: Object.freeze({ const: "knowing.dream.frontier-agenda" }),
      regime: Object.freeze({ const: "aperiodic" }),
      sequence: Object.freeze({ type: "object" }),
      items: Object.freeze({ type: "array" }),
      method: Object.freeze({ type: "object" }),
      theory: Object.freeze({ type: "object" }),
    }),
  }),
  run: (input: unknown): JsonValue => {
    const admitted = admitActionResearchSequenceInput(input as JsonValue, "frontier-agenda");
    return jsonResource(aperiodicFrontierAgenda(admitted), "frontier agenda");
  },
});

export const researchProgramAuditAction: Action = action({
  verb: "research-program-audit",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Audit whether an aperiodic action-research stream is progressive, open, or degenerating.",
  description: "Domain: { before, batches, window?, stride?, limit?, candidatesPerWindow?, cycleLimit? }. Codomain: knowing.dream.research-program-audit. This applies a Lakatos-style progressive/degenerating problemshift read to the frontier agenda while preserving the aperiodic rule that one finite bridge never terminates the research loop.",
  domainSchema: Object.freeze({
    type: "object",
    properties: Object.freeze({
      before: Object.freeze({ type: "array" }),
      batches: Object.freeze({ type: "array" }),
      window: Object.freeze({ type: "integer", minimum: 1 }),
      stride: Object.freeze({ type: "integer", minimum: 1 }),
      limit: Object.freeze({ type: "integer", minimum: 0 }),
      candidatesPerWindow: Object.freeze({ type: "integer", minimum: 0 }),
      cycleLimit: Object.freeze({ type: "integer", minimum: 0 }),
    }),
    required: Object.freeze(["before", "batches"]),
    additionalProperties: true,
  }),
  codomainSchema: Object.freeze({
    $id: "knowing/dreaming/research-program-audit",
    type: "object",
    required: Object.freeze(["kind", "regime", "agenda", "assessment", "heuristics", "theory"]),
    properties: Object.freeze({
      kind: Object.freeze({ const: "knowing.dream.research-program-audit" }),
      regime: Object.freeze({ const: "aperiodic" }),
      agenda: Object.freeze({ type: "object" }),
      assessment: Object.freeze({ type: "object" }),
      heuristics: Object.freeze({ type: "object" }),
      theory: Object.freeze({ type: "object" }),
    }),
  }),
  run: (input: unknown): JsonValue => {
    const admitted = admitActionResearchSequenceInput(input as JsonValue, "research-program-audit");
    return jsonResource(aperiodicResearchProgramAudit(admitted), "research program audit");
  },
});

export const praxisFeedbackAction: Action = action({
  verb: "praxis-feedback",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Fold post-intervention observations back into aperiodic dreaming and classify what changed.",
  description: "Domain: { before, after, limit? }. Codomain: knowing.dream.praxis-feedback. This closes the theory-practice-theory loop: residue produces interventions, practice adds observations, and the carrier reports which finite regimes became able to reach the former residue and which residue still persists.",
  domainSchema: Object.freeze({
    type: "object",
    properties: Object.freeze({
      before: Object.freeze({ type: "array" }),
      after: Object.freeze({ type: "array" }),
      limit: Object.freeze({ type: "integer", minimum: 0 }),
    }),
    required: Object.freeze(["before", "after"]),
    additionalProperties: true,
  }),
  codomainSchema: Object.freeze({
    $id: "knowing/dreaming/praxis-feedback",
    type: "object",
    required: Object.freeze(["kind", "regime", "before", "after", "effects", "loop"]),
    properties: Object.freeze({
      kind: Object.freeze({ const: "knowing.dream.praxis-feedback" }),
      regime: Object.freeze({ const: "aperiodic" }),
      before: Object.freeze({ type: "object" }),
      after: Object.freeze({ type: "object" }),
      effects: Object.freeze({ type: "array" }),
      loop: Object.freeze({ type: "object" }),
    }),
  }),
  run: (input: unknown): JsonValue => {
    const admitted = admitPraxisFeedbackInput(input as JsonValue);
    return jsonResource(aperiodicPraxisFeedback(admitted), "praxis feedback");
  },
});

/** Build a frozen `DreamResult`: its regime, observations, and their knowledge-joined charge. */
export function dreamResult(regime: DreamRegime, observations: readonly Observation[]): DreamResult {
  return Object.freeze({
    regime,
    observations: Object.freeze([...observations]),
    charge: observations.reduce<ChargeCarrier>((left, obs) => joinKnowledge(left, obs.charge), bottom),
  });
}

function aperiodicResiduePairs(observations: readonly Observation[]): readonly AperiodicResiduePair[] {
  const out: AperiodicResiduePair[] = [];
  for (let i = 0; i < observations.length; i++) {
    for (let j = i + 1; j < observations.length; j++) {
      const left = observations[i]!;
      const right = observations[j]!;
      const reachability = finiteReachability(left, right);
      if (reachability["strict-finite"] || reachability["scott-continuous"] || reachability.transfinite) continue;
      out.push(Object.freeze({
        kind: "knowing.dream.aperiodic-residue-pair" as const,
        left,
        right,
        finiteReachability: reachability,
        strictRegimeExclusions: finiteExclusions(),
      }));
    }
  }
  return Object.freeze(out);
}

function finiteDiscovery(regime: Exclude<DreamRegime, "aperiodic">, result: DreamResult): FiniteDreamDiscovery {
  return Object.freeze({
    kind: "knowing.dream.finite-discovery" as const,
    regime,
    observations: result.observations,
    count: result.observations.length,
  });
}

function aperiodicDiscovery(candidate: AperiodicConjecture): AperiodicDreamDiscovery {
  const unreachableBy: Exclude<DreamRegime, "aperiodic">[] = [];
  if (!candidate.finiteReachability["strict-finite"]) unreachableBy.push("strict-finite");
  if (!candidate.finiteReachability["scott-continuous"]) unreachableBy.push("scott-continuous");
  if (!candidate.finiteReachability.transfinite) unreachableBy.push("transfinite");
  return Object.freeze({
    kind: "knowing.dream.aperiodic-discovery" as const,
    regime: "aperiodic" as const,
    candidate,
    genuinelyNew: true as const,
    unreachableBy: Object.freeze(unreachableBy),
  });
}

function praxisProbesForPair(pair: AperiodicResiduePair, pairIndex: number): readonly AperiodicPraxisProbe[] {
  return Object.freeze([
    praxisProbe(pair, pairIndex * 3, "strict-finite", "strict-chain-probe", strictChainProbe(pair), "strict-chain-created", "Create the missing object-to-subject bridge between the residue pair."),
    praxisProbe(pair, pairIndex * 3 + 1, "scott-continuous", "repeat-cell-probe", repeatCellProbe(pair), "repeat-cell-created", "Create a repeated cell so the pair can be tested by knowledge-join."),
    praxisProbe(pair, pairIndex * 3 + 2, "transfinite", "shared-subject-probe", sharedSubjectProbe(pair), "shared-subject-created", "Create a shared-subject co-predicate so bounded transfinite dreaming can fire."),
  ]);
}

function praxisProbe(
  source: AperiodicResiduePair,
  index: number,
  targetRegime: Exclude<DreamRegime, "aperiodic">,
  probe: AperiodicPraxisProbeKind,
  observation: Observation,
  predictedFeedback: AperiodicPraxisFeedbackEffectKind,
  rationale: string,
): AperiodicPraxisProbe {
  return Object.freeze({
    kind: "knowing.dream.praxis-probe" as const,
    index,
    regime: "aperiodic" as const,
    targetRegime,
    probe,
    source,
    observation,
    predictedFeedback,
    rationale,
  });
}

function strictChainProbe(pair: AperiodicResiduePair): Observation {
  return makeObservation({
    observer: dreamTerm(["observer", "aperiodic"]),
    task: makeTask({
      subject: pair.left.task.object,
      predicate: dreamPredicate(["praxis-probe", mark("strict-chain")]),
      object: pair.right.task.subject,
    }),
    charge: meetKnowledge(pair.left.charge, pair.right.charge),
    note: dreamMark(["praxis-probe", pair.left.task.cell, pair.right.task.cell, mark("strict-chain")]),
  });
}

function repeatCellProbe(pair: AperiodicResiduePair): Observation {
  return makeObservation({
    observer: dreamTerm(["observer", "aperiodic"]),
    task: pair.left.task,
    charge: meetKnowledge(pair.left.charge, pair.right.charge),
    note: dreamMark(["praxis-probe", pair.left.task.cell, pair.right.task.cell, mark("repeat-cell")]),
  });
}

function sharedSubjectProbe(pair: AperiodicResiduePair): Observation {
  return makeObservation({
    observer: dreamTerm(["observer", "aperiodic"]),
    task: makeTask({
      subject: pair.left.task.subject,
      predicate: dreamPredicate(["praxis-probe", mark("shared-subject")]),
      object: pair.right.task.object,
    }),
    charge: meetKnowledge(pair.left.charge, pair.right.charge),
    note: dreamMark(["praxis-probe", pair.left.task.cell, pair.right.task.cell, mark("shared-subject")]),
  });
}

function finiteReachability(left: Observation, right: Observation): FiniteRegimeReachability {
  return Object.freeze({
    "strict-finite": sameTerm(left.task.object, right.task.subject) || sameTerm(right.task.object, left.task.subject),
    "scott-continuous": sameCell(left.task.cell, right.task.cell),
    transfinite: sameTerm(left.task.subject, right.task.subject),
  });
}

function finiteExclusions(): readonly StrictRegimeExclusion[] {
  return Object.freeze([
    Object.freeze({
      regime: "strict-finite" as const,
      reachable: false as const,
      because: "strict-finite dreaming only composes an object-to-subject chain; the residue pair has no such chain in either direction.",
    }),
    Object.freeze({
      regime: "scott-continuous" as const,
      reachable: false as const,
      because: "Scott-continuous dreaming only joins repeated cells; the residue pair occupies distinct cells.",
    }),
    Object.freeze({
      regime: "transfinite" as const,
      reachable: false as const,
      because: "transfinite dreaming only co-predicates observations sharing a subject; the residue pair has distinct subjects.",
    }),
  ]);
}

function praxisIntervention(pair: AperiodicResiduePair, index: number): AperiodicPraxisIntervention {
  return Object.freeze({
    kind: "knowing.dream.praxis-intervention" as const,
    index,
    regime: "aperiodic" as const,
    source: pair,
    lineages: Object.freeze([
      "aperiodic-order",
      "sheaf-contextuality",
      "autopoietic-cognition",
      "south-american-especifismo",
      "critical-pedagogy",
    ] as const),
    reflection: "This pair is not a gap in search effort; it is residue produced by the limits of the finite closure regimes.",
    action: "Make a situated intervention that can change the observation field: create a probe, convene the affected boundary, or build a small carrier that forces the two terms to meet in practice.",
    materialCheck: "After acting, record whether the intervention produced a new chain, repeated cell, shared subject, or persistent residue.",
    feedback: Object.freeze({
      observeAgain: true as const,
      nextCarrier: "knowing.dream.aperiodic-residue" as const,
      loop: "theory-practice-theory" as const,
    }),
  });
}

function praxisFeedbackEffect(
  pair: AperiodicResiduePair,
  index: number,
  afterObservations: readonly Observation[],
): AperiodicPraxisFeedbackEffect {
  const field = Object.freeze([pair.left, pair.right, ...afterObservations]);
  const reachability = Object.freeze({
    "strict-finite": strictFiniteDream(field, { limit: 1 }).observations.length > 0,
    "scott-continuous": scottContinuousDream(field, { limit: 1 }).observations.length > 0,
    transfinite: transfiniteDream(field, { limit: 1 }).observations.length > 0,
  });
  const reachableBy: Exclude<DreamRegime, "aperiodic">[] = [];
  if (reachability["strict-finite"]) reachableBy.push("strict-finite");
  if (reachability["scott-continuous"]) reachableBy.push("scott-continuous");
  if (reachability.transfinite) reachableBy.push("transfinite");
  const effect = praxisFeedbackEffectKind(reachability);
  return Object.freeze({
    kind: "knowing.dream.praxis-feedback-effect" as const,
    index,
    regime: "aperiodic" as const,
    source: pair,
    effect,
    finiteReachability: reachability,
    reachableBy: Object.freeze(reachableBy),
    interpretation: praxisFeedbackInterpretation(effect),
  });
}

function praxisFeedbackEffectKind(reachability: FiniteRegimeReachability): AperiodicPraxisFeedbackEffectKind {
  if (reachability["strict-finite"]) return "strict-chain-created";
  if (reachability["scott-continuous"]) return "repeat-cell-created";
  if (reachability.transfinite) return "shared-subject-created";
  return "persistent-residue";
}

function praxisFeedbackInterpretation(effect: AperiodicPraxisFeedbackEffectKind): string {
  if (effect === "strict-chain-created") return "The intervention created an object-to-subject chain; the former residue is now reachable by strict finite composition.";
  if (effect === "repeat-cell-created") return "The intervention created a repeated cell; the former residue can now be joined as a Scott-continuous consolidation.";
  if (effect === "shared-subject-created") return "The intervention created a shared subject; the former residue can now be explored as a bounded transfinite co-predicate.";
  return "The intervention did not make any finite regime reach the pair; the residue persists as an aperiodic research obligation.";
}

function holographicPraxisIntervention(
  recurrence: AperiodicHologramRecurrence,
  index: number,
): AperiodicHolographicPraxisIntervention {
  return Object.freeze({
    kind: "knowing.dream.holographic-praxis-intervention" as const,
    index,
    regime: "aperiodic" as const,
    recurrence,
    intervention: praxisIntervention(recurrence.source, index),
    organization: Object.freeze({
      method: "social-insertion-through-local-windows" as const,
      target: "recurrent-non-convergent-residue" as const,
      windows: recurrence.windows,
    }),
    feedback: Object.freeze({
      observeAgain: true as const,
      nextCarrier: "knowing.dream.praxis-feedback" as const,
      measure: "local-window-recurrence-after-intervention" as const,
    }),
  });
}

function conjuncturalPraxisLine(
  source: AperiodicHolographicPraxisIntervention,
  index: number,
): AperiodicConjuncturalPraxisLine {
  return Object.freeze({
    kind: "knowing.dream.conjunctural-praxis-line" as const,
    index,
    regime: "aperiodic" as const,
    source,
    analysis: Object.freeze({
      conjuncture: "recurrent-non-convergent-residue" as const,
      correlationOfForces: "finite-regimes-excluded" as const,
      windows: source.organization.windows,
    }),
    strategy: Object.freeze({
      orientation: "social-insertion" as const,
      objective: "change-the-observation-field" as const,
      criterion: "finite-bridge-created-or-persistent-residue-certified" as const,
    }),
    tactics: Object.freeze([
      "create a situated probe inside each recurrent local window",
      "convene the observers whose cuts expose the same residue",
      "build one small carrier that can create a strict chain, repeated cell, or shared subject",
      "record after-observations and run praxis-feedback before declaring settlement",
    ]),
    feedback: Object.freeze({
      nextCarrier: "knowing.dream.praxis-feedback" as const,
      after: "append-situated-observations" as const,
      question: "which finite regime became reachable, if any?" as const,
    }),
  });
}

function actionResearchDelta(
  before: AperiodicConjuncturalPraxis,
  feedback: AperiodicPraxisFeedback,
  after: AperiodicConjuncturalPraxis,
): AperiodicActionResearchCycle["delta"] {
  return Object.freeze({
    strictBridges: feedback.effects.filter((effect) => effect.effect === "strict-chain-created").length,
    scottJoins: feedback.effects.filter((effect) => effect.effect === "repeat-cell-created").length,
    transfiniteCovers: feedback.effects.filter((effect) => effect.effect === "shared-subject-created").length,
    persistentResidues: feedback.effects.filter((effect) => effect.effect === "persistent-residue").length,
    beforeLines: before.lines.length,
    afterLines: after.lines.length,
  });
}

function metastableTrajectoryStep(event: AperiodicActionResearchSequenceEvent): AperiodicMetastableTrajectoryStep {
  const { delta } = event.cycle;
  const integration = delta.strictBridges + delta.scottJoins + delta.transfiniteCovers;
  const segregation = delta.persistentResidues;
  const novelty = integration + Math.max(0, delta.afterLines - delta.beforeLines);
  const drift = Math.abs(delta.afterLines - delta.beforeLines) + event.field.after;
  return Object.freeze({
    kind: "knowing.dream.metastable-trajectory-step" as const,
    index: event.index,
    regime: "aperiodic" as const,
    source: event,
    integration,
    segregation,
    novelty,
    drift,
    recommendation: metastableRecommendation(integration, segregation),
  });
}

function metastableRecommendation(
  integration: number,
  segregation: number,
): AperiodicMetastableTrajectoryStep["recommendation"] {
  if (segregation > 0) return "organize-residue";
  if (integration > 0) return "probe-again";
  return "consolidate-bridge";
}

function metastableNonstationary(steps: readonly AperiodicMetastableTrajectoryStep[]): boolean {
  if (steps.length < 2) return steps.length === 1 && steps[0]!.drift > 0;
  const first = metastableStepSignature(steps[0]!);
  return steps.some((step) => metastableStepSignature(step) !== first || step.drift > 0);
}

function metastableStepSignature(step: AperiodicMetastableTrajectoryStep): string {
  return `${step.integration}/${step.segregation}/${step.novelty}`;
}

function metastableTrajectoryPhase(
  steps: number,
  integration: number,
  segregation: number,
  nonstationary: boolean,
): AperiodicMetastableTrajectoryPhase {
  if (steps === 0) return "quiescent";
  if (integration > 0 && segregation > 0 && nonstationary) return "metastable";
  if (integration > 0 && segregation === 0) return "integrated";
  if (segregation > 0) return "segregated";
  return "quiescent";
}

function metastableNextReason(phase: AperiodicMetastableTrajectoryPhase): string {
  if (phase === "metastable") return "The stream is producing bridges while residue persists; rank the frontier instead of forcing convergence.";
  if (phase === "integrated") return "Finite bridges appeared without persistent residue; re-enter them through agenda so consolidation does not become false settlement.";
  if (phase === "segregated") return "Persistent residue dominates the stream; organize the next situated probe around the recurring obstruction.";
  return "The stream has too little movement; build the next observation batch before judging the program.";
}

function worldMethodsFor(
  trajectory: AperiodicMetastableTrajectory,
  agenda: AperiodicFrontierAgenda,
): readonly AperiodicWorldMethod[] {
  const phase = trajectory.assessment.phase;
  const organize = agenda.items.filter((item) => item.priority === "organize").length;
  const experiment = agenda.items.filter((item) => item.priority === "experiment").length;
  return Object.freeze(worldMethodSpecs()
    .map((method, index) => worldMethod(method, index, phase, organize, experiment, trajectory.assessment.nonstationary))
    .filter((method) => method.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index));
}

function worldMethodIntervention(
  method: AperiodicWorldMethod,
  index: number,
  repertoire: AperiodicWorldMethodRepertoire,
): AperiodicWorldMethodIntervention {
  return Object.freeze({
    kind: "knowing.dream.world-method-intervention" as const,
    index,
    regime: "aperiodic" as const,
    method,
    observation: worldMethodObservation(method, repertoire.trajectory.assessment.phase),
    protocol: Object.freeze({
      read: method.question,
      act: method.intervention,
      verify: method.evidence,
      nextCarrier: method.nextCarrier,
    }),
  });
}

function worldMethodObservation(
  method: AperiodicWorldMethod,
  phase: AperiodicMetastableTrajectoryPhase,
): Observation {
  return makeObservation({
    observer: dreamTerm(["observer", "world-method", mark(method.method)]),
    task: makeTask({
      subject: dreamTerm(["world-method", mark(method.method), mark(phase)]),
      predicate: dreamPredicate(["world-method-intervention"]),
      object: dreamTerm(["world-method-intervention", mark(method.nextCarrier), mark(String(method.score))]),
    }),
    charge: bottom,
    note: dreamMark(["world-method-intervention", mark(method.region), mark(method.period)]),
  });
}

function accumulatedActionResearchField(input: {
  readonly before?: readonly Observation[];
  readonly batches?: readonly (readonly Observation[])[];
  readonly cycleLimit?: number;
}): readonly Observation[] {
  const limit = finiteLimit(input.cycleLimit ?? input.batches?.length ?? 0);
  const out: Observation[] = [...(input.before ?? [])];
  const batches = input.batches ?? [];
  for (let i = 0; i < batches.length && i < limit; i++) out.push(...batches[i]!);
  return Object.freeze(out);
}

function worldMethodFeedbackEffect(
  intervention: AperiodicWorldMethodIntervention,
  index: number,
  before: readonly Observation[],
  input: {
    readonly window?: number;
    readonly stride?: number;
    readonly limit?: number;
    readonly candidatesPerWindow?: number;
  },
): AperiodicWorldMethodFeedbackEffect {
  const cycle = aperiodicActionResearchCycle({
    before,
    after: Object.freeze([intervention.observation]),
    ...(input.window === undefined ? {} : { window: input.window }),
    ...(input.stride === undefined ? {} : { stride: input.stride }),
    ...(input.limit === undefined ? {} : { limit: input.limit }),
    ...(input.candidatesPerWindow === undefined ? {} : { candidatesPerWindow: input.candidatesPerWindow }),
  });
  const assessment = worldMethodAssessment(cycle);
  return Object.freeze({
    kind: "knowing.dream.world-method-feedback-effect" as const,
    index,
    regime: "aperiodic" as const,
    intervention,
    cycle,
    assessment,
    scoreDelta: worldMethodScoreDelta(assessment),
    next: worldMethodNext(assessment),
  });
}

function worldMethodAssessment(cycle: AperiodicActionResearchCycle): AperiodicWorldMethodFeedbackAssessment {
  const bridges = cycle.delta.strictBridges + cycle.delta.scottJoins + cycle.delta.transfiniteCovers;
  if (bridges > 0) return "finite-bridge-created";
  if (cycle.delta.persistentResidues > 0) return "residue-persisted";
  if (cycle.delta.afterLines !== cycle.delta.beforeLines) return "trajectory-shifted";
  return "no-method-signal";
}

function worldMethodScoreDelta(assessment: AperiodicWorldMethodFeedbackAssessment): number {
  if (assessment === "finite-bridge-created") return 4;
  if (assessment === "residue-persisted") return 2;
  if (assessment === "trajectory-shifted") return 1;
  return -2;
}

function worldMethodNext(assessment: AperiodicWorldMethodFeedbackAssessment): AperiodicWorldMethodFeedbackEffect["next"] {
  if (assessment === "finite-bridge-created") return "amplify";
  if (assessment === "residue-persisted") return "repeat";
  if (assessment === "trajectory-shifted") return "hold-open";
  return "retire-for-now";
}

function adaptWorldMethod(effect: AperiodicWorldMethodFeedbackEffect): AperiodicWorldMethod {
  const method = effect.intervention.method;
  return Object.freeze({
    ...method,
    score: Math.max(0, method.score + effect.scoreDelta),
  });
}

function worldMethodRequiredVariety(phase: AperiodicMetastableTrajectoryPhase, selectedMethods: number): number {
  if (selectedMethods === 0) return 4;
  if (phase === "metastable") return Math.min(10, selectedMethods + 4);
  if (phase === "segregated") return Math.min(9, selectedMethods + 3);
  if (phase === "integrated") return Math.min(8, selectedMethods + 2);
  return Math.min(6, selectedMethods + 2);
}

function worldMethodEcologyVerdict(
  selectedMethods: number,
  regions: number,
  effectiveVariety: number,
  requiredVariety: number,
): AperiodicWorldMethodEcologyVerdict {
  if (selectedMethods <= 1 || regions <= 1) return "method-monoculture";
  if (effectiveVariety < requiredVariety) return "under-varied";
  return "requisite-variety";
}

function worldMethodEcologyObligations(
  verdict: AperiodicWorldMethodEcologyVerdict,
  regions: number,
  periods: number,
  nextCarriers: number,
  assessments: number,
): readonly AperiodicWorldMethodEcologyObligation[] {
  const out: AperiodicWorldMethodEcologyObligation[] = [];
  if (verdict !== "requisite-variety") {
    out.push(worldMethodEcologyObligation(
      out.length,
      "add-variety",
      "Which absent region, period, or knowledge tradition should enter the next method repertoire?",
      "knowing.dream.world-method-repertoire",
    ));
  }
  if (regions < 3 || periods < 3) {
    out.push(worldMethodEcologyObligation(
      out.length,
      "preserve-conflict",
      "Which historically distant standpoint should remain in tension with the current selected methods?",
      "knowing.dream.world-method-repertoire",
    ));
  }
  if (nextCarriers < 2 || assessments < 2) {
    out.push(worldMethodEcologyObligation(
      out.length,
      "return-to-field",
      "Which method must be rerun through feedback so the ecology learns from action instead of taxonomy?",
      "knowing.dream.world-method-feedback",
    ));
  }
  return Object.freeze(out);
}

function worldMethodEcologyObligation(
  index: number,
  priority: AperiodicWorldMethodEcologyObligation["priority"],
  question: string,
  nextCarrier: AperiodicWorldMethodEcologyObligation["nextCarrier"],
): AperiodicWorldMethodEcologyObligation {
  return Object.freeze({
    kind: "knowing.dream.world-method-ecology-obligation" as const,
    index,
    regime: "aperiodic" as const,
    priority,
    question,
    nextCarrier,
  });
}

function uniqueCount(values: readonly string[]): number {
  return new Set(values).size;
}

function worldMethodBraidPairs(
  methods: readonly AperiodicWorldMethod[],
  ecology: AperiodicWorldMethodEcology,
  limit: number,
): readonly AperiodicWorldMethodBraidPair[] {
  const candidates: Array<{ left: AperiodicWorldMethod; right: AperiodicWorldMethod; score: number }> = [];
  for (let i = 0; i < methods.length; i++) {
    for (let j = i + 1; j < methods.length; j++) {
      const left = methods[i]!;
      const right = methods[j]!;
      const score = worldMethodComplementarityScore(left, right);
      if (score > 0) candidates.push({ left, right, score });
    }
  }
  candidates.sort((left, right) => right.score - left.score || (right.left.score + right.right.score) - (left.left.score + left.right.score));
  const used = new Set<AperiodicWorldMethodKind>();
  const out: AperiodicWorldMethodBraidPair[] = [];
  for (const candidate of candidates) {
    if (out.length >= limit) break;
    if (used.has(candidate.left.method) || used.has(candidate.right.method)) continue;
    out.push(worldMethodBraidPair(candidate.left, candidate.right, out.length, ecology));
    used.add(candidate.left.method);
    used.add(candidate.right.method);
  }
  return Object.freeze(out);
}

function worldMethodBraidPair(
  left: AperiodicWorldMethod,
  right: AperiodicWorldMethod,
  index: number,
  ecology: AperiodicWorldMethodEcology,
): AperiodicWorldMethodBraidPair {
  const complementarity = Object.freeze({
    regionDifference: left.region !== right.region,
    periodDifference: left.period !== right.period,
    carrierDifference: left.nextCarrier !== right.nextCarrier,
    score: worldMethodComplementarityScore(left, right),
  });
  return Object.freeze({
    kind: "knowing.dream.world-method-braid-pair" as const,
    index,
    regime: "aperiodic" as const,
    left,
    right,
    complementarity,
    question: `How does ${left.method} correct ${right.method}, and what residue survives both?`,
    observation: worldMethodBraidObservation(left, right, complementarity.score, ecology.verdict),
  });
}

function worldMethodComplementarityScore(left: AperiodicWorldMethod, right: AperiodicWorldMethod): number {
  return (left.region === right.region ? 0 : 2)
    + (left.period === right.period ? 0 : 1)
    + (left.nextCarrier === right.nextCarrier ? 0 : 2)
    + Math.abs(left.score - right.score);
}

function worldMethodBraidObservation(
  left: AperiodicWorldMethod,
  right: AperiodicWorldMethod,
  score: number,
  verdict: AperiodicWorldMethodEcologyVerdict,
): Observation {
  return makeObservation({
    observer: dreamTerm(["observer", "world-method-braid", mark(left.method), mark(right.method)]),
    task: makeTask({
      subject: dreamTerm(["world-method-braid", mark(left.method), mark(right.method)]),
      predicate: dreamPredicate(["world-method-braid"]),
      object: dreamTerm(["world-method-braid", mark(verdict), mark(String(score))]),
    }),
    charge: bottom,
    note: dreamMark(["world-method-braid", mark(left.nextCarrier), mark(right.nextCarrier)]),
  });
}

function worldMethodConstellationNode(
  method: AperiodicWorldMethod,
  index: number,
): AperiodicWorldMethodConstellationNode {
  return Object.freeze({
    kind: "knowing.dream.world-method-constellation-node" as const,
    index,
    regime: "aperiodic" as const,
    method,
  });
}

function worldMethodConstellationEdges(
  nodes: readonly AperiodicWorldMethodConstellationNode[],
  braid: AperiodicWorldMethodBraid,
): readonly AperiodicWorldMethodConstellationEdge[] {
  const out: AperiodicWorldMethodConstellationEdge[] = [];
  for (const pair of braid.pairs) out.push(worldMethodConstellationEdge(out.length, "braided-complementarity", pair.left, pair.right, pair.complementarity.score));
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const left = nodes[i]!.method;
      const right = nodes[j]!.method;
      if (hasWorldMethodConstellationEdge(out, left, right)) continue;
      const relation = worldMethodConstellationRelation(left, right);
      if (relation === undefined) continue;
      out.push(worldMethodConstellationEdge(out.length, relation, left, right, worldMethodConstellationWeight(relation, left, right)));
    }
  }
  return Object.freeze(out);
}

function worldMethodConstellationRelation(
  left: AperiodicWorldMethod,
  right: AperiodicWorldMethod,
): AperiodicWorldMethodConstellationRelation | undefined {
  if (left.method === "decolonizing-methodologies" || right.method === "decolonizing-methodologies" || left.method === "kula-reciprocity" || right.method === "kula-reciprocity") {
    return "reciprocity-obligation";
  }
  if (left.region !== right.region && left.period !== right.period) return "historical-translation";
  if (left.nextCarrier === right.nextCarrier && left.region !== right.region) return "standpoint-tension";
  return undefined;
}

function worldMethodConstellationWeight(
  relation: AperiodicWorldMethodConstellationRelation,
  left: AperiodicWorldMethod,
  right: AperiodicWorldMethod,
): number {
  const base = relation === "reciprocity-obligation" ? 4 : relation === "historical-translation" ? 3 : relation === "standpoint-tension" ? 2 : 5;
  return base + Math.abs(left.score - right.score);
}

function worldMethodConstellationEdge(
  index: number,
  relation: AperiodicWorldMethodConstellationRelation,
  left: AperiodicWorldMethod,
  right: AperiodicWorldMethod,
  weight: number,
): AperiodicWorldMethodConstellationEdge {
  return Object.freeze({
    kind: "knowing.dream.world-method-constellation-edge" as const,
    index,
    regime: "aperiodic" as const,
    relation,
    left,
    right,
    weight,
    reason: worldMethodConstellationReason(relation),
  });
}

function worldMethodConstellationReason(relation: AperiodicWorldMethodConstellationRelation): string {
  if (relation === "braided-complementarity") return "The braid selected these methods as a complementary intervention pair.";
  if (relation === "historical-translation") return "The methods come from different regions and historical periods, so their relation must be translated rather than merged.";
  if (relation === "standpoint-tension") return "The methods route toward the same next carrier from different situated standpoints.";
  return "At least one method requires reciprocal accountability to the field before the next cycle.";
}

function hasWorldMethodConstellationEdge(
  edges: readonly AperiodicWorldMethodConstellationEdge[],
  left: AperiodicWorldMethod,
  right: AperiodicWorldMethod,
): boolean {
  return edges.some((edge) => (
    edge.left.method === left.method && edge.right.method === right.method
  ) || (
    edge.left.method === right.method && edge.right.method === left.method
  ));
}

function worldMethodConstellationTopology(
  nodes: readonly AperiodicWorldMethodConstellationNode[],
  edges: readonly AperiodicWorldMethodConstellationEdge[],
): AperiodicWorldMethodConstellation["topology"] {
  const methods = nodes.map((node) => node.method.method);
  const adjacency = new Map<AperiodicWorldMethodKind, Set<AperiodicWorldMethodKind>>();
  for (const method of methods) adjacency.set(method, new Set());
  for (const edge of edges) {
    adjacency.get(edge.left.method)?.add(edge.right.method);
    adjacency.get(edge.right.method)?.add(edge.left.method);
  }
  const visited = new Set<AperiodicWorldMethodKind>();
  let components = 0;
  for (const method of methods) {
    if (visited.has(method)) continue;
    components++;
    const stack = [method];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const next of adjacency.get(current) ?? []) if (!visited.has(next)) stack.push(next);
    }
  }
  const isolates = methods.filter((method) => (adjacency.get(method)?.size ?? 0) === 0).length;
  return Object.freeze({
    components,
    connected: nodes.length === 0 ? true : components <= 1,
    isolates,
    braidedEdges: edges.filter((edge) => edge.relation === "braided-complementarity").length,
    reciprocityEdges: edges.filter((edge) => edge.relation === "reciprocity-obligation").length,
  });
}

function worldMethodConstellationObligations(
  topology: AperiodicWorldMethodConstellation["topology"],
  ecologyObligations: readonly AperiodicWorldMethodEcologyObligation[],
): readonly AperiodicWorldMethodEcologyObligation[] {
  const out = [...ecologyObligations];
  if (!topology.connected) {
    out.push(worldMethodEcologyObligation(
      out.length,
      "preserve-conflict",
      "Which isolated method fragment must be translated into the shared constellation before the next cycle?",
      "knowing.dream.world-method-repertoire",
    ));
  }
  if (topology.reciprocityEdges === 0) {
    out.push(worldMethodEcologyObligation(
      out.length,
      "return-to-field",
      "Which braided method pair must carry a reciprocal return obligation to the field?",
      "knowing.dream.world-method-feedback",
    ));
  }
  return Object.freeze(out);
}

function worldMethodWayfindingEvents(
  constellation: AperiodicWorldMethodConstellation,
  limit: number,
): readonly AperiodicWorldMethodWayfindingEvent[] {
  if (constellation.edges.length === 0 || limit === 0) return Object.freeze([]);
  const events: AperiodicWorldMethodWayfindingEvent[] = [];
  let current = constellation.edges[0]!.left;
  for (let index = 0; index < limit; index++) {
    const step = sturmianStep(index);
    const edge = worldMethodWayfindingEdge(constellation.edges, current, index, step);
    const from = sameWorldMethod(edge.left, current) ? edge.left : edge.right;
    const to = sameWorldMethod(edge.left, current) ? edge.right : edge.left;
    events.push(worldMethodWayfindingEvent(index, edge, from, to, step));
    current = to;
  }
  return Object.freeze(events);
}

function worldMethodWayfindingEdge(
  edges: readonly AperiodicWorldMethodConstellationEdge[],
  current: AperiodicWorldMethod,
  index: number,
  step: "short" | "long",
): AperiodicWorldMethodConstellationEdge {
  const incident = edges.filter((edge) => sameWorldMethod(edge.left, current) || sameWorldMethod(edge.right, current));
  const choices = incident.length > 0 ? incident : edges;
  const stride = step === "long" ? 2 : 1;
  return choices[(index * stride) % choices.length]!;
}

function worldMethodWayfindingEvent(
  index: number,
  edge: AperiodicWorldMethodConstellationEdge,
  from: AperiodicWorldMethod,
  to: AperiodicWorldMethod,
  step: "short" | "long",
): AperiodicWorldMethodWayfindingEvent {
  return Object.freeze({
    kind: "knowing.dream.world-method-wayfinding-event" as const,
    index,
    regime: "aperiodic" as const,
    edge,
    from,
    to,
    step,
    observation: worldMethodWayfindingObservation(index, edge, from, to, step),
    question: `Follow ${edge.relation} from ${from.method} to ${to.method}: what residue changes after this navigation?`,
  });
}

function worldMethodWayfindingObservation(
  index: number,
  edge: AperiodicWorldMethodConstellationEdge,
  from: AperiodicWorldMethod,
  to: AperiodicWorldMethod,
  step: "short" | "long",
): Observation {
  return makeObservation({
    observer: dreamTerm(["observer", "world-method-wayfinding", mark(from.method)]),
    task: makeTask({
      subject: dreamTerm(["world-method-wayfinding", mark(from.method), mark(step)]),
      predicate: dreamPredicate(["world-method-wayfinding"]),
      object: dreamTerm(["world-method-wayfinding", mark(to.method), mark(edge.relation), mark(String(index))]),
    }),
    charge: bottom,
    note: dreamMark(["world-method-wayfinding", mark(sturmianPrefix(index + 1)), mark(edge.reason)]),
  });
}

function sameWorldMethod(left: AperiodicWorldMethod, right: AperiodicWorldMethod): boolean {
  return left.method === right.method;
}

type WorldMethodSpec = Omit<AperiodicWorldMethod, "kind" | "index" | "regime" | "score"> & {
  readonly baseScore: number;
};

function worldMethod(
  spec: WorldMethodSpec,
  index: number,
  phase: AperiodicMetastableTrajectoryPhase,
  organize: number,
  experiment: number,
  nonstationary: boolean,
): AperiodicWorldMethod {
  const phaseFit = spec.fits.includes(phase) ? 4 : phase === "metastable" && spec.fits.includes("segregated") ? 2 : 0;
  const agendaFit = spec.nextCarrier === "knowing.dream.frontier-agenda"
    ? organize + experiment
    : spec.nextCarrier === "knowing.dream.praxis-probes"
      ? experiment + (nonstationary ? 1 : 0)
      : organize;
  return Object.freeze({
    kind: "knowing.dream.world-method" as const,
    index,
    regime: "aperiodic" as const,
    method: spec.method,
    region: spec.region,
    period: spec.period,
    fits: spec.fits,
    score: spec.baseScore + phaseFit + agendaFit,
    question: spec.question,
    intervention: spec.intervention,
    evidence: spec.evidence,
    nextCarrier: spec.nextCarrier,
  });
}

function worldMethodSpecs(): readonly WorldMethodSpec[] {
  return Object.freeze([
    Object.freeze({
      method: "active-inference-epistemic-probing" as const,
      region: "contemporary computational cognitive science",
      period: "late 20th to 21st century",
      fits: Object.freeze(["integrated", "metastable"] as const),
      baseScore: 3,
      question: "Which next observation would most reduce uncertainty about the finite-regime exclusion?",
      intervention: "Select the smallest praxis-probe whose result can distinguish strict-chain, repeat-cell, shared-subject, or persistent-residue feedback.",
      evidence: "A new after-observation changes reachableBy or certifies persistent residue in praxis-feedback.",
      nextCarrier: "knowing.dream.praxis-probes" as const,
    }),
    Object.freeze({
      method: "enactive-autopoiesis" as const,
      region: "Chile and global enactive cognitive science",
      period: "1970s onward",
      fits: Object.freeze(["segregated", "metastable"] as const),
      baseScore: 3,
      question: "Which observer-boundary coupling is reproducing the residue?",
      intervention: "Change the observer/task/environment coupling, then re-enter the changed field as an action-research batch.",
      evidence: "The same residue pair changes recurrence, reachability, or observer distribution after the coupling shift.",
      nextCarrier: "knowing.dream.praxis-feedback" as const,
    }),
    Object.freeze({
      method: "catuskoti-paraconsistency" as const,
      region: "South Asian Buddhist logic and later paraconsistent readings",
      period: "classical antiquity through contemporary logic",
      fits: Object.freeze(["segregated", "metastable"] as const),
      baseScore: 2,
      question: "Does the frontier require holding true, false, both, and neither without explosion?",
      intervention: "Preserve contradictory observations as a four-corner obstruction and ask which finite regime fails when contradiction is held.",
      evidence: "The residue remains meaningful while conflict is retained rather than normalized away.",
      nextCarrier: "knowing.dream.frontier-agenda" as const,
    }),
    Object.freeze({
      method: "ibn-khaldun-asabiyyah" as const,
      region: "Maghrebi historical sociology",
      period: "14th century",
      fits: Object.freeze(["segregated", "metastable"] as const),
      baseScore: 2,
      question: "Which observers have enough shared cohesion to carry the next intervention?",
      intervention: "Group recurrent-window observers by shared residue and route the next probe through the strongest collective carrier.",
      evidence: "The next cycle gains a finite bridge or sharper residue through a specific observer coalition.",
      nextCarrier: "knowing.dream.frontier-agenda" as const,
    }),
    Object.freeze({
      method: "huerta-grande-conjunctural-praxis" as const,
      region: "Uruguay and Latin American especifismo",
      period: "1960s to 1970s",
      fits: Object.freeze(["segregated", "metastable"] as const),
      baseScore: 4,
      question: "What concrete analysis, strategy, tactics, and feedback should organize this residue?",
      intervention: "Turn the ranked agenda item into a situated action-research cycle with an explicit feedback obligation.",
      evidence: "The cycle reports whether the intervention created finite reachability or persistent residue.",
      nextCarrier: "knowing.dream.frontier-agenda" as const,
    }),
    Object.freeze({
      method: "second-order-cybernetics" as const,
      region: "global cybernetics",
      period: "mid 20th century onward",
      fits: Object.freeze(["quiescent", "integrated", "segregated", "metastable"] as const),
      baseScore: 1,
      question: "How is the observer included in the system being observed?",
      intervention: "Treat the observing action itself as the next batch and remeasure trajectory drift.",
      evidence: "The next metastable-trajectory changes because observation changed the observed field.",
      nextCarrier: "knowing.dream.praxis-feedback" as const,
    }),
    Object.freeze({
      method: "yijing-change-pattern" as const,
      region: "ancient Chinese correlative change traditions",
      period: "late first millennium BCE onward",
      fits: Object.freeze(["integrated", "segregated", "metastable"] as const),
      baseScore: 2,
      question: "Which changing line marks the frontier's next transformation rather than its final answer?",
      intervention: "Treat the highest-scoring agenda item as a changing pattern and generate one observation that tests whether the pattern flips, persists, or branches.",
      evidence: "The next cycle changes phase, priority, or recurrence while remaining non-settling.",
      nextCarrier: "knowing.dream.frontier-agenda" as const,
    }),
    Object.freeze({
      method: "polynesian-wayfinding" as const,
      region: "Oceania navigational knowledge systems",
      period: "deep historical practice through contemporary revival",
      fits: Object.freeze(["quiescent", "segregated", "metastable"] as const),
      baseScore: 3,
      question: "Which weak signals can orient action when there is no fixed map of the frontier?",
      intervention: "Use recurrent residue, observer cuts, and drift as steering signs; choose a small next batch that keeps orientation without demanding a settled map.",
      evidence: "The next trajectory preserves directionality through drift rather than requiring global convergence.",
      nextCarrier: "knowing.dream.frontier-agenda" as const,
    }),
    Object.freeze({
      method: "daoist-wuwei-minimal-action" as const,
      region: "classical Chinese Daoist practical philosophy",
      period: "Warring States period onward",
      fits: Object.freeze(["integrated", "segregated", "metastable"] as const),
      baseScore: 2,
      question: "What is the least intervention that lets the field reveal its own next constraint?",
      intervention: "Emit a minimal observation obligation and defer stronger organization until praxis-feedback shows which regime moved.",
      evidence: "A small after-observation changes trajectory phase or finite reachability without overfitting the frontier.",
      nextCarrier: "knowing.dream.praxis-feedback" as const,
    }),
    Object.freeze({
      method: "decolonizing-methodologies" as const,
      region: "Indigenous and anti-colonial research praxis",
      period: "20th century to present",
      fits: Object.freeze(["segregated", "metastable"] as const),
      baseScore: 3,
      question: "Who benefits from this method, and who must be able to contest the observation it creates?",
      intervention: "Treat the next observation as accountable to the affected field rather than extractive evidence for the researcher.",
      evidence: "The next feedback cycle preserves contestability while returning value to the observation community.",
      nextCarrier: "knowing.dream.praxis-feedback" as const,
    }),
    Object.freeze({
      method: "reflective-practice" as const,
      region: "global professional inquiry traditions",
      period: "late 20th century onward",
      fits: Object.freeze(["integrated", "segregated", "metastable"] as const),
      baseScore: 2,
      question: "What did the intervention teach while it was being performed?",
      intervention: "Record the method's own action as an observation and adapt the next cycle from that reflection-in-action.",
      evidence: "The method's feedback changes its future priority rather than being treated as a fixed rule.",
      nextCarrier: "knowing.dream.frontier-agenda" as const,
    }),
    Object.freeze({
      method: "kula-reciprocity" as const,
      region: "Massim / Trobriand exchange anthropology",
      period: "long-running Oceanic practice and early 20th century ethnography",
      fits: Object.freeze(["segregated", "metastable"] as const),
      baseScore: 2,
      question: "What reciprocal obligation keeps the research relation alive across cycles?",
      intervention: "Route the next probe through a return obligation so the field receives a carrier back, not only an extraction.",
      evidence: "The next cycle adds or preserves reciprocal relation while keeping residue auditable.",
      nextCarrier: "knowing.dream.frontier-agenda" as const,
    }),
  ]);
}

function frontierAgendaItem(event: AperiodicActionResearchSequenceEvent): AperiodicFrontierAgendaItem {
  const { delta } = event.cycle;
  const bridges = delta.strictBridges + delta.scottJoins + delta.transfiniteCovers;
  const score = (delta.persistentResidues * 3) + (delta.afterLines * 2) + bridges;
  const priority: AperiodicFrontierAgendaPriority = delta.persistentResidues > 0
    ? "organize"
    : bridges > 0
      ? "experiment"
      : "consolidate";
  return Object.freeze({
    kind: "knowing.dream.frontier-agenda-item" as const,
    index: event.index,
    regime: "aperiodic" as const,
    source: event,
    priority,
    score,
    question: frontierAgendaQuestion(priority),
    next: Object.freeze({
      carrier: "knowing.dream.action-research-cycle" as const,
      reason: frontierAgendaReason(priority),
    }),
  });
}

function frontierAgendaQuestion(priority: AperiodicFrontierAgendaPriority): string {
  if (priority === "organize") return "Which recurrent residue still resists every finite regime after intervention, and who must observe the next cut?";
  if (priority === "experiment") return "Which newly reachable bridge should be probed again before it is mistaken for final settlement?";
  return "Which finite bridge can be stabilized without closing the aperiodic research loop?";
}

function frontierAgendaReason(priority: AperiodicFrontierAgendaPriority): string {
  if (priority === "organize") return "Persistent residue remains the live frontier; organize the next cycle around the local windows where it recurs.";
  if (priority === "experiment") return "The intervention created finite reachability, but the result must be re-entered as a situated experiment.";
  return "Finite reachability dominated this cycle; consolidate it as evidence while keeping the sequence open.";
}

function researchProgramPhase(
  finiteBridges: number,
  persistentResidues: number,
  agendaItems: number,
): AperiodicResearchProgramPhase {
  if (finiteBridges > 0 && agendaItems > 0) return "progressive-problemshift";
  if (persistentResidues > 0 || agendaItems > 0) return "open-problemshift";
  return "degenerating-problemshift";
}

function hologramRecurrences(projections: readonly AperiodicHologramProjection[]): readonly AperiodicHologramRecurrence[] {
  const groups: Array<{ pair: AperiodicResiduePair; windows: number[] }> = [];
  for (const projection of projections) {
    for (const pair of projection.residue.pairs) {
      const group = groups.find((candidate) => sameResiduePair(candidate.pair, pair));
      if (group === undefined) groups.push({ pair, windows: [projection.index] });
      else if (!group.windows.includes(projection.index)) group.windows.push(projection.index);
    }
  }
  return Object.freeze(groups
    .filter((group) => group.windows.length > 1)
    .map((group) => Object.freeze({
      kind: "knowing.dream.aperiodic-hologram-recurrence" as const,
      regime: "aperiodic" as const,
      source: group.pair,
      windows: Object.freeze([...group.windows]),
      finiteReachability: group.pair.finiteReachability,
    })));
}

function hologramPhase(
  projections: readonly AperiodicHologramProjection[],
  recurrences: readonly AperiodicHologramRecurrence[],
): AperiodicHologramPhase {
  const residueWindows = projections.filter((projection) => projection.residue.pairs.length > 0).length;
  if (residueWindows === 0) return "empty";
  if (recurrences.length > 0) return "persistent";
  if (residueWindows > 1) return "motile";
  return "local";
}

function sameResiduePair(left: AperiodicResiduePair, right: AperiodicResiduePair): boolean {
  return (
    sameObservationCell(left.left, right.left) && sameObservationCell(left.right, right.right)
  ) || (
    sameObservationCell(left.left, right.right) && sameObservationCell(left.right, right.left)
  );
}

function sameObservationCell(left: Observation, right: Observation): boolean {
  return sameCell(left.task.cell, right.task.cell);
}

function observerCount(observations: readonly Observation[]): number {
  const observers: PredicationTerm[] = [];
  for (const obs of observations) {
    if (!observers.some((observer) => sameTerm(observer, obs.observer))) observers.push(obs.observer);
  }
  return observers.length;
}

function sturmianStep(index: number): "short" | "long" {
  const alpha = (Math.sqrt(5) - 1) / 2;
  return Math.floor((index + 1) * alpha) - Math.floor(index * alpha) === 0 ? "short" : "long";
}

function sturmianPrefix(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += sturmianStep(i) === "short" ? "S" : "L";
  return out;
}

function finiteLimit(value: number): number {
  if (!Number.isInteger(value) || value < 0) throw new TypeError("aperiodic-dream: limit must be a non-negative integer");
  return value;
}

function optionalNonNegativeInteger(value: JsonValue | undefined, context: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) throw new TypeError(`${context} must be a non-negative integer`);
  return value;
}

function optionalPositiveInteger(value: JsonValue | undefined, context: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) throw new TypeError(`${context} must be a positive integer`);
  return value;
}

function positiveInteger(value: number, context: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new TypeError(`${context} must be a positive integer`);
  return value;
}

function admitObservation(value: JsonValue, verb: string): Observation {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${verb}: each observation must be an object`);
  }
  const record = value as JsonRecord;
  if (record["task"] === undefined || record["charge"] === undefined || record["observer"] === undefined) {
    throw new TypeError(`${verb}: each observation needs observer, task, and charge`);
  }
  const task = record["task"];
  if (task === null || typeof task !== "object" || Array.isArray(task) || (task as JsonRecord)["kind"] !== "knowing.task") {
    throw new TypeError(`${verb}: each observation.task must be a knowing.task`);
  }
  return record as unknown as Observation;
}

function sameTerm(left: PredicationTerm, right: PredicationTerm): boolean {
  return predicationTermIdentity(left, right).kind === "predication.identity:witness";
}

function sameCell(left: Cell, right: Cell): boolean {
  return cellIdentity(left, right).kind === "predication.identity:witness";
}

function dreamTerm(parts: readonly DreamMarkPart[]): PredicationTerm {
  return token(dreamMark(parts));
}

function dreamPredicate(parts: readonly DreamMarkPart[]): PredicationPredicate {
  return predicateOfClaim(claim(dreamMark(parts)));
}

function dreamMark(parts: readonly DreamMarkPart[]): Mark {
  return mark(Object.freeze(["knowing", "dream", ...parts] as const));
}
