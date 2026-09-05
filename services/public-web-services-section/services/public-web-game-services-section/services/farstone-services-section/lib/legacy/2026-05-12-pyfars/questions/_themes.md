---
title: "Question themes — index by axis"
type: index
status: active
---

# Question themes

The questions in this directory cluster along seven axes.
The axes are not exclusive — many questions could be filed under two or three — but each is filed under the axis it most directly *shapes*.
Cross-references are noted inline.

When the cascade advances a milestone, the records officer applies [`applying-roadmap-enrichment`](../governance/skills/applying-roadmap-enrichment.md) and consults the relevant axis below for goal-derivation seeds.
Cross-cutting axes (theory-API, governance-architecture, polity-web) don't bind to a single milestone and may produce concept records, governance updates, or roadmap-lateral work items rather than goals.

## Theory-API & substrate-runtime invariants

Cross-cutting questions about the substrate's internal logic, closure-runner discipline, and category-theoretic invariants.
These don't bear on a single milestone — they shape the substrate's *operational vocabulary* across milestones.

- [`two-internal-logics-as-substrate-query-api`](two-internal-logics-as-substrate-query-api.md) — exposing the predication hyperdoctrine's two internal logics as a substrate query API.
  Spans M2/M3/M4/M5.
- [`closure-2-monad-lax-idempotence-and-runner-invariants`](closure-2-monad-lax-idempotence-and-runner-invariants.md) — exploiting Kock-Zöberlein lax-idempotence to short-circuit redundant settling.
  Spans M2/M3.
- [`four-regime-classification-as-rule-metadata`](four-regime-classification-as-rule-metadata.md) — exposing closure-rule regime classification as substrate-cell metadata.
  Threaded into M3.
- [`quantifier-adjoints-and-aggregate-workitems`](quantifier-adjoints-and-aggregate-workitems.md) — realizing aggregate workitems via quantifier-adjoint structure on work fibers.
  Spans M2/M5.
- [`beck-chevalley-as-substrate-invariant-for-jurisdiction-and-shard-moves`](beck-chevalley-as-substrate-invariant-for-jurisdiction-and-shard-moves.md) — verifying Beck–Chevalley commutation when assignment cells move across jurisdictions/shards.
  Threaded into M6.
- [`witness-emission-codepath-uniformity`](witness-emission-codepath-uniformity.md) — surface-invariance of the cell-write codepath across hook, MCP, and in-process callers.
  Threaded into M1/M5/M8.

## Operations loop & determinism (M3-tier)

Questions sharpening the [M3](../work/milestones/m3-continuous-loop.md) continuous-loop framing — replay-determinism, runtime caps, anomaly-handling.

- [`operations-causal-settling-and-loop-determinism`](operations-causal-settling-and-loop-determinism.md) — replay-determinism under the Lorentzian causal frame.
  Threaded into M3.
- [`saturation-threshold-and-bounded-entropy-as-runtime-caps`](saturation-threshold-and-bounded-entropy-as-runtime-caps.md) — ~4-agent saturation and bounded-local-rule-entropy as substrate runtime caps.
  Threaded into M3 and M4.
- [`graceful-degradation-as-substrate-resident-lifecycle-policy`](graceful-degradation-as-substrate-resident-lifecycle-policy.md) — graceful-degradation states as a substrate-resident lifecycle policy.
  Threaded into M3.
- [`masft-failure-mode-taxonomy-as-substrate-anomaly-classes`](masft-failure-mode-taxonomy-as-substrate-anomaly-classes.md) — encoding the MASFT 14-failure-mode taxonomy as substrate-resident anomaly classes.
  Bears on M3 (anomaly-surfacing-via-contradiction-cells) and M11.

## Memory feedback & learning (M4–M5-tier)

Questions sharpening [M4](../work/milestones/m4-memory-feedback.md) and [M5](../work/milestones/m5-agential-self-generation.md) — observation-instinct cycles, agent learning, session continuity.

- [`stigmergy-as-substrate-feedback-channel`](stigmergy-as-substrate-feedback-channel.md) — memory-feedback as a stigmergic cell-update layer.
  Threaded into M4.
- [`conduct-teachings-as-instinct-evaluation`](conduct-teachings-as-instinct-evaluation.md) — conduct-teaching predicates as a pre-tally eligibility gate in selection.
  Threaded into M4.
- [`handoff-cobordism-and-cross-session-continuity`](handoff-cobordism-and-cross-session-continuity.md) — cross-session continuity as handoff-cobordism.
  Threaded into M4.
- [`ctde-as-substrate-snapshot-training-pattern`](ctde-as-substrate-snapshot-training-pattern.md) — Centralized Training, Decentralized Execution with substrate as global critic.
  Spans M4/M5.

## Federation & coordination (M6-tier)

Questions sharpening [M6](../work/milestones/m6-federation.md) — the densest cluster, because federation admits the most theory-API choices.

- [`distributed-coordination-primitives-for-federation`](distributed-coordination-primitives-for-federation.md) — DCP primitives layered above cellwise merge.
  Threaded into M6.
- [`algebraic-connectivity-as-federation-convergence-metric`](algebraic-connectivity-as-federation-convergence-metric.md) — $\lambda_2(L)$ as substrate-resident convergence-rate metric.
  Threaded into M6.
- [`event-triggered-synchronization-for-federation-envelopes`](event-triggered-synchronization-for-federation-envelopes.md) — Lyapunov-style event-triggered envelope shipping.
  Threaded into M6.
