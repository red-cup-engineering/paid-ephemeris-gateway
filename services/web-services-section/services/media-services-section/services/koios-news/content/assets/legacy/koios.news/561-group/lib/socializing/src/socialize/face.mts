/**
 * socialize/face — socializing's ACROSS / TRUTH local section over an inter-agent
 * membrane, the boundary face organizing (the bulk) reads instead of faking the across
 * face with a generic relating `descend`.
 *
 * organizing is a holographic BULK over three boundary FACES (socializing = across,
 * computing = inside, gaming = outside; dev/docs/notes/2026-06-21-bulk-over-faces-
 * local-section-threading.md). Each face is a LOCAL SECTION over that faculty's
 * inter-agent membrane, read on one of the three transverse agentive-triad bilattice
 * axes. socializing supplies the ACROSS face on the TRUTH axis (`≤_t` — which way the
 * collective leans; negation antitone): the across reading is the collective's settled
 * DIRECTION over the observer cover.
 *
 * Crucially this is socializing's OWN multi-observer reading, NOT a copy of organizing's
 * generic descend-then-section. The membrane is settled into socializing's Social Field
 * `V : O → Settlings_B` (the multi-observer system — `field.mts`), then its OWN
 * network-sheaf consensus is read off the converged `FieldSection` (`converge.mts` →
 * `consensus.mjs`'s `sheafCharges`, the bilattice-network-sheaf-consensus). The face's
 * thin cover/held/contested are projected off that field section's consensus
 * components and their opposition-H¹, not off a bare descent state:
 *
 *   cover     = the consensus components of the field section over the observer cover
 *               (each a glued common-ground cell of the collective)
 *   held      = the components whose pooled charge is a HELD truth direction
 *               (definite potential/active, or a stable held-contradiction that still
 *               glued) — the cells the collective settles
 *   contested = the components that pooled to `stable` — held truth contradictions
 *               (both witnesses, paraconsistent) — the across-face's contested cells
 *
 * The truth axis enters in how a claim becomes a charge: a denial/negation claim leans
 * `active` (negative, `≤_t`-down), an assertion leans `potential` (positive, `≤_t`-up),
 * so two observers asserting and denying the SAME subject become `opposed` on the truth
 * axis (negation antitone) — exactly the across-face direction reading. This is grounded
 * in the agentive-triad's truth axis (content/_archive predication-categories truth.md;
 * Avron twist-product) and socializing's own consensus module.
 *
 * Dependency: this is a LEAF over relating + the package's own modules. It does NOT
 * import @emsenn/organizing (the bulk). organizing imports THIS.
 */
import {
  charge,
  chargeValue,
  fourCensus,
  truthAggregateOfCensus,
  valueOf,
  type ChargeCarrier,
  type ChargeValueName,
  type JsonRecord,
  type UtteranceCarrier,
} from "@emsenn/relating";
import { bigradedCohomology } from "@emsenn/relating/settling";

import {
  completeTranslations,
  ungroundedSection,
  type Field,
  type FieldMember,
  type FieldSection,
} from "./field.mjs";
import { convergeAction } from "./converge.mjs";

/** The axis this face reads — the agentive-triad TRUTH axis (`≤_t`, negation antitone). */
export const SOCIALIZING_FACE_AXIS = "truth" as const;

/** The truth-axis FOUR census of the field section's consensus components, read as
 *  ADJUDICATION's disciplines (the receiving-dual reading the organizing bulk consolidates;
 *  content/_archive adjudication.md): the smallest bilattice FOUR's four canonical values —
 *  ⊥ told-nothing = held OPEN (silence ≠ denial, the partial-information discipline), t
 *  told-true = held for, f told-false = held against, ⊤ told-both = held CONTESTED (the
 *  conflict discipline, paraconsistent — kept live, not collapsed). The census partitions
 *  the cover; `held` = potential+active+stable, `contested` = stable. */
export interface SocialTruthBelnap {
  /** ⊥ held OPEN — no observer contributed a direction at this component (silence, not denial). */
  readonly absurd: number;
  /** t held FOR — the collective's pooled direction leans potential (≤_t-up / asserted). */
  readonly potential: number;
  /** f held AGAINST — the collective's pooled direction leans active (≤_t-down / denied). */
  readonly active: number;
  /** ⊤ held CONTESTED — components pooled to stable: both asserted and denied, kept live. */
  readonly stable: number;
}

