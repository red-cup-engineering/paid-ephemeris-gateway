---
title: "Theory-Derivation Loop"
type: process
status: active
formality-level: F1
date: "2026-05-07"
theory-basis: [recurrent-practice, operations-loop, formality-layer]
---


## What This Is

A recurring development process in which new mathematical material in predication-category theory is derived downward through the theory stack — predicated computing → predicated work → agential orchestration platform → FARS → PyFARS implementation — resulting in autonomous PyFARS development driven by the substrate's own mathematical growth.

This loop is itself an instance of what PyFARS is trying to become: a system whose operative elements (agents, skills, runbooks) are substrate entities, and whose self-improvement is a substrate operation.
Running this loop on the current system is both useful work *and* the most instructive test of whether the work infrastructure is actually functioning.

## The Authority Chain

Every step in this loop is a *derivation*, not an invention.
The chain of authority is:

```
predication-categories/
    ↓ (derived theory)
predicated-computing/
    ↓ (engineering sub-theory)
agential-orchestration-platform/
    ↓ (FARS realization)
flatfile-agentic-resource-system/
    ↓ (Python implementation)
pyfars/src/
```

Material introduced at any level must be derivable from or consistent with every level above it.
If a step cannot be grounded in the level above, it belongs either upstream (file it there) or in triage (file a question).

## The Six Phases

### Phase 1: Audit Predication-Categories

**Agent**: `predication-category-theory-auditor` **Skill**: `audit-citation-graph`, `audit-proof-status` **Produces**: A triage note listing new or under-derived material — theorems without downstream citations, objects not yet realized in predicated-computing, open questions that have been answered but not propagated.

**Triggering condition**: A new commit to `theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/` that adds a theorem, object, or concept not yet cited by a predicated-computing entity.

**Output as substrate record**:
```yaml
type: idea
status: triage
domain: theory-derivation
summary: >
  New material in predication-categories not yet derived into
  predicated-computing: [list of slugs].
requires-action: derive-into-predicated-computing
```

Filed under `operations/engineering/triage/`.

---

### Phase 2: Derive into Predicated Computing

**Agent**: `derived-theory-improver` **Skills**: `draft-definition`, `draft-theorem`, `draft-lemma`, `draft-conjecture` **Produces**: New definitions, theorems, or objects in `theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/` that realize or specialize the predication-categories material at the engineering level.

**Input**: The triage note from Phase 1 listing specific predication-categories slugs.

**Triggering condition**: Phase 1 output is filed and has `requires-action: derive-into-predicated-computing`.

**Scope rule**: The `derived-theory-improver` writes in predicated-computing and its descendants.
It does not write in predication-categories and does not write in dev docs.
If the derivation reveals a gap in predication-categories itself, it files a question upstream and escalates to `predication-category-theory-researcher`.

---

### Phase 3: Lift to Programmer Surface

**Agent**: `predication-theory-lifter` **Skills**: `tighten-specification`, `compose-monograph`, `extract-open-questions`, `corpus-context` **Produces**: Library content in the derived theory layer (predicated-computing descendants: AOP, FARS) that answers questions the PyFARS dev docs implicitly raise but the theory has not yet answered.
Also produces questions when the right answer isn't clear.

**Input**: New material from Phase 2 in predicated-computing.
Also reads PyFARS dev docs (`work/implementation/`) for unanswered questions.

**Triggering condition**: Phase 2 produces new predicated-computing entities that don't yet appear in any AOP or FARS theory file, *or* the dev docs contain an unresolved question that Phase 2's output can now answer.

**Scope rule**: Writes in `theories/.../predicated-computing/` and its descendants including `agential-orchestration-platform/` and `flatfile-agentic-resource-system/`.
Does not write in dev docs.
Does not write in predication-categories.

---

### Phase 4: Synthesize into FARS Theory

**Agent**: `theory-researcher` (scoped to FARS) **Skills**: `draft-definition`, `draft-theorem`, `draft-example`, `link-to-lean` **Produces**: New or extended FARS spec sections — objects, morphisms, concepts — in `theories/.../flatfile-agentic-resource-system/`.
Each new FARS entity instantiates an AOP entity and depends on a predicated-computing entity.

**Input**: Phase 3 output in AOP or FARS theory.

**Triggering condition**: Phase 3 produces AOP or FARS material not yet represented in the FARS spec.

**Dependency rule**: Every FARS entity must have `instantiates:` pointing to its AOP counterpart.
If the AOP counterpart doesn't exist, file a question upstream and return to Phase 2/3.

The three FARS spec sections still to write (per the current FARS `_index.md` status) are the primary targets: **federation**, **harness surfaces & interfacers**, **self-representation invariants**.
These are the sections most likely to be unlocked by new predication-categories material.

---

### Phase 5: Write PyFARS Dev Docs

**Agent**: `pyfars-developer` or `pypredcomp-architect` **Skills**: `orient-to-project`, `corpus-context`, `corpus-show` **Produces**: Updated implementation guides under `work/implementation/` that translate the new FARS theory into concrete PyFARS tasks — specific module paths, function signatures, record schemas, implementation orders.

**Input**: Phase 4 output in the FARS spec.

**Triggering condition**: Phase 4 produces a new FARS spec entity (object, morphism, concept) that is not yet reflected in the PyFARS implementation guides.

**Format rule**: Implementation guides state what exists in the code, what needs to be built, and in what order.
They cite the FARS spec section they implement.
They do not repeat theory — they link to it.

---

### Phase 6: Implement

**Agent**: `pyfars-developer` **Skills**: (varies by task — `run-python-tests`, `typecheck-python`, etc.) **Produces**: New or updated Python modules in `src/pyfars/`, with tests, that implement the FARS spec entity described in Phase 5.

