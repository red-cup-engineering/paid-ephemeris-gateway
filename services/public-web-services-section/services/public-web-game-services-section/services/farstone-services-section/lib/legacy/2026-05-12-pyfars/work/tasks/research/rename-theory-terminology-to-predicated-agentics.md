---
title: "Rename theory terminology: agents→agentics, agential-orchestration→predicated-agentics"
kind: task
type: task
area: research
status: open
horizon: captured
milestone: m5-agential-self-generation
depends-on: []
note: "Captured here so it isn't lost. Actual work is in the 561 theory directories, not PyFARS source."
---


## Description

The theory stack uses "agents" and "agential orchestration platform" as its terminology, but those names don't carry the predication-theory origin of the concepts.
The correct names, which would let the research flows between theories compose properly, are:

- `agents` → `agentics` (the study/theory of agentic systems, not just the agents themselves)
- `agential-orchestration-platform` → `predicated-agentics` (the platform theory is derived from predication, so its name should reflect that)

These renames need to propagate through: - `/theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/` — directory rename and all internal slugs - All `depends-on:` references from other theories that cite the old slugs - PyFARS records that reference AOP slugs (including `theory/`, `work/references/theory-for-developers.md`) - PyFARS source docstrings that reference the AOP theory

The theory renaming is what allows the research flow to be legible as a chain: `predication-categories → predicated-computing → predicated-agentics → flatfile-agentic-resource-system`.
Right now "agential-orchestration-platform" breaks the naming pattern.

## Why captured here

This is a 561-repo theory task, not a PyFARS implementation task.
It's captured in PyFARS records because it was identified during PyFARS governance work and will unblock M5 theory derivation.
When the rename is complete, update `work/references/theory-for-developers.md` to use the new theory slugs.

## Acceptance

- [ ] `theories/.../predicated-computing/theories/predicated-agentics/` exists (formerly `agential-orchestration-platform/`)
- [ ] All internal theory slugs updated, `pyfars validate` on the theory directory shows no broken links from the rename.
- [ ] `theory-for-developers.md` updated with new slugs.
- [ ] PyFARS source docstrings updated where they reference AOP theory.

## Progress cells

*(empty — task not yet started)*
