---
name: "Auditing derivation chain governance"
description: "Produces a governance-layer coverage snapshot assessing whether the theory-derivation loop is firing, whether active work aligns with C1–C5, and whether any of the three degeneration indicators are present. Use at the start of each derivation cycle and whenever the theory officer suspects degeneration."
---


## Requirements

- Read access to `governance/enterprise.md` and `governance/charter.md`
- Read access to `work/tasks/engineering/` and `work/goals/`
- Read access to `operations/engineering/triage/` (recent triage notes from Phase 1)
- Read access to `theories/.../predicated-computing/` (recent entity additions) and `theories/.../agential-orchestration-platform/` (recent AOP entities)

## Steps

1. **Check loop activity**: read `operations/engineering/triage/` for Phase 1 audit triage notes (type `idea`, `status: triage`, `requires-action: derive`).
  Are there recent notes?
  If the most recent note is more than one derivation cycle old, the loop is stalling — log this as a potential exhaustion-of-positive-heuristic signal.

2. **Check aim-set refill**: read the `newly-emergent` aim-cells in `work/goals/`.
  Are new goals appearing from derivation work?
  If the goal list is static — no new entries from Phase 5 implementation guides in recent cycles — the generative mechanism Γ may be failing to refill the aim-set.

3. **Check goal-cell alignment**: scan active task goals in `work/tasks/engineering/`.
  Classify each task as either (a) substrate-capability work aligned with C1–C5, or (b) harness-maintenance or external-goods work.
  If the ratio has inverted — more than half of active tasks are in category (b) — this is an institutional-corruption signal.

4. **Check for upstream gaps**: read any triage notes from the last cycle with `requires-action: theory-gap`.
  Unresolved theory-gap notes indicate the derivation chain is blocked on missing predication-categories content.
  File a separate report if gaps are old.

5. **Produce the snapshot**: write a governance-layer coverage note under `theories/.../flatfile-agentic-resource-system/audits/` (or the nearest active theory's `audits/` directory) documenting what was found.
  If a degeneration signal is present, also file a triage note under `operations/engineering/triage/` with `requires-action: steward-review` and reference the governance snapshot.

## Outcomes

A governance-layer coverage snapshot in the relevant `audits/` directory.
If no signals: a brief null-result note confirming the watch was run and Γ appears healthy.
If a signal: a triage note routed to the steward for corrective action.
The snapshot is the theory officer's primary audit output — it is not a derivation product; it is a governance product.
