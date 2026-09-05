---
title: "Extend on-complete emission to learning outputs"
type: task
area: engineering
status: open
horizon: later
milestone: m5-agential-self-generation
goal: on-complete-cycles-into-learning
depends-on: [implement-on-complete-followon-emission]
requires-capabilities: [python-editing, dispatch-graph]
theory-basis: [continuous-learning-loop, workflow-composition]
---


## Description

Today's on-complete handler ([from M3](../../goals/on-complete-follow-on-intents.md)) emits follow-on workitems.
Extend it to also handle **learning outputs**: when a workitem's `on-complete:` declares `author-skill: <spec>`, `author-runbook: <spec>`, or `author-norm: <spec>`, the handler writes the corresponding substrate record (with provenance back to the workitem and the agent's incumbency).

The writing is *substrate write*, not just witness emission: the new record lands at `governance/skills/<slug>.md` (or runbooks/, norms/), valid frontmatter, full body.
The next tick reads it as canonical.

## Acceptance

- [ ] The on-complete handler accepts `author-skill`, `author-runbook`, `author-norm` declaratively.
- [ ] Each authored record carries `derived-from-workitem:` and `derived-by:` (the incumbent slug).
- [ ] Authority check: writing requires the authoring power; absent it, emit ultra-vires (per [`emit-ultra-vires-witnesses-on-out-of-jurisdiction-acts`](emit-ultra-vires-witnesses-on-out-of-jurisdiction-acts.md)).
- [ ] Tests cover: skill authoring on-complete, runbook authoring, norm authoring; one without authority fails ultra-vires.

## Progress cells

*(empty — task not yet started)*