- [`w-msr-byzantine-filter-at-federation-merge`](w-msr-byzantine-filter-at-federation-merge.md) — W-MSR Byzantine filtering at the merge boundary.
  Threaded into M6.
- [`consensus-as-h0-construction-as-substrate-primitive`](consensus-as-h0-construction-as-substrate-primitive.md) — consensus-as-$H^0$ as the unifying primitive for charter ratification, federation merge, multi-witness completion.
  Spans M6/M11; structural for the governance arc.
- [`coordination-bounded-by-h1-as-protocol-simplicity-cap`](coordination-bounded-by-h1-as-protocol-simplicity-cap.md) — $H^n = 0\ (n \geq 2)$ as substrate-engineering simplicity cap.
  Spans M6/M11.
- [`federated-learning-model-deltas-vs-raw-data-for-federation`](federated-learning-model-deltas-vs-raw-data-for-federation.md) — FedAvg model-delta discipline → closure-rule-deltas under bandwidth pressure.
  Bears on M6.

## Embodied deployment & safety-shield (M9–M12-tier)

Questions sharpening the embodied-deployment arc.

- [`hj-reachability-and-cbf-as-substrate-precheck-primitive`](hj-reachability-and-cbf-as-substrate-precheck-primitive.md) — generalizing M9's safety-shield to a substrate-precheck primitive for any high-stakes operation.
  Threaded into M9.
- [`predicated-drone-swarm-theory-as-theory-gap`](predicated-drone-swarm-theory-as-theory-gap.md) — authoring a predicated-drone-swarm theory before M9–M12 ship.
  Threaded into M9; *theory-gap question* — answering is a precondition for M9–M12 advancing.
- [`formation-control-rigidity-as-substrate-shape-invariant`](formation-control-rigidity-as-substrate-shape-invariant.md) — formation-control / rigidity-theory as the language for substrate-shape invariants.
  Spans M9/M11.

## Audit & assurance (M11-tier)

Questions sharpening [M11](../work/milestones/m11-assurance-audit-chain-export.md).

- [`cech-cocycle-audit-as-m11-primitive`](cech-cocycle-audit-as-m11-primitive.md) — Čech-1-cochain evaluation as the audit primitive.
  Threaded into M11.
- [`accountability-chain-totality-as-m11-audit-invariant`](accountability-chain-totality-as-m11-audit-invariant.md) — enforcing accountability-chain totality (one human principal per outcome) as audit-export invariant.
  Threaded into M11.

## Governance architecture (orthogonal)

Questions about the governance layer's *form* — Hohfeldian vs kinship vs restorative — that don't bear on a single engineering milestone but rather on existing governance records.

- [`kinship-substrate-for-561-polity`](kinship-substrate-for-561-polity.md) — encoding governing-by-kinship given 561's framing as a polity for Black Liberation and Indigenous Sovereignty.
- [`rotational-authority-for-pyfars-offices`](rotational-authority-for-pyfars-offices.md) — office incumbency rotation through eligible personnel rather than permanent appointment.
- [`restorative-vs-retributive-violation-response`](restorative-vs-retributive-violation-response.md) — restorative-accountability framing for substrate-violation response.
- [`consensus-closure-for-governing-offices`](consensus-closure-for-governing-offices.md) — modeling parallel governing offices as consensus-closure rather than civilian-pluralism.
- [`seventh-generation-projection-and-pyfars-regime`](seventh-generation-projection-and-pyfars-regime.md) — lifting Γ generative mechanism to transfinite-bounded via seventh-generation projection.

These warrant a **governance-architecture review** rather than per-milestone threading.
They cluster: each questions whether PyFARS's current Hohfeldian / Markov-aggregating / retributive-implicit governance shape is the right one for 561's stated commitments.
A [review](../work/reviews/) would gather them, assess together, and produce findings that update [`governance/`](../governance/) accordingly.

## Polity web presence (orthogonal, near-term)

Questions about the live 561.group web presence — distinct from the M1–M12 engine arc but operationally near-term (the site is serving today, per memory).

- [`polity-context-for-web-app`](polity-context-for-web-app.md) — disambiguating which polity the web app serves when multiple polities exist in the corpus.
- [`polity-homepage-as-public-projection`](polity-homepage-as-public-projection.md) — realizing the polity homepage as a derived practice rather than an artifact.
- [`public-fiber-field-vocabulary-vs-closure-rules`](public-fiber-field-vocabulary-vs-closure-rules.md) — aligning the public-fiber specification (closure under public-licit) with the practice (specific frontmatter fields by name).

These are coherent enough to warrant a **polity-web brief** the captain can use to direct near-term work.
Currently they live as orthogonal to the engine roadmap; if they accumulate further questions or the captain prioritizes the public-projection axis, a small lateral milestone (`MW1 — Polity public projection`?) becomes appropriate. **Per memory feedback "561 — don't invent adjacent scope"**, the records officer does not propose this milestone unilaterally; this themes index merely surfaces the cluster.

## Reading this index

- **For a cascade-advance** (a milestone moving from `later` to `soon` or `soon` to `doing`): consult the axis matching the milestone, identify questions threaded there, and use them as goal-derivation seeds.
- **For governance-architecture work**: review the *Governance architecture* axis; this is more likely to fire when the captain has reading capacity than when engineering work is in flight.
- **For an open-ended captain question** ("what are we missing?"): the *Theory-API* and *Polity web* axes contain the most substrate-orthogonal material; they're where new directions tend to surface.

A question moves out of this index when it resolves: per [`questions/_index.md`](_index.md), resolution dissolves the question note and produces a claim, object, or decision elsewhere.
The index removes the entry as part of resolution.