**Input**: Phase 5 implementation guide with specific tasks.

**Triggering condition**: Phase 5 produces a dev doc change that includes at least one unimplemented task.

**Implementation rule**: Code cites the theory in its module docstring.
The citation is the FARS spec slug, not a paraphrase.
If the implementation reveals a theory inconsistency, the implementation stops and Phase 4 is revisited.

---

## The Loop

```
[new predication-categories commit]
         ↓
Phase 1: Audit  (predication-category-theory-auditor)
         ↓ triage note
Phase 2: Derive (derived-theory-improver)
         ↓ predicated-computing entities
Phase 3: Lift   (predication-theory-lifter)
         ↓ AOP / FARS theory entities
Phase 4: Synthesize (theory-researcher @ FARS)
         ↓ FARS spec additions
Phase 5: Dev Docs (pyfars-developer)
         ↓ implementation guide updates
Phase 6: Implement (pyfars-developer)
         ↓ code + tests
[git commit → audit-commits → witness chain]
         ↓
[next audit cycle begins]
```

Each phase produces substrate content that serves as the input to the next phase.
The chain is explicit in frontmatter: each output record has `requires-action:` naming the next phase, and `produced-by:` naming the current agent.
The heartbeat's task-readiness policy fires on records where `requires-action:` names a skill the system has an eligible agent for.

---

## Current Execution Status

**Today (post-M2)**: Each phase can be executed manually by invoking the named agent through OpenClaw or by submitting a workitem to the engine API for the next lifecycle tick to dispatch.
The chain between phases requires manual intent-queuing — a human or OpenClaw agent sees the output of Phase N and queues Phase N+1's workitem.

**Future (M3+ continuous loop)**: Phase N's output record, if it has `requires-action:` set, will be automatically picked up by the dispatch graph's substrate scan and dispatched to the appropriate Phase N+1 agent.
The chain becomes semi-autonomous: humans queue Phase 1 (the audit trigger); the rest flows through the lifecycle's ticking.

**After M5 (agential self-generation)**: Phase 5 generates tasks that Phase 6 executes; Phase 6's git commits trigger Phase 1 of the next cycle via a heartbeat-registered closure rule.
The loop is fully autonomous within resource limits (rate limits, budget caps).
No human queuing required.

---

## Why This Loop Matters

This loop is the reason the work infrastructure improvements (M1–M5) are not just engineering cleanup — they are what makes the mathematical research program *productive*.
Without the loop: - New predication-categories material sits unconnected to the code - PyFARS development is ad hoc, driven by immediate need rather than by the theory - The theory and the implementation drift apart

With the loop running: - Every theorem in predication-categories that bears on computation eventually lands in PyFARS - PyFARS development is systematically grounded in the theory - The corpus's own mathematical growth drives the codebase forward autonomously

This is the `predicated-agentic-computing` commitment made concrete: the platform's operative elements (these agents, these skills, this runbook) are substrate entities, and the platform's self-improvement (PyFARS development) is a substrate operation.

---

## Prerequisites

Before the loop can run autonomously:

1. **M1** — Skills must follow the two-sentence recipe format so agents reading them know exactly what to do.
2. **M2** — The heartbeat's task-readiness policy must fire on `requires-action:` fields in triage notes and output records.
  Agent eligibility must come from substrate agent records, not hardcoded Python.
3. **M3** — The loop's phases must survive a 24-hour autonomous run without human intervention (at least for Phases 5–6 which are code-level).

Phases 1–4 (theory work) will likely need human review at each phase boundary for longer than Phases 5–6, because theory claims are harder to validate automatically.
The loop becomes fully autonomous only when the closure rule system can validate FARS spec consistency mechanically — which is itself a M5 item (governance rules as substrate records).

---

## Registering the Loop as a Runbook

This process should eventually be a FARS `runbook-record` in the substrate:

```yaml
---
type: runbook-record
slug: theory-derivation-loop
trigger: new-predication-categories-commit
context: new-material-not-yet-derived
body:
  - invoke-skill: audit-citation-graph
    agent: predication-category-theory-auditor
    produces: triage-note
  - invoke-skill: draft-theorem
    agent: derived-theory-improver
    depends-on: triage-note
    produces: predicated-computing-entities
  - invoke-skill: tighten-specification
    agent: predication-theory-lifter
    depends-on: predicated-computing-entities
    produces: fars-theory-entities
  - invoke-skill: draft-definition
    agent: theory-researcher
    depends-on: fars-theory-entities
    produces: fars-spec-additions
  - invoke-skill: corpus-context
    agent: pyfars-developer
    depends-on: fars-spec-additions
    produces: implementation-guide-updates
  - invoke-skill: run-python-tests
    agent: pyfars-developer
    depends-on: implementation-guide-updates
    produces: code-commits
---
```

Once `runbook-record` is a first-class FARS object and `execute-runbook` is a working morphism (M5), this YAML replaces the prose description above.
The prose is here because M5 isn't done yet.

---

## Reference

- [FARS runbook-record object](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/runbook-record.md)
- [FARS execute-runbook morphism](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/morphisms/execute-runbook.md)
- [AOP practical-reasoning-as-runbook-execution concept](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/concepts/practical-reasoning-as-runbook-execution.md)
- [Predicated agentic computing narrative](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/narratives/predicated-agentic-computing.md)
- [Roadmap](milestones/roadmap.md) — M2–M5 prerequisites for autonomous loop execution
- [Substrate-driven dispatch](implementation/substrate-driven-dispatch.md) — M2 work that makes the phase chaining semi-autonomous
