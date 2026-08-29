---
type: morphism
class: work-cycle-spoke
status: draft
depends-on: [work-record, work-status, witness, retrospect-via-cosettling]
realizes: [retrospect-via-cosettling]
---

# Review

The morphism that retrospects on completed [work-records](../concepts/work-record.md) — examining the witness chain to extract findings, surface patterns, generate instincts (reusable judgments), and propose adjustments to the polity's system or governance.
The sixth spoke of the work cycle, closing the loop and feeding into future intake.

Realizes the upstream [retrospect-via-cosettling](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/morphisms/retrospect-via-cosettling.md) at the work-record-retrospection scope.

## Action

For a completed work-record $W$ (or a set of completed work-records):

$$\mathrm{review}(W) \;\longrightarrow\; \text{Findings}, \text{Adjustments}$$

where: - **Findings** are observations extracted from $W$'s witness chain — what worked, what didn't, what surprised the actors, what patterns repeat across similar work-records. - **Adjustments** are proposed system changes — new closure rules, revised office capabilities, refined skill descriptions, captured instincts (reusable judgments encoded as system content), governance revisions per the [`surface-friction-as-governance-revision`](../governance/duties/surface-friction-as-governance-revision.md) duty.

The findings and adjustments are themselves system content — they're work-records (or theory entries, or governance notes) produced via witnesses.
Review's output feeds back into intake.

## Composition

Review composes after witness-completion and feeds into intake (closing the loop):

$$\mathrm{witness\text{-}completion} \to \mathrm{review} \to (\mathrm{intake \;of\; new \;work})$$

Review may fire on: - A single completed work-record (immediate review). - A batch of related records (retrospective at sprint or watch boundaries). - The polity-as-a-whole at recurrence boundaries (annual review, generation-shift retrospect).

## What this morphism commits to

1. **Findings are system-tracked**.
  A finding is not stored as ephemeral session-state; it's witnessed as a record (or work-record).
  Future agents reading the polity's system find the findings.
2. **Adjustments are explicit**.
  Review's adjustments are proposed as system transitions — new cells, new rules, new records — not as silent corrections.
  The proposals are auditable.
3. **No silent reformatting**.
  Review does not "tidy up" past witness chains.
  Witnesses remain immutable; review's outputs are *new* system content responding to the witnesses.

## What this morphism does not do

- It does not re-execute completed work.
  Completed is completed; if a finding suggests redoing the work, that's a new intake.
- It does not modify settled outcomes.
  A work-record marked `settled` stays settled; review's findings about it are separate system content.
- It does not assign blame.
  A finding describes what happened; assigning responsibility for an outcome is a separate (and rare) governance act.

## Implementation pointer

The current `review.py` and `feedback.py` work spokes provide partial functionality.
The refactor consolidates them into a system-driven morphism whose closure rules can fire automatically (e.g., produce a finding when a work-record's actual-skill-set diverged from its requires-skill-set, suggesting either skill-set drift or work-classification drift).

## Open structural questions

- The cadence of review.
  Per-record vs. per-sprint vs. per-generation.
  Most polities will want a mix; the discipline is policy.
- The relationship to *instincts* — pattern-matched judgments captured for reuse across many future work-records.
  An instinct is a kind of finding that's been validated enough to be substrate-encoded as a closure rule.
  The promotion-from-finding-to-instinct discipline is open.
- Cross-polity review.
  When polities federate, can one polity's reviews inform another?
  The discipline for cross-polity finding-sharing is open.
- The relationship to audit.
  Audit verifies that work was done correctly; review reflects on what to do differently.
  The two are related but distinct; their composition is open.
