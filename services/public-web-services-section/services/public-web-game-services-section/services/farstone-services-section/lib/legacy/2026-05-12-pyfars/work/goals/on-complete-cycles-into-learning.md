---
title: "on-complete cycles into learning"
type: goal
milestone: m5-agential-self-generation
status: open
horizon: later
theory-basis: [continuous-learning-loop, workflow-composition, settlement-path]
tasks:
  - extend-on-complete-emission-to-learning-outputs
  - wire-learning-outputs-into-consolidation-cycle
  - test-end-to-end-work-n-produces-skill-for-work-n-plus-one
---


After this goal, workitems whose `on-complete:` field declares **learning outputs** (a refined skill record, an authored runbook, a new norm) cycle those outputs back through the substrate so the next workitem of the same class dispatches against the refined behavior.
The continuous-learning loop closes: an agent doing work N produces an artifact that work N+1 reads.

This is the operational realization of the bidirectional learning the [Charter](../../governance/charter.md) C3 commits to.

## Why

[`on-complete-follow-on-intents`](on-complete-follow-on-intents.md) ([M3](../milestones/m3-continuous-loop.md)) made workitems with `on-complete:` queue follow-on workitems.
This goal extends that to **learning outputs**: when a workitem completes and its `on-complete:` declares a skill-refinement or runbook-authorship, the outputs are written to the substrate and the next tick's dispatch reads them.

Without this goal, the M4 consolidation cycle is the only learning mechanism.
With this goal, agents can produce explicit, named, substrate-visible learning artifacts — distinct from implicit instinct cells.

## Theory grounding

**1.
Continuous-learning-loop** ([`flatfile-agentic-resource-system/concepts/continuous-learning-loop`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/) — when authored).
The loop has three forms: (a) implicit, via [observation → instinct → selection](../milestones/m4-memory-feedback.md) ([M4](../milestones/m4-memory-feedback.md)'s pipeline); (b) explicit, via on-complete authoring of refined behavior ([M5](../milestones/m5-agential-self-generation.md), this goal); (c) cross-host, via federation ([M6](../milestones/m6-federation.md)). **All three forms close the same loop at different timescales and explicitness.**

**2.
Workflow composition with normative-handoff edges** ([`predicated-work/objects/workflow`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/workflow.md)).
The on-complete edge from a workitem to a learning output is a **normative-handoff edge**: completing the work generates an authored substrate record (a skill/runbook/norm) that becomes input to subsequent workflows.
The handoff carries the authoring agent's authority and the new artifact's authorization grounding.

**3.
Settlement-path for explicit artifacts** ([`flatfile-agentic-resource-system/concepts/settlement-path`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/) — when authored).
The settlement path `observation → instinct → skill → tool` is the implicit version. **The explicit version skips the lower stages**: an agent can author a skill directly from a workitem completion (without going through observation/instinct), provided the agent's office holds authority.
This is the agential-authorship path.

### Design constraints from this grounding

- **Learning outputs are subject to the same governance as authored content.** A new skill written via on-complete must validate, must declare a `gerund-phrase` slug, must carry frontmatter authority.
  The on-complete path doesn't bypass governance — it accelerates it.
- **Provenance is mandatory.** Each learning output carries `derived-from-workitem: <workitem-slug>` and `derived-by: <agent-incumbent-slug>`.
  This is what closes the audit chain when a future workitem dispatches against the new skill.
- **The on-complete writer must hold the authoring power.** Per [`office-records-gate-authority`](office-records-gate-authority.md): only agents whose incumbency holds [`write-pyfars-self-theory-entity`](../../governance/powers/write-pyfars-self-theory-entity.md) (or the relevant authoring power) can produce learning outputs.
  Without authority, the on-complete write is *ultra vires* and emits a failure-witness.
- **Loop closure is verified by acceptance test.** The acceptance test runs work N (which produces a skill), runs work N+1 (which dispatches against the new skill), and verifies the new skill was the one selected.

## Acceptance

- [ ] The on-complete handler in `runtime/dispatch_graph.py` (or its M3 implementation) accepts learning outputs declaratively: `on-complete: { author-skill: <skill-spec>, author-runbook: <runbook-spec>, author-norm: <norm-spec> }`.
- [ ] When a workitem completes with learning outputs, the runtime writes the outputs to the substrate (with provenance) and emits witnesses.
- [ ] Authority check: the writing agent's incumbency must hold the relevant authoring power; otherwise emit ultra-vires.
- [ ] End-to-end test: workitem class C is dispatched twice; the first run's on-complete produces a refined skill for class C; the second run dispatches against the refined skill (verified by checking the dispatch witness names the new skill).
- [ ] Documentation in [`prose/explanation/`](../../prose/explanation/) explains the explicit vs. implicit learning paths and when to use each.
