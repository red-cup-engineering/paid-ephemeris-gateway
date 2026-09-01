---
title: "Author charter-violation detection rules per migrated norm"
type: task
area: engineering
status: open
horizon: later
milestone: m5-agential-self-generation
goal: governance-rules-as-closure-rules
depends-on: [migrate-charter-clauses-to-norm-records]
requires-capabilities: [closure-rule-design, substrate-authoring]
theory-basis: [norm, charter-as-closure-system]
---


## Description

For each norm record migrated by [`migrate-charter-clauses-to-norm-records`](migrate-charter-clauses-to-norm-records.md), author a corresponding closure rule under `objects/<norm-slug>-rule.md`.
Per [predgov norm](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/norm.md):

- **Obligation rule.** Fires when the antecedent settles; emits T on the prescribed cell-pattern.
  Detection: an auditing rule fires when the prescribed cells remain at $\bot$ past a threshold ordinal; emits violation-witness.
- **Prohibition rule.** Fires when the antecedent settles AND the prohibited cell-pattern is asserted; emits violation-witness.
- **Permission rule.** No closure rule (permission is the absence of a prohibition; record-keeping only).

The rule's frontmatter cites the originating norm via `realizes-norm: <norm-slug>`.
The rule's body explains the antecedent and consequent in algebraic detail.

## Acceptance

- [ ] Every Obl- or Proh-typed norm has a corresponding `objects/<norm-slug>-rule.md` record.
- [ ] Each rule's `realizes-norm:` points back to the norm record.
- [ ] Per-rule violation-witness cell is named in the rule's body.
- [ ] An instantiator family at `runtime/charter_rules.py` walks norm records and produces rule instances per the rule records.

## Progress cells

*(empty — task not yet started)*
