---
title: "Governance records use jural-relation schema"
type: decision
status: committed
date: "2026-05-07"
theory-basis: [jural-relation, normative-operational-layering, office-as-double-settlement]
---


## What

Power, duty, privilege, and immunity records in `governance/` use `type: jural-relation` as the primary substrate type, with `kind: power / duty / privilege / immunity` for sub-classification.
Every such record carries `active-holder:`, `passive-party:`, and `scope-action:` per the `jural-relation` object definition.

## Why

The `jural-relation` theory (predicated-governance) says that Hohfeldian normative relations are first-class substrate entities with a defined set of cells: `kind`, `active-holder`, `passive-party`, `scope-action`, `correlate-of`.
Using `type: power` or `type: duty` instead of `type: jural-relation` with a `kind:` sub-classifier: - Loses the uniform query path: `pyfars list --type jural-relation` is the substrate-correct way to retrieve all normative standing records - Prevents the closure rules from treating all jural relations uniformly - Violates the `normative-operational-layering` commitment that normative predicates share a coherent structure

The harness can always flatten `jural-relation` records to "agent capabilities" for LLM consumption.
The substrate should carry the full structure.

## Rules out

- Using `type: power` as the primary classifier on power records.
- Using `type: duty` as the primary classifier on duty records.
- Using `kind: power` without `type: jural-relation`.

## Does not constrain

- How harnesses project jural-relation records to agents (they may flatten to capability lists).
- Whether skill records, office records, or decision records use `type: jural-relation` — they are different entity types and keep their own `type:` values.
- The `scope:` field (filesystem path the jural relation covers) — it is a PyFARS-specific elaboration alongside the theory's `scope-action:`.
