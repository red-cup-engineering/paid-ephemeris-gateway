---
title: "Ship [M19 — Self-Developing PyFARS](../milestones/m19-self-developing-pyfars.md) as a coordinated plan"
type: plan
status: planning
milestone: m19-self-developing-pyfars
tasks:
  - realize-pyfars-self-agent-records-for-six-chartered-offices
  - format-pyfars-self-workitems-as-workitem-subtypes
  - realize-pyfars-self-tool-specs-for-nineteen-chartered-skills
  - test-pyfars-dispatches-own-offices-to-own-work
dependency-order:
  - [realize-pyfars-self-agent-records-for-six-chartered-offices, format-pyfars-self-workitems-as-workitem-subtypes]
  - [format-pyfars-self-workitems-as-workitem-subtypes, realize-pyfars-self-tool-specs-for-nineteen-chartered-skills]
  - [realize-pyfars-self-tool-specs-for-nineteen-chartered-skills, test-pyfars-dispatches-own-offices-to-own-work]
  - [realize-pyfars-self-agent-records-for-six-chartered-offices, test-pyfars-dispatches-own-offices-to-own-work]
milestone-cells:
  - "(pyfars-self-agent-records, six-realized, true) = T"
  - "(pyfars-self-workitems, subtype-formatted, true) = T"
  - "(pyfars-self-tool-specs, nineteen-realized, true) = T"
  - "(pyfars-dispatches-own-work, accepted, true) = T"
normative-cleanup: tracked
---


## What this plan does

[M19](../milestones/m19-self-developing-pyfars.md) is the capstone milestone — agents inside PyFARS write PyFARS itself.
This plan covers the **Stage-2 acceptance workstream** from the dump: realize the chartered machinery (six offices as AgentRecords, the workitem subtype taxonomy on PyFARS-self workitems, the nineteen chartered skills as ToolSpecs), then test that the substrate dispatches its own offices to its own work.

The plan is *foundational* for M19's broader self-development workflow — without the chartered machinery realized as substrate content, agents have nothing to dispatch and nothing to invoke.
Subsequent M19 work (modification proposals, conformance vectors, captain ratification, build pipeline) builds on top of this base.

## What this plan does NOT cover

- **Source-as-substrate-cells** (M19 backing-gap `source-cell.md`) — covered by [`ship-m11-assurance-audit-chain-export`](ship-m11-assurance-audit-chain-export.md)'s polyglot-projector workstream (specifically the Python source projector).
- **Modification-proposal records** and the captain-ratification flow — captured as M19 backing-gaps; tasks become authorable when this plan completes.
- **Conformance vectors as gating witness** — depends on M3's replay-determinism work + M19's modification flow.
- **Image rebuild from substrate events** — final-stage M19 work; depends on every prior M19 piece.

## Dependency structure

```
realize-pyfars-self-agent-records-for-six-chartered-offices ──┐
        │                                                      │
        ▼                                                      │
format-pyfars-self-workitems-as-workitem-subtypes              │
        │                                                      │
        ▼                                                      │
realize-pyfars-self-tool-specs-for-nineteen-chartered-skills   │
        │                                                      │
        ▼                                                      │
test-pyfars-dispatches-own-offices-to-own-work ◄───────────────┘
```

Sequential build-up; the test joins all three constituents.

## Theory grounding

- [Predwork plan](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/plan.md).
- [Plan-completion-as-meet](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/plan-completion-as-meet.md).
- M19's `agential-self-generation` theory-basis; charter C3.
