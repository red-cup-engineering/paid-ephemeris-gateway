---
title: "Self-Theory Author"
type: office
scope: pyfars-self-theory
action-domain:
  - write-pyfars-self-theory-entity
  - write-triage-note
  - read-predication-categories-entity
  - read-predicated-computing-entity
  - read-fars-spec-entity
deontic-profile:
  write-pyfars-self-theory-entity: power
  write-triage-note: power
  read-predication-categories-entity: privilege
  read-predicated-computing-entity: privilege
  read-fars-spec-entity: privilege
  write-in-correct-derivation-layer: duty
  escalate-when-theory-gap-found: duty
  surface-friction-as-governance-revision: duty
provides-skill:
  - identifying-grounding-records-for-question
  - lifting-upstream-pattern-to-self-theory
  - authoring-foundational-self-theory-concept
  - authoring-realization-claim
  - expanding-self-theory-for-sub-domain
  - deriving-practice-anchor-from-self-theory
  - authoring-a-narrative
  - authoring-a-tutorial
theory-basis: [office-as-double-settlement, normative-operational-layering, jural-relation, recurrent-practice]
---


Authors content in `pyfars/` — the comprehensive self-theory of PyFARS-as-realization.
Distinct from `theory-derivation-officer`, which derives the *external* theory chain (predication-categories → predicated-computing → AOP → FARS spec → implementation-guides) for the broader polity corpus.
The self-theory author works at one further level of specificity: from the lifted FARS spec (and its predicated-computing parents) into PyFARS's own concepts/objects/morphisms/claims about itself as a running realization.

## Role in plain terms

PyFARS makes commitments that are not specified by FARS theory generically — implementation choices that encode load-bearing claims (substrate-purity, markdown-as-projection, jsonl-as-canonical-state), or sub-domain commitments (the public-fiber for the web app, the dispatch discipline for heartbeat-driven settling) that need theoretical ground.
The self-theory author authors the concepts, objects, morphisms, and claims that ground these commitments.

The work is *fiber-growing*.
Each authored entry adds a cell to the theory↔practice fiber that ties PyFARS-as-running-code to PyFARS-as-self-theory.
Entries cite upstream warrants via `depends-on:`, reuse existing PyFARS-side concepts where possible, and surface what the entry does *not* yet settle as questions in `questions/`.

## Scope

- **Read**: any entity in the upstream lineage — `theories/.../predication-categories/`, `theories/.../predicated-computing/`, `theories/.../flatfile-agentic-resource-system/`, plus `pyfars/governance/` and `pyfars/work/` for context.
- **Write**: any entity in `pyfars/` — concepts, objects, morphisms, claims, questions, examples, prose/narratives, prose/remarks, references.
- **Write (incidental)**: triage notes in `operations/engineering/triage/` for cross-cutting findings.

## Powers held

- `write-pyfars-self-theory-entity`: create or modify entities in `pyfars/`.
- `write-triage-note`: file a triage note when a self-theory authoring run surfaces a finding that needs cross-office attention.

## Privileges held

- `read-predication-categories-entity`, `read-predicated-computing-entity`, `read-fars-spec-entity`: read upstream theory; no claim against the officer for doing so.

## Duties attached

- `write-in-correct-derivation-layer` (write-pyfars-self-theory-entity): every write must land in `pyfars/`, not in upstream theory directories.
  If a finding requires upstream change, escalate via `escalate-when-theory-gap-found`.
- `escalate-when-theory-gap-found`: if self-theory authoring reveals a missing or incorrect upstream entity, file a question (or triage note) upstream and stop rather than backfilling.
  The self-theory author does not hold authority over upstream theory.
- `surface-friction-as-governance-revision`: when execution under this office's authored governance produces friction (the office's powers don't cover the work, the duties don't fit, the skills' descriptions don't match the actual procedure), surface the friction as a revision intent rather than working around it.
  The meta-discipline that closes the governance↔execution loop.

## Skills held

- `identifying-grounding-records-for-question` — produces the dependency-ordered manifest of records needed to resolve a self-theory question.
- `lifting-upstream-pattern-to-self-theory` — produces a PyFARS-side concept/object/claim that instantiates an upstream pattern.
- `authoring-foundational-self-theory-concept` — produces a foundational concept entry (substrate-spine concepts like substrate, projection, settling, etc.).
- `authoring-realization-claim` — produces a claim asserting a PyFARS commitment, with proof obligation routed to upstream.
- `expanding-self-theory-for-sub-domain` — produces the set of new concepts/objects/morphisms/claims needed when a sub-domain of PyFARS comes into focus (e.g., the web app slice).
- `deriving-practice-anchor-from-self-theory` — produces the minimal practice (code, configuration, deployment) that anchors a theory↔practice fiber to a self-theory slice.

## Relation to other offices

- **`theory-derivation-officer`**: parallel worker office.
  Theory-derivation runs Phases 1–5 of the *external* theory chain; self-theory-author works one level further down at the realization-self-theory level.
  Theory-derivation's outputs (FARS spec entries, implementation guides) are upstream warrants that self-theory-author cites.
  The two compose: derivation produces the spec; self-theory-author specifies what *this* realization commits to under the spec.
- **`pyfars-developer`**: downstream of self-theory-author.
  The practice-anchor work (`deriving-practice-anchor-from-self-theory`) produces a slice of theory that the developer then implements.
  The two collaborate at the boundary between theoretical commitment and concrete code.
- **`pyfars-theory-officer`**: governance auditor.
  Reads self-theory authoring outputs (along with theory-derivation's outputs) to assess derivation chain soundness.
  Files degeneration signals if self-theory authoring stalls, drifts, or produces ungrounded entries.
- **`pyfars-records-officer`**: peer worker office for `governance/` and `work/`.
  Self-theory-author writes to `pyfars/`; records-officer writes to `pyfars/governance/` and `pyfars/work/`.
  The two domains are disjoint at the write-level.
  When a self-theory authoring run reveals a needed governance change, self-theory-author files a triage note and defers to records-officer.

## Incumbency

Currently held informally by whatever agent is performing self-theory authoring (Claude Code sessions, captain-direct authoring).
A future task will settle the incumbency predications in the substrate so dispatch routes by office, not by ad-hoc agent slug.

## Governance↔execution self-reflexivity

This office is one of the first whose duties were authored *during* the work it governs (the captain's instruction was to write the governance for theory-authorship, then do the work under it, then revise the governance from friction).
The `surface-friction-as-governance-revision` duty makes this discipline explicit: the office expects revision; running the office without producing revisions is a sign that either the work is too superficial to surface real fit problems or the discipline is being neglected.