/**
 * The BIGRADED COMMON-KNOWLEDGE reading the collective achieves — socializing's REAL
 * multi-observer work (now that the census/aggregate math is upstream in relating, the face
 * does this). Consensus does NOT produce one common-knowledge fixed point but TWO structurally
 * distinct ones (content/…/bigraded-diamond/…/consensus-achieves-bigraded-common-knowledge.md,
 * via the bigraded-common-knowledge theorem):
 *   - C^t — the value/direction the collective COMMONLY KNOWS it has decided (agreement-on-VALUE,
 *     the truth-axis fixed point = the H⁰ global section).
 *   - C^k — the witness the collective COMMONLY HOLDS (agreement-on-WITNESS, the knowledge-axis
 *     fixed point = the propagated accumulation).
 * They are GENERICALLY DISTINCT, and they diverge EXACTLY at the paraconsistent ⊤ cells (a
 * member that received both p and ¬p) — which is the bigraded contradiction row F^(⊤). So the
 * reading is PARAMETERIZED from relating's `bigradedCohomology`: when F^(⊤)=0 the bigrading
 * collapses and the two axes COINCIDE (full common knowledge on both); otherwise they diverge
 * (the split-brain / learner-lag regime). `agree` ⟺ the degenerate case the theorem isolates.
 */
export interface BigradedCommonKnowledge {
  /** whether C^t and C^k COINCIDE — the collective reaches common knowledge on both axes at once
   *  (no paraconsistent observer; the bigrading collapses, F^(⊤)=0). */
  readonly agree: boolean;
  /** the agreement-on-VALUE row F^(t): components the collective commonly knows a direction on. */
  readonly value: number;
  /** the cells where C^t and C^k DIVERGE — the held ⊤ contradictions F^(⊤) (a member told both),
   *  the substrate surface of split-brain / learner-lag. */
  readonly divergence: number;
}

/**
 * socializing's SWARM-coordination reading — its real swarm-intelligence work: socializing
 * is a STIGMERGIC multi-observer system. In stigmergy (Bonabeau–Dorigo–Theraulaz; ant
 * pheromone fields, drone swarms), agents coordinate INDIRECTLY through a shared environment
 * field — not by pairwise messaging — and this DECOUPLES the coordination cost (content/…/
 * swarm/swarm-intelligence/stigmergy/stigmergy-decouples-coordination-cost.md, proved): the
 * per-step cost is O(N + |L|) (linear in agents N + field size |L|), with NO O(N²) inter-agent
 * term, vs the orchestrated (pairwise / orchestrator) regime's O(N²). socializing's Social
 * Field IS that stigmergic trace field: observers deposit their charged memes into the shared
 * field and the consensus is read off the CONVERGED field section — never off O(N²) observer
 * pairs. That is why a swarm scales to millions of agents where orchestrated multi-agent LLM
 * systems saturate at ~4 (saturation-threshold). Here N = `observers`, |L| = the field's cover
 * cells; the reading exposes the linear stigmergic cost socializing pays and the quadratic
 * orchestrated cost it AVOIDS.
 */
export interface SwarmCoordination {
  /** coordination is STIGMERGIC — field-mediated (the Social Field is the shared trace field),
   *  not pairwise. True for socializing: consensus is read off the converged field section. */
  readonly stigmergic: boolean;
  /** the per-step STIGMERGIC cost O(N + |L|) = observers + field cover cells — linear, no O(N²) term. */
  readonly cost: number;
  /** the per-step ORCHESTRATED cost O(N²) = the N-choose-2 pairwise observer comparisons socializing
   *  AVOIDS by coordinating through the field (the decoupling: orchestratedCost ≥ cost, ≫ at scale). */
  readonly orchestratedCost: number;
}

/**
 * socializing's ACROSS / TRUTH local section over an inter-agent membrane. The thin
 * triple { cover, held, contested } is what organizing's `Face` contract requires
 * (integers ≥ 0); the thick fields expose the field section it was read from so the
 * across direction is inspectable.
 */
