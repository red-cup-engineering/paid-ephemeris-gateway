---
type: definition
class: system-entity
status: draft
realizes: [scheduling-policy]
depends-on: [selection-by-load, instinct-cell, dispatch-closure-rule-system, predication-cell]
implementation: pyfars.runtime.eligibility_rules._instinct_aware_selection
---

# Instinct-aware selection

The substrate-cell projection of a selection rule that extends [`selection-by-load`](selection-by-load.md) with an instinct-cell lookup: when ranking eligible candidates for a workitem, the rule reads the candidate's [instinct cells](instinct-cell.md) relevant to the workitem class, computes an instinct score, and uses that score as a tie-breaker (or primary criterion, per polity policy) above raw load balancing.

This object is the load-bearing realization of the [memory-feedback loop](../questions/memory-feedback-self-generation-and-failure-modes.md): observations from past sessions consolidate into instinct cells; instinct cells feed selection; selection improves over time.
Without this rule, the loop is open — observations flow in but selection ignores them.

## Markdown shape

A polity activates instinct-aware selection by carrying this object's record, plus selecting a scoring discipline:

```markdown
---
type: instinct-aware-selection
slug: instinct-aware-selection
scoring-discipline: confidence-weighted-recent
recency-window: 7-days
confidence-floor: 0.3
fallback-on-no-instinct: selection-by-load
---
```

## Cells

The selection rule's frontmatter projects:

- `(rule-slug, type, "instinct-aware-selection") = t`
- `(rule-slug, scoring-discipline, <name>) = t` — `confidence-weighted-recent` (default), `peak-confidence`, `mean-confidence`.
- `(rule-slug, recency-window, <duration>) = t` — instinct cells older than this window are excluded.
- `(rule-slug, confidence-floor, <real>) = t` — instincts below this confidence-as-closure-measure are excluded.
- `(rule-slug, fallback-on-no-instinct, <rule-slug>) = t` — which rule to fall back to when no relevant instinct exists.

## How selection runs

For a workitem $W$ with class $K$ and a candidate $C$:

1. **Read relevant instincts.** Query `(instinct, of-candidate, C) ∧ (instinct, applies-to-class, K) ∧ (instinct, recorded-at, ?ts) ∧ ?ts > now - recency-window ∧ (instinct, confidence, ?conf) ∧ ?conf >= confidence-floor`.
2. **Compute instinct score.** Per the scoring discipline:
   - **`confidence-weighted-recent`** — score is sum over instincts of `confidence × recency-weight`, where recency-weight decays linearly from 1.0 (now) to 0.0 (recency-window-edge).
   - **`peak-confidence`** — score is max confidence across relevant instincts.
   - **`mean-confidence`** — score is arithmetic mean of confidences.
3. **Combine with load.** Selection picks the candidate at $\leq_t$-maximum where the score is `(instinct-score, load-deficit)` lexicographic — instinct breaks ties first, load breaks ties second.
4. **Emit cells.**
   - `(W, instinct-score-with, C, <score>) = t`
   - `(W, selected-by, instinct-aware-selection) = t`

## Scoring-discipline rationale

The three disciplines correspond to three policies on instinct evidence:

- **`confidence-weighted-recent`** (default) — recent strong instincts dominate; old weak instincts contribute little.
  Aligned with the substrate-algebra view that confidence is a [closure-measure](instinct-cell.md) and stale instincts have unbounded uncertainty.
- **`peak-confidence`** — one strong instinct is enough; useful for binary decisions (is this candidate trustworthy on this class?).
- **`mean-confidence`** — averages out outliers; useful for noisy instinct streams.

A polity may carry multiple instinct-aware-selection records with different disciplines, scoped by workitem-class.

## Composition with twist-product dispatch

When [`dispatching-by-twist-product-fusion`](../morphisms/dispatching-by-twist-product-fusion.md) computes match-strength, the resulting bilattice value carries authorization-status.
Instinct-aware-selection runs *after* match-strength filters out $\mathbf{f}$-candidates: it ranks among $\mathbf{t}$-candidates and $\bot$-candidates by instinct score.
This composition keeps the two layers cleanly separated — authorization is bilattice-driven; ranking among the authorized is instinct-driven.

## What this object commits to

1. **Memory feedback closes the loop.** The selection rule reads instinct cells; observation cells from completed work feed instinct consolidation; the next dispatch tick sees updated instincts.
  No external "memory store" — system is the memory.
2. **Polity-scoped scoring.** The scoring discipline is a polity decision; different polities may rank by different criteria.
3. **Graceful fallback.** When no relevant instinct exists (fresh polity, novel workitem class), the rule falls back to `selection-by-load`.
  The substrate does not refuse to dispatch when memory is empty.

## What this object does not specify

- Cross-class instinct transfer (instincts about class $K_1$ applying to class $K_2$ when classes are taxonomically related).
  Currently per-class only; cross-class transfer requires a system-resident class-similarity record.
- Negative-example weighting.
  An instinct of "candidate failed at this class" lowers the score; an instinct of "candidate succeeded" raises it.
  Currently both contribute via the confidence cell's polarity; whether to expose explicit positive/negative weighting cells is open.
- Federation-portable instincts.
  Two peers' instincts about a shared candidate may differ; whether to merge per-peer instincts via $\vee_k$ at federation merge or carry them separately is open for [M6](../work/milestones/m6-federation.md).
- Instinct-decay curves beyond recency-window.
  Currently linear-decay-to-zero; exponential decay or step-function are the candidates for finer policies.
