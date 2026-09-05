---
title: "Emit ultra vires witnesses on out-of-jurisdiction acts"
type: task
area: engineering
status: open
horizon: later
milestone: m5-agential-self-generation
goal: office-records-gate-authority
depends-on: [extend-dispatch-eligibility-to-read-office-jurisdiction]
requires-capabilities: [python-editing, witness-emission]
theory-basis: [jurisdiction]
---


## Description

When the dispatch graph's eligibility-by-office-authority rule emits F due to jurisdiction failure (workitem outside the office's predicate sub-category, or attempted at a stage outside $T_J$), additionally emit `(ultra-vires-attempt, by, <office>) = T`, `(ultra-vires-attempt, regarding-workitem, <workitem>) = T`, `(ultra-vires-attempt, jurisdiction-failed-on, <jurisdiction-axis>) = T`.

These witnesses are part of the audit trail; they don't propagate into settled work effect, per [predgov jurisdiction](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/jurisdiction.md) §"Ultra vires".

The jurisdiction-axis cell distinguishes the failure mode: predicate-mismatch, temporal-out-of-bound, or validity-condition-failed.

## Acceptance

- [ ] The eligibility-by-office-authority rule emits the additional ultra-vires witnesses on jurisdiction failure.
- [ ] Witnesses are visible in the event log and in substrate cells under `<substrate-root>/.pyfars/audit/ultra-vires/`.
- [ ] Tests cover: predicate-mismatch produces matching jurisdiction-axis witness, temporal-out-of-bound produces matching witness, validity-condition-failed produces matching witness.
- [ ] Workitems are unaffected by ultra-vires attempts: they remain in pending state, no spurious work emission.

## Progress cells

*(empty — task not yet started)*