export interface SocializingFace {
  readonly kind: "socializing.face";
  readonly faculty: "socializing";
  readonly direction: "across";
  readonly axis: typeof SOCIALIZING_FACE_AXIS;
  /** cells of the local section over the observer cover — the consensus components. */
  readonly cover: number;
  /** cells the collective holds — components with a held truth direction. */
  readonly held: number;
  /** stable / held-contradiction cells — components pooled to `stable`. */
  readonly contested: number;
  /** observers admitted from the membrane (the observer category `O`'s objects). */
  readonly observers: number;
  /** the opposition-H¹: a cycle of opposed truth directions; 0 ⟺ the across face glues. */
  readonly obstruction: number;
  /** δ⁰ = 0 — the local sections glue with no coordination (which-way agreement). */
  readonly leans: boolean;
  /** socializing's collective LEAN DIRECTION on the truth order ≤_t (the ∨_t join over the
   *  consensus components, DUAL to the inside face's ≤_k accumulation, negation-ANTITONE): the
   *  scale-2 mirror of communicating's `lean`. `potential` the collective leans FOR, `active`
   *  leans AGAINST, `stable` polarized (told-both wins), `absurd` no lean. Where `leans` (the
   *  boolean) says WHETHER the field glues coordination-free, `lean` says which WAY it leans.
   *  Parameterized from relating's `truthAggregateOfCensus`. */
  readonly lean: ChargeValueName;
  /** the truth-axis FOUR census (adjudication's disciplines) of the consensus components —
   *  the thick reading the organizing bulk consolidates onto its Face. */
  readonly belnap: SocialTruthBelnap;
  /** socializing's REAL multi-observer work: the bigraded common-knowledge the collective
   *  achieves — whether agreement-on-value (C^t) and agreement-on-witness (C^k) coincide or
   *  diverge (parameterized from relating's bigraded cohomology over the census). */
  readonly commonKnowledge: BigradedCommonKnowledge;
  /** socializing's SWARM-coordination reading: the stigmergic (field-mediated) coordination
   *  and the cost decoupling — the linear O(N+|L|) cost it pays vs the O(N²) it avoids. */
  readonly coordination: SwarmCoordination;
  /** the converged field section the thin reading was projected from (thick). */
  readonly section: FieldSection;
}

/** The stigmergic coordination reading: socializing coordinates through its Social Field (the
 *  shared trace field), so the per-step cost is the linear O(N + |L|) = observers + cover, and
 *  the O(N²) pairwise (orchestrated) cost is AVOIDED. Grounded in stigmergy-decouples-
 *  coordination-cost.md. */
function coordinationOf(observers: number, cover: number): SwarmCoordination {
  return Object.freeze({
    stigmergic: true, // socializing's consensus is read off the converged field section, not observer pairs
    cost: observers + cover, // O(N + |L|): the linear stigmergic per-step cost
    orchestratedCost: (observers * (observers - 1)) / 2, // O(N²): the pairwise cost it avoids
  });
}

/** Read the bigraded common-knowledge the collective achieves off its truth-axis census,
 *  PARAMETERIZED from relating's `bigradedCohomology`: C^t and C^k coincide (the bigrading
 *  collapses) iff there is no paraconsistent ⊤ component; the ⊤ components are where the two
 *  axes diverge (the split-brain / learner-lag substrate surface). */
function commonKnowledgeOf(belnap: SocialTruthBelnap): BigradedCommonKnowledge {
  const decomposition = bigradedCohomology(belnap);
  return Object.freeze({
    agree: decomposition.collapse.kind === "predication.bigradedCohomology.collapse:witness",
    value: decomposition.truth,
    divergence: decomposition.contradiction,
  });
}

/** The truth direction a membrane claim leans: a denial leans `active` (negative,
 *  `≤_t`-down); an assertion leans `potential` (positive, `≤_t`-up). Negation antitone:
 *  the same subject asserted vs denied becomes opposed on the truth axis. The denial is
 *  detected at the claim boundary (leading negation marker or a `false`/`no` payload). */
function truthCharge(claimValue: unknown): ChargeCarrier {
  const text = typeof claimValue === "string" ? claimValue.trim() : String(claimValue);
  const denied = claimValue === false
    || /^(not|no|never|¬|!|-)\b/i.test(text)
    || /^¬|^!/.test(text);
  return charge(chargeValue(denied ? "active" : "potential"));
}

/** The bare subject a claim is about, with any leading negation marker stripped — so an
 *  assertion and its denial land on the SAME cell (and are read as opposed there). */
function claimSubject(claimValue: unknown): string {
  const text = typeof claimValue === "string" ? claimValue.trim() : String(claimValue);
  return text.replace(/^(not|no|never)\b\s*/i, "").replace(/^[¬!\-]\s*/, "").trim() || text;
}

/**
 * Settle a membrane (`readonly UtteranceCarrier[]`) into socializing's Social Field:
 * each distinct observer (an utterance's `token`) becomes an observer `o ∈ O` carrying,
 * as its local memes, the truth-charges of the claims it uttered (cell = the claim's
 * bare subject). The observer category `O` is taken maximally connected (every observer
 * compared with every other) so the across reading is the WHOLE collective's direction.
 */
