---
name: "Authoring a finding record"
description: "Creates a finding record in work/findings/ encoding a structured judgment that compares observed work-state to expected work-state, with variance, cause-configuration, and single-loop-vs-double-loop scope. Use when a review, audit, or enrichment-cycle produces a structured judgment that should be substrate-readable for adjustment-hook consumption."
---


## Requirements

- One or more observation records exist in [`work/observations/`](../../work/observations/) (or substantively-equivalent witnessable cells), or the finding is grounded in directly-named substrate cells.
- An expected baseline exists: a plan record, goal record, or named baseline cell that prescribes what the observed cells should have shown.
- The finding's containing review is namable (the review entity is thin; findings carry the substantive content per the [predwork finding](../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/finding.md) object).

## Steps

1. Read [`work/findings/_index.md`](../../work/findings/_index.md) for the frontmatter schema and the single-loop vs double-loop distinction.
2. **Identify the slug** as a one-line characterization of the variance (e.g., `m2-dispatch-correctness-double-loop`, `cascade-application-2026-05-08`).
3. Author frontmatter with `type: finding`, `status: open | acknowledged | actioned | obsolete`, `observed:` (observation slugs or explicit witness cells), `expected:` (plan/goal/baseline slug or cell), `variance:` (one-line summary; structured form in body), `cause-configuration:` (sub-fiber of contributing factors — *not* a label), `scope: single-loop | double-loop`, `severity: low | medium | high | critical`, `contained-by:` (review slug), `responds-to-via:` (adjustment slugs; populate when loop closes).
4. Author body sections per the index template: *Observed*, *Expected*, *Variance* (structured), *Cause configuration* (witnessing configuration, NOT a label), *Single-loop vs double-loop reading*, *Adjustment hooks*.
5. **Disambiguate single-loop vs double-loop.** Single-loop: the execution did not realize the plan (defective execution).
  Double-loop: the plan executed cleanly but was wrong (defective plan).
  Cite the [Lambek adjunction](../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/morphisms/retrospect-via-cosettling.md) reading.
6. Add the finding slug to the parent review's `contains-findings:` list.

## Outcomes

A new file in [`work/findings/`](../../work/findings/) with `type: finding`, settled observed/expected/variance cells, and a clear single-loop-vs-double-loop scope.
Adjustment authoring can read this finding as a loop-closer's input.

## Discipline notes

- **Cause-configuration is a sub-fiber, not a label.** Per Dekker (2006), labels like "Alice's mistake" or "rate-limit hit" discard the geometry that made the outcome likely.
  The cause-configuration cell carries the *configuration* of contributing factors — system conditions, prior cell-states, missing inputs, exhausted budgets.
  Author it as a list of factor slugs, not as a single string.
- **A finding without a responding adjustment is a lesson observed-but-not-acted-on.** Per [`work/findings/_index.md`](../../work/findings/_index.md)'s "Position in the operations loop" diagram, the adjustment is what closes the loop.
  If a finding is allowed to remain `status: open` indefinitely, escalate via [`surface-friction-as-governance-revision`](../duties/surface-friction-as-governance-revision.md).
- **Cascade-application findings are first-class.** When [`applying-roadmap-enrichment`](applying-roadmap-enrichment.md) emits a cascade-witness finding, it's a substrate audit-record listing what was promoted; future cascade applications can read prior cascade-findings to avoid re-deriving state.
- **Persistent disagreement across observations is a non-trivial $H^1$ class** per [`audit-as-cech-resolution-of-operations-settling`](../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/audit-as-cech-resolution-of-operations-settling.md).
  A finding that names such a disagreement should cite the theorem; this is not a bug-report style finding but an algebraic-structure-of-disagreement finding.
