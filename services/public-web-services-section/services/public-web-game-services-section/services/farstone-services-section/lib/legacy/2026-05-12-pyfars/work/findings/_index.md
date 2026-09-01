---
title: "Findings"
type: index
status: active
realizes: [finding]
---


Structured judgments comparing observed work-state to expected work-state.
A finding is the substrate-entity produced by a [review](../reviews/_index.md): the observed cells (from [observations](../observations/_index.md)) compared against the expected cells (from a [plan](../plans/_index.md), goal, or baseline), with a structured variance, a witnessing cause-configuration, and a scope (single-loop vs double-loop).

Findings are first-class entities reviews *contain*; per the predwork [finding](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/finding.md) object, the review entity is thin and the findings carry the substantive content.

## Frontmatter

```yaml
---
title: "<one-line characterization>"
type: finding
slug: <kebab-case>
status: open | acknowledged | actioned | obsolete
observed: [<observation-slug-or-explicit-witness>]   # what the actual state was
expected: <plan-slug or goal-slug or baseline-cell>   # what the expected state was
variance: <one-line summary; structured form in body>
cause-configuration: [<contributing-factor-slugs>]    # NOT a label; sub-fiber of factors
scope: single-loop | double-loop
severity: low | medium | high | critical
contained-by: <review-slug>                           # the review that grouped this finding
responds-to-via: [<adjustment-slug>]                  # adjustments queued or written; populated when loop closes
---
```

## Body sections

```markdown
## Observed
What the substrate's read showed. Cite specific cells, log entries, or observation
records.

## Expected
What the plan, goal, or baseline cell prescribed. Cite the source.

## Variance
The structured gap. Numerical when scalar; otherwise a sub-fiber.

## Cause configuration
A *witnessing configuration* — sub-fiber of contributing factors and system
conditions, NOT a label like "Alice's mistake". Per Dekker (2006), labels
discard the geometry that made the outcome likely.

## Single-loop vs double-loop reading
Which side of the Lambek adjunction this finding sits on. Single-loop: the
execution did not realize the plan. Double-loop: the plan executed cleanly but
was wrong.

## Adjustment hooks
What adjustments would close this loop. Reference `work/adjustments/` records
when written.
```

## Position in the operations loop

```
plan ─→ execution ─→ observation ─→ FINDING ─→ adjustment ─→ next plan
                                       ↑                          │
                                       └──────────────────────────┘
```

A finding without a responding adjustment is a lesson observed-but-not-acted-on.
The adjustment is what closes the loop.

## Theory grounding

- [Predwork finding](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/finding.md) — the formal definition; this index follows its frontmatter shape.
- [Audit-as-Čech-resolution](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/audit-as-cech-resolution-of-operations-settling.md) — findings are 1-cocycles; persistent disagreement across observations is a non-trivial $H^1$ class.
- [Retrospect-via-cosettling](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/morphisms/retrospect-via-cosettling.md) — the morphism that produces findings from observation traces.

## Related

- [Observations](../observations/_index.md) — the inputs to findings
- [Reviews](../reviews/_index.md) — the containers
- [Adjustments](../adjustments/_index.md) — the loop-closers
