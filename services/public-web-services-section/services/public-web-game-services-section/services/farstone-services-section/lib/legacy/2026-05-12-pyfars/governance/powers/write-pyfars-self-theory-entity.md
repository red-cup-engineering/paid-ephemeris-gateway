---
title: "Write PyFARS self-theory entity"
type: jural-relation
kind: power
active-holder: self-theory-author
passive-party: pyfars-community
scope-action: create-or-modify-file
scope: pyfars/
duties: [write-in-correct-derivation-layer]
theory-basis: [jural-relation, normative-operational-layering]
---


Admits the holder to create or modify a file under `pyfars/`.
Covers entries in any of the type subdirectories: `concepts/`, `objects/`, `morphisms/`, `claims/`, `questions/`, `examples/`, `prose/narratives/`, `prose/remarks/`, `references/`.

## Attached duties

- `write-in-correct-derivation-layer` fires on every use: a write under this power must land in `pyfars/` and must place the entity in the correct subdirectory per its `type:` frontmatter.
  Writing a `type: claim` entity into `concepts/` is a substrate violation.

## Does not cover

- Writing to upstream theory directories (`theories/.../predication-categories/`, etc.) — the self-theory author has read-only access there and must escalate gaps via `escalate-when-theory-gap-found`.
- Writing to `pyfars/governance/` (separate power: `create-governance-record`, held by `pyfars-records-officer`).
- Writing to `pyfars/work/` (separate power: `create-work-record`, held by `pyfars-records-officer`).
- Writing to PyFARS source code (separate power held by `pyfars-developer`).

## Why a separate power

PyFARS self-theory is a distinct write-domain from external theory derivation, governance records, work records, and source code.
Each domain has its own authority chain and its own correctness conditions.
Granting one office the write-pyfars-self-theory-entity power without granting it write power over the others maintains the separation that makes substrate-purity and the audit trail tractable.
