---
title: "Maintain the integrity of the theory-derivation chain"
type: jural-relation
kind: duty
active-holder: pyfars-theory-officer
passive-party: pyfars-community
scope-action: monitor-gamma-health
triggering-powers: []
required-action: run-periodic-coverage-audit
enforcement: substrate-violation
rule-type: N→N
cadence: per-derivation-cycle
theory-basis: [enterprise, normative-operational-layering, jural-relation, recurrent-practice, charter-as-closure-system]
---


The theory officer's primary accountability: Γ — the enterprise's generative mechanism — must be monitored continuously for the three degeneration signals identified in `enterprise`.
This duty is not triggered by a specific power exercise; it is a standing obligation incurred by holding the theory-officer office.

## What integrity means

The theory-derivation chain has integrity when:

1. **Coverage flows**: new predication-categories material is being derived into predicated-computing; new predicated-computing material is being lifted into AOP and FARS spec; FARS spec content is being translated into implementation guides; implementation guides are generating code changes.
  Each link in the chain has recent output.

2. **Aim-set refills**: completed aims are being replaced by new aims from Γ.
  The enterprise's aim-set at each stage $\tau+1$ should contain newly-emergent cells from $\Gamma(A_\tau)$.
  A stable or shrinking aim-set (without newly-emergent cells appearing) is a degeneration signal.

3. **Goal-cell alignment**: the cell-pattern of active work goals aligns with C1–C5.
  Tasks whose stated goals are disconnected from the hard-core commitments are diagnostic of institutional corruption — the operative structure drifting from internal goods toward external goods.

## Required action

The theory officer must, on each derivation cycle:

1. Run `auditing-derivation-chain-governance` to produce a governance-layer coverage snapshot.
2. Compare current work goals against C1–C5 alignment.
3. If a degeneration signal appears, file a degeneration-signal triage note under `operations/engineering/triage/` with `requires-action: steward-review`.
4. If no signal, produce a brief null-result witness (the audit's negative result is itself a substrate record confirming the watch was run).

## Cadence

Per-derivation-cycle: the duty fires each time the theory-derivation loop completes a full cycle (Phase 1 through Phase 5).
Between cycles, a lighter ongoing check for catastrophic degeneration (aim-set collapsing to zero, no new triage notes from Phase 1 for multiple sessions) is appropriate.

## What this duty does NOT require

The theory officer does not run the loop.
It monitors loop health.
If the loop is stalling because the theory-derivation-officer lacks staffing, that is itself a degeneration signal to report to the steward — not a gap for the theory officer to fill by doing derivation work.

## Enforcement

Pre-M5: manual.
The captain or steward can audit the theory officer's watch record by checking whether each derivation cycle has a corresponding governance-layer coverage note in the audits directory.

Post-M5: the closure rule system checks that every derivation-cycle boundary event has a downstream theory-officer coverage record.
Missing record produces a governance-rule diagnostic attributing the gap to the theory-officer office.
