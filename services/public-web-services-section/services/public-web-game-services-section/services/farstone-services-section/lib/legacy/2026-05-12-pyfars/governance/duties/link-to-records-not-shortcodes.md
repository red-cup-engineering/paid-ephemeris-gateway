---
title: "Link to records, not shortcodes"
type: jural-relation
kind: duty
active-holder: pyfars-records-officer
passive-party: pyfars-community
scope-action: cross-reference-planning-record
triggering-powers:
  - create-milestone-record
  - create-goal-record
  - create-plan-record
  - create-task-record
required-action: cross-reference-via-markdown-link
enforcement: substrate-violation
rule-type: N→N
theory-basis: [substrate-purity, dispatch-readiness]
---


When cross-referencing a milestone, goal, plan, task, or other substrate record from within another record's body or frontmatter, the records officer MUST use a markdown link resolving to the substrate cell (the file path), not a bare shortcode (e.g., `M3`, `task-15`, `G7`).

A reference written as `M3` or `task-15` is **substrate-opaque**: dispatch and audit cannot resolve it without external knowledge of the shortcode-to-slug mapping.
A reference written as [`m3-continuous-loop`](../../work/milestones/m3-continuous-loop.md) is **substrate-readable**: the file path resolves to a substrate cell that can be loaded, validated, and dispatched.

## Required action

When cross-referencing another record:

1. **Identify the target record's slug**, not its informal shortcode.
  The slug is the filename minus extension; shortcodes (`M3`, `G7`, `task-15`) are workshop notation.
2. **Use a markdown link** with the slug as link text and the relative path as href: `[m3-continuous-loop](../../work/milestones/m3-continuous-loop.md)`.
3. **In frontmatter**, use the slug as the value: `milestone: m3-continuous-loop`, `goal: dispatch-by-cost-quantale`, etc. Frontmatter values are *substrate references*, not display strings.
4. **In body prose**, write the reference as a link, not as plain text.
  "Per [m3-continuous-loop](...)" rather than "Per M3".

## Why

Substrate cells are the source of truth.
Shortcodes are a *projection* of substrate that is convenient for human shorthand but loses information: they don't survive renaming, splitting, merging, or re-numbering.
A milestone called `M3` today may be `M5` after re-prioritization; the substrate cell `m3-continuous-loop.md` is stable.

Worse, dispatch and validation tools consume substrate as a graph.
A reference like `M3` is **not a graph edge**; the tooling sees a string.
A markdown link IS a graph edge: the tooling can resolve it, walk it, validate it, audit it.
Per [`dispatch-readiness`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/dispatch-readiness.md), dispatch's task-frontier computation requires resolvable graph edges; shortcodes break this.

## Examples

**Wrong** (shortcodes): > "Task #15 depends on the M3 dispatch loop.
See goal G7 for design constraints."

**Right** (links): > "[`extend-dispatch-graph-to-compose-cost-axis`](../tasks/engineering/extend-dispatch-graph-to-compose-cost-axis.md) depends on [`m3-continuous-loop`](../milestones/m3-continuous-loop.md)'s dispatch loop.
See [`dispatch-by-cost-quantale`](../goals/dispatch-by-cost-quantale.md) for design constraints."

## Enforcement

Pre-M5: manual.
Code review and audit findings catch shortcode references during the [`applying-roadmap-enrichment`](../skills/applying-roadmap-enrichment.md) skill.

Post-M5: the closure rule system can lint planning records for unlinked references matching shortcode patterns (`/^M\d+$/`, `/^G\d+$/`, `/task-\d+/`) and emit `shortcode-reference-violation` diagnostics.
The [`pyfars audit-roadmap`](../../tools/) tool (planned) includes a shortcode-detection pass.
