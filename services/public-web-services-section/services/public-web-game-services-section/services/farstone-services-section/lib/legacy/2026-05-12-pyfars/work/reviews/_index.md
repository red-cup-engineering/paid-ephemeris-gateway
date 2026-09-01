---
title: "Reviews"
type: index
status: active
realizes: [review]
---


Containers for [findings](../findings/_index.md).
Per the [referencing-entity pattern](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/referencing-entity-pattern.md), the review entity is **thin** — context, scope, cadence cells — while the findings carry the substantive content.

A review is what you author when you're producing more than one finding at a time: an audit run, a milestone retrospective, a stage-gate decision moment.

## When to author one

- **Audits** — substrate-state correctness checks producing a series of findings (e.g., a [`m2-substrate-dispatch`](../milestones/m2-substrate-dispatch.md) dispatch-correctness audit).
- **Retrospectives** — at a milestone or plan boundary, synthesizing observations into findings (e.g., a [`m3-continuous-loop`](../milestones/m3-continuous-loop.md) launch retrospective).
- **Stage-gate moments** — a single review that says "should we proceed?" with one or more findings supporting the decision.

## Frontmatter

```yaml
---
title: "<review name>"
type: review
slug: <kebab-case>
status: open | published | actioned | obsolete
scope: <one-line scope statement>
cadence: one-shot | weekly | monthly | quarterly | per-milestone
findings: [<finding-slug>, ...]                # populated as findings are written
covers-period: <ISO-date-or-range>
authored-by: <office-or-personnel-slug>
---
```

## Body sections

```markdown
## Scope
What this review covered. What it deliberately did NOT cover.

## Method
How the review was conducted. Cite tracking morphisms or audit skills used.

## Findings
List of finding-slugs, each with a one-line headline. Substantive content is
in each finding's record.

## Summary
Aggregation across findings: severity distribution, dominant cause-configurations,
recommended adjustments.
```

## Theory grounding

- [Predwork finding](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/finding.md) — review-as-container is described in §"Algebraic role: container and the contained".
- [Audit-as-Čech-resolution](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/audit-as-cech-resolution-of-operations-settling.md) — an audit's findings are 1-cocycles; persistent disagreement across observations is a non-trivial $H^1$ class.

## Related

- [Findings](../findings/_index.md) — reviews contain findings
- [Adjustments](../adjustments/_index.md) — adjustments respond to findings
