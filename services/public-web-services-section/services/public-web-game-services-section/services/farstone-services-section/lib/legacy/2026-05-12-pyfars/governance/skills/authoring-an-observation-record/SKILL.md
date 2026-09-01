---
name: "Authoring an observation record"
description: "Creates an observation record in work/observations/ encoding a derived reading of substrate state at a point in time, with fiber-isolation discipline. Use as anchors for runtime emission (the engine's projector emits per-cycle observations against this anchor) or for hand-authored manual readings of substrate state."
---


## Requirements

- The observed entity (task, plan, office, endpoint, etc.) exists in the substrate.
- The reading method is namable — either a tracking morphism, a query, or a manual observation by the captain or an officer.
- The Stevens scale of the value (nominal / ordinal / interval / ratio) is determined.

## Steps

1. Read [`work/observations/_index.md`](../../work/observations/_index.md) for the frontmatter schema and the fiber-isolation discipline.
2. **Identify the slug** as `<observed-thing>-at-<time-or-cadence>` (e.g., `claude-api-rate-limit-at-2026-05-08T1037`, `dispatch-graph-tick-cadence`).
3. Author frontmatter with `type: observation`, `observes:` (slug of observed entity), `observed-at:` (ISO timestamp or cadence-window), `method:` (tracking morphism slug or query identifier), `value:` (scalar or sub-fiber reference), `baseline:` (expected value or $\bot$), `scale:` (Stevens scale — nominal / ordinal / interval / ratio), `status: settled | open`.
4. Author body sections per the index template: *What was read*, *Method*, *Baseline*, *Variance from baseline* (if applicable).
5. **Do not write back to the observed entity's frontmatter.** The observation references the observed entity via `observes:`; the observed entity does *not* gain a `velocity:` or `status:` cell from the reading.
  This is the substrate-algebraic implementation of Goodhart's law.

## Outcomes

A new file in [`work/observations/`](../../work/observations/) with `type: observation`, fiber-isolated from the observed entity.
Findings and reviews can consume this observation as input; aggregation operations can compose with it (subject to scale-constraint guards).

## Discipline notes

- **Hand-authored observations are the exception.** Most observations are emitted by tracking morphisms on cadence.
  Hand-author one only when (a) creating an anchor for runtime emission to bind to, or (b) capturing a manual reading the captain or officer noticed.
- **Stevens scale is a composition guard, not metadata.** Per [`work/observations/_index.md`](../../work/observations/_index.md), aggregation operations carry `requires-scale:` constraints.
  An observation with a wrong scale produces $\top$ on the result cell when composed — failure is *visible*, not silent.
- **Observations don't converge.** The observation fiber is cyclically rebuilt; older observations remain in the log for audit but newer ones drive the working-model projection.
  Don't update an existing observation in place; author a new one with a later `observed-at:`.
- **Per [`link-to-records-not-shortcodes`](../duties/link-to-records-not-shortcodes.md)**, the `observes:` cell value uses the observed entity's slug, and any body-prose reference uses a markdown link to the substrate cell.