export function membraneField(membrane: readonly UtteranceCarrier[]): Field {
  const byObserver = new Map<string, JsonRecord[]>();
  const order: string[] = [];
  for (const carrier of membrane) {
    const observer = String(carrier.token.mark.value);
    const subject = claimSubject(carrier.claim.mark.value);
    let memes = byObserver.get(observer);
    if (memes === undefined) {
      memes = [];
      byObserver.set(observer, memes);
      order.push(observer);
    }
    memes.push(Object.freeze({
      kind: "communicating.meme",
      cell: subject,
      charge: truthCharge(carrier.claim.mark.value) as unknown as JsonRecord,
    }) as JsonRecord);
  }

  const members: readonly FieldMember[] = order.map((observer) => Object.freeze({
    kind: "socializing.member" as const,
    agent: Object.freeze({ kind: "animating.agent", name: observer }),
    memes: Object.freeze(byObserver.get(observer)!),
  }));

  return Object.freeze({
    kind: "socializing.social-field" as const,
    members: Object.freeze(members),
    base: Object.freeze({
      kind: "socializing.social-base" as const,
      translations: completeTranslations(members.length),
    }),
    section: ungroundedSection(),
  });
}

/** A component pooled to `stable` (`⊤`) — a HELD truth contradiction (both witnesses,
 *  paraconsistent). The across-face's contested cell. */
function isStable(pooled: JsonRecord): boolean {
  const c = pooled as unknown as ChargeCarrier;
  return valueOf(c).name === "stable";
}

/** A component the collective HOLDS: its pooled charge carries a settled truth direction
 *  — a definite potential/active lean, or a stable held-contradiction that still glued.
 *  An `absurd` (⊥, no observer contributed) component is not held. */
function isHeld(pooled: JsonRecord): boolean {
  const c = pooled as unknown as ChargeCarrier;
  return valueOf(c).name !== "absurd";
}

/**
 * socializingFace — socializing's ACROSS / TRUTH local section over an inter-agent
 * membrane, for the organizing bulk to glue. Settles the membrane into socializing's
 * Social Field and reads the across direction off its OWN converged consensus section
 * (network-sheaf consensus over the observer cover), NOT a generic descend.
 *
 * The thin { cover, held, contested } the bulk requires is projected off the field
 * section's consensus components: cover = the components (cells of the local section),
 * held = the components holding a truth direction, contested = the components pooled to
 * `stable` (held contradictions). Total over membranes; the empty membrane is the empty
 * across face (all zero, ungrounded section).
 */
export function socializingFace(membrane: readonly UtteranceCarrier[]): SocializingFace {
  const field = membraneField(membrane);
  if (field.members.length === 0) {
    return Object.freeze({
      kind: "socializing.face" as const,
      faculty: "socializing" as const,
      direction: "across" as const,
      axis: SOCIALIZING_FACE_AXIS,
      cover: 0,
      held: 0,
      contested: 0,
      observers: 0,
      obstruction: 0,
      leans: true,
      lean: "absurd",
      belnap: Object.freeze({ absurd: 0, potential: 0, active: 0, stable: 0 }),
      commonKnowledge: Object.freeze({ agree: true, value: 0, divergence: 0 }),
      coordination: Object.freeze({ stigmergic: true, cost: 0, orchestratedCost: 0 }),
      section: ungroundedSection(),
    });
  }

  // convergeAction returns the converged social-field carrier directly (jsonResource is
  // the round-tripped value, not a { resource } envelope).
  const converged = convergeAction.run(field as unknown as JsonRecord, {}) as unknown as Field;
  const section = converged.section;
  const components = section.components;

  // The truth-axis FOUR census is PARAMETERIZED from relating's proof-tree `fourCensus` over
  // the consensus components' pooled charges. `held` = the settled truth directions (non-absurd);
  // `contested` = the stable held-contradictions (⊤).
  const belnap: SocialTruthBelnap = fourCensus(components.map((component) => valueOf(component.pooled as unknown as ChargeCarrier)));
  const held = belnap.potential + belnap.active + belnap.stable;
  const contested = belnap.stable;

  return Object.freeze({
    kind: "socializing.face" as const,
    faculty: "socializing" as const,
    direction: "across" as const,
    axis: SOCIALIZING_FACE_AXIS,
    cover: components.length,
    held,
    contested,
    observers: field.members.length,
    obstruction: section.obstruction,
    leans: section.coordinationFree,
    lean: truthAggregateOfCensus(belnap),
    belnap,
    commonKnowledge: commonKnowledgeOf(belnap),
    coordination: coordinationOf(field.members.length, components.length),
    section,
  });
}
