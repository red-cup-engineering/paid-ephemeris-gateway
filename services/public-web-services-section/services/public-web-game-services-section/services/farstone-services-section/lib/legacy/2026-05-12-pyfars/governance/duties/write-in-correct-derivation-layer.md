---
title: "Write theory entities in the correct derivation layer"
type: jural-relation
kind: duty
active-holder: theory-derivation-officer
passive-party: pyfars-community
scope-action: write-theory-entity
triggering-powers:
  - write-predicated-computing-entity
  - write-aop-entity
  - write-fars-spec-entity
  - write-implementation-guide
required-action: confirm-layer-matches-phase
enforcement: substrate-violation
rule-type: N→O
theory-basis: [normative-operational-layering, jural-relation, recurrent-practice]
---


When the theory-derivation-officer exercises any write power, the write MUST land in the theory layer that corresponds to the active loop phase.
Writing in the wrong layer — especially writing upstream in predication-categories when the phase only authorizes writing in predicated-computing — is a substrate violation.

## Phase-to-layer mapping

| Phase | Skill | Authorized write targets | Forbidden targets |
|---|---|---|---|
| 1 — Audit | `auditing-theory-derivation-coverage` | `operations/engineering/triage/` | everything else |
| 2 — Derive | `deriving-predicated-computing-content` | `theories/.../predicated-computing/` | predication-categories, dev docs, AOP, FARS |
| 3 — Lift | `lifting-to-programmer-surface` | `theories/.../agential-orchestration-platform/`, `theories/.../flatfile-agentic-resource-system/` | predication-categories, predicated-computing root, dev docs |
| 4 — Synthesize | `synthesizing-into-fars-spec` | `theories/.../flatfile-agentic-resource-system/` | all layers above FARS |
| 5 — Guides | `writing-implementation-guides` | `work/implementation/` | theory directories |

## Required action

Before writing, confirm: 1.
Which loop phase is currently active (read the triage note's `requires-action:` field).
2.
That the target directory is in the authorized column for that phase.
3.
If the right target is unclear, file a question in `operations/engineering/triage/` rather than guessing.

## Why this matters

The theory-derivation loop is authoritative because each step is a genuine derivation from the level above.
Writing in the wrong layer short-circuits that derivation chain.
A predicated-computing entity written directly into predication-categories is ungrounded — it has no derivation backing it.
An AOP entity written directly into predicated-computing skips the derivation and produces an inconsistency the closure rule system will flag.

## Enforcement

Pre-M5: manual.
A reviewing agent (or the captain) checks `git diff --name-only` at each phase boundary.
Post-M5: the closure rule system checks that every write event has a phase-layer pair that matches the table above.
A mismatch produces a governance-rule diagnostic.
