---
title: "Format PyFARS-self workitems as Workitem subtypes"
type: task
area: engineering
status: open
horizon: later
milestone: m19-self-developing-pyfars
goal: self-development-workflow
depends-on: [realize-pyfars-self-agent-records-for-six-chartered-offices]
requires-capabilities: [corpus-editing, workitem-authoring]
theory-basis: [workitem-vs-agent-taxonomy]
---


## Description

Walk PyFARS-self workitems (the substrate's own internal work — engine-runs, audits, federation-cycles, consolidation-passes, etc.) and reformat each as the proper Workitem subtype: `Process`, `Procedure`, `Derivation`, or `Inquiry` per the workitem-vs-agent taxonomy.

Today these are flat-named workitems with implicit type; the Workitem subclass infrastructure (Pydantic classes shipped per Arc 0) discriminates by frontmatter `kind:` field.
Each existing PyFARS-self workitem needs its frontmatter updated to declare the right subtype, and its body adjusted to match the subtype's expected shape (Process → continuous activity; Procedure → step-sequence; Derivation → input → output transform; Inquiry → question → answer).

## Acceptance

- [ ] Every workitem under `governance/work/` (or wherever PyFARS-self workitems live) carries explicit `kind: process | procedure | derivation | inquiry` frontmatter.
- [ ] Bodies match the kind: Process workitems describe the continuous activity; Procedure workitems list ordered steps; Derivation workitems name input cells and output cells; Inquiry workitems pose the question.
- [ ] The dispatch graph's discovery walks workitems by kind and dispatches per the kind's expected enactor.
- [ ] A test asserts: a workitem with `kind: procedure` dispatches to the ScriptEnactor; one with `kind: inquiry` dispatches to a research-class agent.

## Progress cells

*(empty — task not yet started)*
