---
title: "Encode research-flow records between theories"
kind: task
type: task
area: research
status: open
horizon: captured
milestone: m5-agential-self-generation
depends-on: [rename-theory-terminology-to-predicated-agentics]
note: "Captured here; actual work is in the 561 theory directories and PyFARS governance records."
---


## Description

The theory derivation chain is currently implicit — you have to know to follow the path from predication-categories through predicated-computing to predicated-agentics to FARS spec.
None of those layers has explicit "feeds-into" or "derives-from" records that make the research flow machine-readable.

This task is to encode research-flow records: substrate records that explicitly state the derivation relationship between theory layers, so that:

1. The theory-derivation-loop (documented in `work/theory-derivation-loop.md`) can be executed autonomously — an agent can walk the `feeds-into:` graph to find new theory and follow it down to PyFARS.
2. The `deriving-pyfars-development-goals` skill has a structured graph to traverse, not just a prose description of the chain.
3. PyFARS closure rules can check that every milestone/goal record's `theory-basis:` slugs actually exist in the theory graph.

**Research flow that needs to be encoded:**

```
agentic-computing (external, prior art)
  → predication-categories (our math foundation)
    → predicated-computing (our engineering foundation)
      → predicated-agentics (formerly agential-orchestration-platform)
        → flatfile-agentic-resource-system (FARS spec)
          → pyfars (Python implementation)
```

Each `→` should be a substrate record with fields: `derives-from:`, `feeds-into:`, `derivation-class:` (mathematical / engineering / implementation).

## Why captured here

This is research-infrastructure work that unblocks autonomous theory derivation (M5).
It requires the theory renaming to be done first so slugs are stable.
Captured in PyFARS records as the primary beneficiary of this work.

## Acceptance

- [ ] Research-flow records exist for each edge in the chain above.
- [ ] `deriving-pyfars-development-goals` skill can be updated to reference the `feeds-into:` graph.
- [ ] `pyfars context <theory-slug>` includes the research-flow neighbors.
- [ ] At least one autonomous theory-derivation-loop run uses the research-flow graph (not prose instructions) to find new theory.

## Progress cells

*(empty — task not yet started)*
