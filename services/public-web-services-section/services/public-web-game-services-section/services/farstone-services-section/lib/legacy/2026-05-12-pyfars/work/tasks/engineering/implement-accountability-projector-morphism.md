---
title: "Implement accountability-projector morphism"
type: task
area: engineering
status: open
horizon: captured
milestone: m3-continuous-loop
goal: governed-autonomy-witness-chains
depends-on: [verify-certifiability-sectors-closure-rule-landed]
requires-capabilities: [code-authoring, runtime-engineering, predication-category-theory]
theory-basis: [verdier-duality-on-cob-settling, closure-2-monad-lax-idempotence, equivariant-k4-cohomology-decomposition, witness-as-increment]
---


## Description

The 561 polity's audit-substrate-bootstrap project Pass 1 declares a morphism `accountability-projector` (`/home/emsenn/561/morphisms/accountability-projector.md`) that reads each closed cobordism `∅ → ∅` from the engine's tick history and emits a `witness-chain-record` (`/home/emsenn/561/objects/witness-chain-record.md`) bound to the cobordism.
This is the Verdier-duality identification of the cosheaf-event-log with the sheaf-witness-chain-record at the level of stalks, made operational.

No code in pyfars currently realizes this.
Pass 3 (Pass 1 substrate refinement) only set the witness-emission cadence (per closed cobordism).
The implementation is this task.

## What "implementing" means here, concretely

- A new runtime module `pyfars/runtime/accountability_projector.py` that:
  - Walks closed cobordisms in the engine's per-tick state.
    A "closed cobordism" is a workitem-life-cycle from dispatch (`∅` start) through settlement (`∅` end) — the engine already has the begin/end markers in its event log.
  - Per closed cobordism, computes the Euler-characteristic χ(v) = |Apex_v| − |L_ns(κ_v)| over the equivariant K_4 cohomology decomposition the substrate declares.
  - Emits one `kind: witness-chain-record` cell into `records/engineering/records/events/<date>.jsonl` per cobordism, populated with: `workitem-id`, `originating-office`, `dispatched-to`, `captain-attestation-cell`, `settlement-hash`, `closure-ordinal`, `mld-class`, `k4-grading`, `cosheaf-source-events`, `partition-function`.
    Predicate shapes are fixed by Pass 2's predicated-drone-swarm theory authoring; shape source is the witness-chain-record object record.

- Wired into the engine's tick loop (`pyfars/runtime/lifecycle.py`) so it fires after the closure-rule pass, before the next dispatch — the cadence Pass 3 specified.
  One witness per closed cobordism per tick (de-duplicated by `(workitem-id, settlement-hash)`).

- Tested:
  - Unit: feed a synthetic cobordism (dispatch + settle in same tick), assert one witness emitted with the correct χ(v).
  - Integration: run the engine for N ticks against a polity with workitems flowing, assert the witness-chain-record count matches the closed-cobordism count.

## Why this matters

The polity's governed-autonomy story is "free-tier endpoint dispatch is safe-by-mathematical-construction because every closed cobordism deposits an audit witness with computable cohomology grading."
If the accountability-projector doesn't exist, the substrate declares the contract but the engine doesn't honor it — the witness-chain is empty, the post-refusal cohomology check has no input, and the certifiability gate degenerates to "no work has settled, dispatch freely."

Until this task lands, `verify-certifiability-sectors` (already wired as a closure rule) operates on an unpopulated witness-chain and therefore can't detect a refusal-resonance even in principle.

## Acceptance

- [ ] `pyfars/runtime/accountability_projector.py` exists and exports an `AccountabilityProjector` class invoked by `RuntimeContext`'s tick loop.
- [ ] One `kind: witness-chain-record` JSONL line emitted per closed cobordism, schema-conformant per the 561 polity's `objects/witness-chain-record.md`.
- [ ] χ(v) is computed and stored on each emitted record.
- [ ] Tests in `tests/test_accountability_projector.py` cover: zero cobordisms (no emission), one cobordism (one emission, correct χ), N cobordisms (N emissions, all distinct).
- [ ] The 561 polity's `morphisms/accountability-projector.md` cites this implementation under `realized-by:`.

## Out of scope

- The cohomology-vanishing refusal-resonance detector itself (`H¹_χ⁻ = 0 ∧ H¹_χ∼∘⁻ = 0`).
  That's the closure rule already authored as `verify-certifiability-sectors` and wired in; it consumes the witness-chain this projector emits but lives in `eligibility_rules.py`, not here.
- Cross-tick cobordism stitching (cobordisms that span multiple ticks).
  Pass 1 deliberately scoped to single-tick closed cobordisms; multi-tick stitching is a follow-on once the basic case is firing.
- Backfill of historical pre-projector ticks.
  Witnesses start once this lands; prior tick history stays sheaf-empty.

## Origin

Captured as task #8 of the 561 polity's audit-substrate-bootstrap project.
The 561-side framing is at `/home/emsenn/561/work/projects/audit-substrate-bootstrap/tasks/pass-3-closure-firing-on-boundary-discipline.md`; this task is the pyfars-side engineering work that record points at.
