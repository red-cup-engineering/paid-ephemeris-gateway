---
title: "Implement bigraded common-knowledge separation in eligibility witnesses"
type: task
area: engineering
status: open
horizon: later
milestone: m3-continuous-loop
goal: anomaly-surfacing-via-contradiction-cells
depends-on: []
requires-capabilities: [code-authoring, theory-derivation]
theory-basis: [closure-rule-system, witness-discipline]
---


## Description

Refine eligibility-witness emission to separate the *common-knowledge layer* (cells true at the rule-system version's commit, shared across all eligibility evaluations in the tick) from the *per-witness layer* (cells specific to the rule firing that produced this particular eligibility cell).
The bigrading lets the audit-export distinguish "this eligibility decision rests on the polity's settled rule-system" from "this eligibility decision rests on a specific witness with provenance X."

The separation is a refinement of [`closure-rule-record`](../../objects/closure-rule-record.md) firing: each firing emits witnesses with two grading coordinates rather than one.
Audit-export and federation envelopes consume the bigrading to produce sharper provenance trails.

This is a substrate-algebra refinement; it doesn't change *what* the engine does, but it changes *how* the engine records its reasons.

## Acceptance

- [ ] Eligibility-witness records carry explicit `common-knowledge-cell-set` and `per-firing-cell-set` fields.
- [ ] Closure runner emits witnesses with the bigrading populated.
- [ ] Audit-export reads the bigrading and produces separate provenance sections in the exported audit chain.
- [ ] A test asserts: two eligibility cells from the same rule-system-version share their common-knowledge layer (byte-identical) and differ only in their per-firing layer.

## Progress cells

*(empty — task not yet started)*
