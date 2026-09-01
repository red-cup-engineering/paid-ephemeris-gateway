---
type: object
title: "PyFARS"
status: draft
specializes: flatfile-agentic-resource-system
models: closure-2-monad
animates: polity-as-image
produces: polity-as-instance
commits-to:
  - substrate-purity
  - markdown-as-projection
  - jsonl-is-canonical-state
---


PyFARS is **the engine**: the active execution-component that binds to a polity-as-image (a directory-rooted directory at rest) and animates it into a polity-as-instance (the running system with clock ticking, agents pulsing, witnesses appending).
Mathematically, PyFARS is *a concrete realization of the closure 2-monad on the system's predication-fibration*.
Settlement, transactions, compaction, opportunistic scheduling, wavefront propagation, and federation merge are all the same closure-2-monad iteration on different sub-fibrations of the substrate; PyFARS implements that iteration in Python.

## Position

PyFARS specializes the FARS theory — the specification of any agential-orchestration platform whose predication-graph store is a directory of frontmatter-markdown files.
FARS is the spec; PyFARS is the spec's Python realization.
Multiple conformant realizations of FARS are admissible; PyFARS is the one this polity currently binds.

## What PyFARS does

As engine bound to a polity-image, PyFARS:

- **Loads the polity-image** — a directory-rooted directory carrying a substrate, its governance, its event log, its rule-set, and its content.
- **Ticks the clock** — the heartbeat-cycle morphism advances the system's closure-2-monad iteration.
- **Fires triggers** and drives subscribers' pulses.
- **Runs settling** — closure-rule-system applications until quiescence or fuel exhaustion.
- **Dispatches work** — assignment cells emitted to capable agents under capability-match and authority-check.
- **Logs witnesses** — every state transition produces a Witness record appended to the JSONL log.
- **Hosts external surfaces** — CLI, MCP, programmatic API.

## Substrate-algebraic content

Per `substrate-runtime-as-closure-driven-settling`, PyFARS's named runtime concerns each reduce to closure-2-monad iteration on a sub-fibration of the system's full predication-fibration:

| Runtime concern | Sub-fibration |
|---|---|
| Settlement | Full content fiber |
| Transactions | Transaction-bracketed sub-fiber |
| Compaction | Event-log fiber |
| Opportunistic scheduling | Orchestration sub-fibration (work-items + resource-state + feasibility) |
| Wavefront propagation | Predication sub-fibration's wavefront-frontier |
| Federation merge | Multi-replica network-sheaf |

PyFARS does not have separate machinery for each — the same closure-rule machinery applied to different sub-regions.
The runtime is one runtime; properties compose across surfaces; recovery is recovery of the whole runtime simultaneously.

## Load-bearing commitments

PyFARS commits to three claims about its substrate, each itself a substrate atom in PyFARS's self-theory:

- `substrate-purity` — PyFARS does not modify system state outside explicit substrate-transitioning verbs whose modifications are recorded as witness events in the JSONL log.
- `markdown-as-projection` — the corpus-as-flatfile (the tree of frontmatter-markdown notes) is a projection of system state, not the canonical state.
  Canonical state is the JSONL event log.
- `jsonl-is-canonical-state` — the substrate at time τ is fully specified by the JSONL event log up to τ plus the closure-rule-system version active at τ.

These three together make PyFARS-administered polities replayable, time-travelable, auditable, recoverable, and federable.

## Polity-engine binding

A PyFARS *instance* is the binding of the engine to a specific polity-image.
The same engine can boot multiple polities (sequentially or concurrently); the same polity can be booted by different engines (PyFARS now, a future re-implementation later) and produce the same system state — substrate is a function of the JSONL log and the closure-rule-system, not of the engine's implementation choices.

The polity at `/home/emsenn/561/` is a PyFARS instance.
PyFARS-as-package at `tools/platform/pyfars/` is itself a sub-polity — directory-rooted, with its own governance, event log, and content.

## Status

Draft.

## The frontmatter, read as predication cells

Each frontmatter key is a predicate; each value is its target.
Every line is a cell `(pyfars, predicate, target)`.

- `(pyfars, specializes, flatfile-agentic-resource-system)` — the predicate-specialization morphism from predication-categories.
  PyFARS is a more-concrete instance of the FARS spec.
- `(pyfars, models, closure-2-monad)` — the categorical-logic model relation.
  PyFARS is a structure-preserving realization of the closure-2-monad in Python; cell asserts that the math morphism has a concrete realization here.
- `(pyfars, animates, polity-as-image)` — engine-image binding.
  PyFARS, bound to a polity-image, drives its closure-2-monad iteration forward.
- `(pyfars, produces, polity-as-instance)` — reified-relation morphism (per the predication-categories `produces` generator).
  PyFARS, while animating the image, produces the polity-as-instance substrate-entity.
- `(pyfars, commits-to, substrate-purity)` — PyFARS adopts the substrate-purity claim as load-bearing for itself.
- `(pyfars, commits-to, markdown-as-projection)` — same, for the markdown-as-projection claim.
- `(pyfars, commits-to, jsonl-is-canonical-state)` — same, for the canonical-state claim.

Several of these predicates do not yet have their own predicate-definition atoms — `models`, `animates`, `commits-to`.
That's a refinement to author, not a prerequisite to using the predicate.
The cells exist now; their formal definitions accumulate as substrate atoms over time, and the crawler will resolve them as such atoms get authored.
