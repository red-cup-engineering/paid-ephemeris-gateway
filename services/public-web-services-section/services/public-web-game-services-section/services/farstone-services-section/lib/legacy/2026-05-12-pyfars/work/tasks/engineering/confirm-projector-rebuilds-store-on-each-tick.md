---
title: "Confirm the projector rebuilds the store on each tick"
type: task
area: engineering
status: open
horizon: later
milestone: m5-agential-self-generation
goal: new-skill-records-dispatchable-next-tick
depends-on: []
requires-capabilities: [python-editing, projector-framework]
theory-basis: [projector-framework-counit, tick-as-iteration]
---


## Description

Verify the existing infrastructure: each tick's boot phase fully re-projects the substrate into a fresh `pypredcalc.
PredicationStore`.
This SHOULD already be the case; if it isn't, the runtime is caching state across ticks in a way that breaks substrate-writability.

Read `runtime/lifecycle.py`'s boot node and `runtime/projector_framework.py` (or the projector entry point).
Confirm:

1. Each tick reads the full set of authored records from disk.
2. The store is built fresh; no carryover from the prior tick (except via authored cells in the substrate, which is the correct path).
3. New records on disk since the last tick appear in the new store.

If the implementation already satisfies these, this task closes with a regression test ([`test-mid-tick-skill-authorship-and-next-tick-dispatch`](test-mid-tick-skill-authorship-and-next-tick-dispatch.md)).
If it doesn't, document the gap and open follow-on tasks.

## Acceptance

- [ ] A code-review note at [`work/findings/`](../../../work/findings/_index.md) documenting the projector's per-tick rebuild behavior.
- [ ] Either: confirmation that the property holds (with code paths cited), OR a finding record listing the gaps and follow-on tasks.
- [ ] Cited code paths exist: `runtime/lifecycle.py:boot_node`, `runtime/projector_framework.py:project`.

## Progress cells

*(empty — task not yet started)*
