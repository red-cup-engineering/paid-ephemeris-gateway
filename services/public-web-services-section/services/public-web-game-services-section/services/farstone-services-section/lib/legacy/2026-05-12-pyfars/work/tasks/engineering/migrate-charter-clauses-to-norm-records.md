---
title: "Migrate charter clauses to norm records"
type: task
area: engineering
status: open
horizon: later
milestone: m5-agential-self-generation
goal: governance-rules-as-closure-rules
depends-on: []
requires-capabilities: [substrate-authoring, charter-analysis]
theory-basis: [norm, charter-as-closure-system]
---


## Description

For each [Charter](../../../governance/charter.md) clause that has an enforceable closure-rule shape (the hard-core commitments C1–C5 plus the explicit ought/must/may/shall/shall-not statements throughout), author a corresponding [norm](../../../governance/norms/_index.md) record.
Each norm record extracts the clause's deontic operator, propositional content, antecedent, and authority-grounding into frontmatter cells; the body is the clause's text.

Many charter clauses contain *several* norms (e.g., a clause that says "all dispatch must witness rsv_hash AND replay-determinism is required" is two norms).
Decompose generously — one norm per atomic prescription.

The charter document itself does NOT change.
The norms reference it via `operative-in: charter` and `authority-grounding: <clause-anchor>`.

## Acceptance

- [ ] Every clause from C1–C5 with a deontic operator has a corresponding norm record at [`governance/norms/`](../../../governance/norms/_index.md).
- [ ] Each norm has `operative-in: charter` and `authority-grounding: <charter-clause-anchor>`.
- [ ] The norms' frontmatter is consistent with the [norms _index](../../../governance/norms/_index.md) shape.
- [ ] The existing [`every-dispatch-must-witness-rsv-hash.md`](../../../governance/norms/every-dispatch-must-witness-rsv-hash.md) is one example; this task produces ~10–20 more.
- [ ] Charter document itself is unchanged.

## Progress cells

*(empty — task not yet started)*
