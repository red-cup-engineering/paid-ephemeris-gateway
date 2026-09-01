---
title: "Document skill-authorship-mid-session as a substrate norm"
type: task
area: governance
status: open
horizon: later
milestone: m5-agential-self-generation
goal: new-skill-records-dispatchable-next-tick
depends-on: [test-mid-tick-skill-authorship-and-next-tick-dispatch]
requires-capabilities: [norm-authoring]
theory-basis: [norm, agential-self-generation]
---


## Description

Author a [norm](../../../governance/norms/_index.md) record at `governance/norms/skills-authored-this-tick-live-next-tick.md`.
The norm states (Per): an agent with the relevant authoring power may write a new skill record at any tick boundary; the new skill is live in the dispatch graph at the start of the *next* tick.

This formalizes the cadence rule for federated peers and downstream consumers: don't expect the skill to be live in the same tick as its authoring; do expect it on the next tick.

The norm references [`new-skill-records-dispatchable-next-tick`](../../goals/new-skill-records-dispatchable-next-tick.md) as its operational realization, and the regression test as its enforcement witness.

## Acceptance

- [ ] `governance/norms/skills-authored-this-tick-live-next-tick.md` exists with frontmatter conformant to the [norms _index](../../../governance/norms/_index.md).
- [ ] Deontic operator: `Per` (permission) for the authoring; the cadence rule is the conditional content.
- [ ] Authority-grounding: charter-c3-agential-self-generation.
- [ ] Body explains the test-as-witness relationship.

## Progress cells

*(empty — task not yet started)*
