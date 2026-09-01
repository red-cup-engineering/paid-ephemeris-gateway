---
title: "Author honest non-claims section"
type: jural-relation
kind: duty
active-holder: pyfars-records-officer
passive-party: pyfars-community
scope-action: author-milestone-or-load-bearing-goal
triggering-powers:
  - create-milestone-record
  - create-goal-record
required-action: include-non-claims-section
enforcement: substrate-violation
rule-type: N→N
theory-basis: [substrate-purity, llm-swarms-fail-classical-conditions, swarm-vs-orchestration-dichotomy]
---


When authoring a milestone record or load-bearing goal record (one whose subject involves any contested theoretical claim — e.g., swarm convergence, optimality guarantees, autonomy, federation correctness), the records officer MUST include an explicit section bounding what the milestone or goal **does not claim**.

The non-claims section is the substrate's mechanism for refusing to overfit ambitions to theory PyFARS has not yet earned.
A milestone authored without a non-claims section is silently asserting an unbounded scope — that any benefit conventionally attributed to the milestone's subject is in fact achieved.
This is dishonest framing under the [`swarm-vs-orchestration-dichotomy`](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/theories/swarm-intelligence/theorems/swarm-vs-orchestration-dichotomy.md) theorem and the [`llm-swarms-fail-classical-conditions`](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/theories/swarm-intelligence/theorems/llm-swarms-fail-classical-conditions.md) theorem.

## Required action

When authoring a milestone or load-bearing goal record:

1. **Identify the contested-claim space.** What might a reader assume the milestone delivers, that the milestone does *not* in fact deliver?
  Examples:
   - "Federation" → does it claim Byzantine fault tolerance?
     Eventual consistency under partition?
     Convergence guarantees?
   - "Swarm participation" → does it claim classical-swarm convergence?
     Stigmergic coordination?
     Local-rule emergent behavior?
   - "Cost-aware dispatch" → does it claim Pareto-optimality?
     Convergence to a global minimum?
     Strategy-proofness?
2. **Author a "What [milestone-name] does NOT claim" section** in the body, listing each non-claim with one or two sentences explaining what would be required to justify the claim and why PyFARS does not yet justify it.
3. **Cite the relevant theorem** that bounds the claim.
  The non-claim is grounded in upstream theory, not in modesty for its own sake.

## Why

PyFARS is a research substrate.
Its development is theory-derived; its claims must be theory-justified.
Claiming more than theory supports is a [substrate-purity](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/_index.md) violation: the substrate would carry assertions whose proof obligations are not satisfied.

Worse, ambient framing in the LLM-orchestration field consistently overclaims.
"Swarm" is the common framing; PyFARS is *not* a classical swarm and saying so explicitly prevents successor agents (and the captain at a later session) from operating on the wrong mental model.
The non-claims section makes substrate's stance explicit.

## Examples

For [m6-federation](../../work/milestones/m6-federation.md), a non-claims section names: "M6 does NOT claim Byzantine fault tolerance" (citing the absence of Byzantine-broadcast theory in the dependency graph), "M6 does NOT claim eventual consistency under arbitrary partition" (citing the closure-merge commutation lemma's hypothesis-set).

For [m7-boundary-handedness-and-outbound-endpoints](../../work/milestones/m7-boundary-handedness-and-outbound-endpoints.md), a non-claims section names: "M7 does NOT claim that LLM endpoints participate as classical swarm peers" (citing [`swarm-vs-orchestration-dichotomy`](../../theories/.../theorems/swarm-vs-orchestration-dichotomy.md)).

## Enforcement

Pre-M5: manual.
The records officer applies this duty when running [`writing-milestone-records`](../skills/writing-milestone-records.md) and [`writing-goal-records`](../skills/writing-goal-records.md).
The captain or a reviewing agent catches missing non-claims sections.

Post-M5: the closure rule system can scan milestone and load-bearing goal records for the literal section header "What [name] does NOT claim" or equivalent, and emit `missing-non-claims-section` diagnostics for milestones whose subject is in a flagged contested-claim domain (federation, swarm, autonomy, optimality, convergence).
