---
title: "Realize PyFARS-self AgentRecord realizations for the six chartered offices"
type: task
area: engineering
status: open
horizon: later
milestone: m19-self-developing-pyfars
goal: self-development-workflow
depends-on: []
requires-capabilities: [corpus-editing, agent-authoring]
theory-basis: [agential-self-generation, charter-c3]
---


## Description

Author `governance/agents/<office>.md` AgentRecord realizations for the six chartered offices PyFARS-self needs (records officer, scheduling officer, dispatch officer, theory officer, audit officer, federation officer — exact set per charter).
Each AgentRecord declares the office's `requires-capabilities`, `provides-capabilities`, `system-prompt`, and `model-binding` fields per the existing AgentRecord schema.

This is the substrate-side authoring; the runtime side (AgentRecord Pydantic class, compiler, dispatcher) is already shipped.
The work here is per-office charter-aligned content authoring: read the charter, identify each office's authority and duties, express them as the AgentRecord's frontmatter.

Per [M19](../../milestones/m19-self-developing-pyfars.md), these AgentRecords are what makes PyFARS able to dispatch its own offices to its own work — without them, the substrate names offices but has no agents to fire.

## Acceptance

- [ ] Six AgentRecords exist at `governance/agents/<slug>.md`, one per chartered office.
- [ ] Each carries `requires-capabilities` and `provides-capabilities` derived from the charter's office description.
- [ ] Each carries a `system-prompt` that aligns with the office's duties (verbatim charter quotes preferred over paraphrase).
- [ ] Each binds to an LLM endpoint via the existing `EndpointRouter` capability matching.
- [ ] `pyfars validate governance/agents/` shows no findings on the new records.

## Progress cells

*(empty — task not yet started)*
