---
title: "Adjustments"
type: index
status: active
realizes: [adjustment]
---


Changes to plans, rules, or operating parameters that respond to a [finding](../findings/_index.md) — the loop-closer in `plan → execution → observation → finding → ADJUSTMENT → next plan`.

A finding without a responding adjustment is a lesson observed-but-not-acted-on.
The adjustment is what moves the substrate from "we noticed" to "we changed".

## When to author one

- A finding's variance or severity warrants a change to a plan, rule, threshold, schedule, or skill.
- An auto-detected anomaly (a `⊤` cell from [`m3-continuous-loop`](../milestones/m3-continuous-loop.md)'s anomaly-surfacing path) needs a substrate-visible response.
- A retrospective recommends a process change.

## Adjustment vs. modification

An *adjustment* records a deliberate, finding-justified change.
A modification (an edit to a record because of a typo, a rename, an organizational tweak) is just an edit.
Adjustments are first-class because their *justification* is the load-bearing fact — what finding's variance the change closes.

## Frontmatter

```yaml
---
title: "<one-line: what changed>"
type: adjustment
slug: <kebab-case>
status: proposed | adopted | reverted | superseded
responds-to: [<finding-slug>, ...]              # the findings this adjustment addresses
applies-to: <record-slug-or-rule-slug>          # what is being changed
change-kind: revise-plan | revise-rule | revise-threshold | revise-cadence | revise-skill | retire | other
adopted-at: <ISO-timestamp-when-applied>
reverted-by: <adjustment-slug>                  # if this adjustment was reverted
---
```

## Body sections

```markdown
## What changed
The before-state and after-state of the modified record. Cite specific
frontmatter fields or rule cells.

## Justification
The findings this responds to, and how the change closes their variance. Cite
each finding-slug.

## Risks
What this adjustment might break or unbalance. Especially relevant for rule
or threshold changes (the budget-window flip, the rate-limit ceiling).

## Reversion plan
Under what conditions this adjustment should be reverted, and how.
```

## Theory grounding

- [Predwork adjustment](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/adjustment.md) — the formal substrate-entity definition.
- [Operations-loop](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/operations-loop.md) — adjustments close the loop.

## Related

- [Findings](../findings/_index.md) — adjustments respond to findings
- [Reviews](../reviews/_index.md) — adjustments often follow reviews
