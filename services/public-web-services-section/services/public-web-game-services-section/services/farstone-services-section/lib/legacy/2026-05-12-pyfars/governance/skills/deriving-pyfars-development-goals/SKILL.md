---
name: "Deriving PyFARS development goals"
description: "Traces the FARS spec against the current PyFARS implementation to produce a named list of goals, each grounded in the theory slug that explains why the gap exists. Use when creating milestone or goal records."
---


## Requirements

- Access to `theories/.../flatfile-agentic-resource-system/` and `src/pyfars/`
- `pyfars search` and `git log` available

## Steps

1. Find recently added or changed theory entities in predication-categories or predicated-computing (`git log -- theories/...
  `).
2. For each, trace the derivation chain down through AOP to the FARS spec — stop at the first layer that names a concrete operational object.
3. Check whether that FARS spec object is implemented in `src/pyfars/`.
  If not, that is a gap.
4. Name each gap as a goal: what PyFARS will do after this goal is complete, plus the theory slug that grounds it.

## Outcomes

A list of named goals, each with a slug, one-line description of the new capability, and at least one theory slug.
Ready to become goal records.
