---
title: "Cost discipline as substrate cells"
type: goal
milestone: m7-boundary-handedness-and-outbound-endpoints
status: open
horizon: captured
theory-basis: [cost-discipline, monetary-cost-as-quantale-extension, lawvere-quantale]
tasks:
  - extend-cost-quantale-to-product-shape
  - emit-cost-witnesses-on-every-settle-action
  - implement-cost-ledger-as-substrate-projection
---


After this goal, the cost-discipline's product Lawvere quantale (settlement fuel × dollars × tokens-against-budget) is realized as substrate cells.
Every settle-action emits a cost-witness denominated in the product quantale; the cost-ledger is a projection over those witnesses; dispatch reads cost cells when choosing among candidates.

This goal is **the substrate-machinery underneath** [`dispatch-chooses-endpoint-by-cost-quantale`](dispatch-chooses-endpoint-by-cost-quantale.md).
Without cost cells, dispatch cannot read costs to compare them.
Without cost-witnesses on every settle-action, the cost-ledger is incomplete.
Without a product quantale, free-tier endpoints (zero in dollars, nonzero in fuel) collapse confusingly into a single cost dimension.

## Why

The captain wants the swarm to choose among endpoints by **cost-to-swarm**, not just per-call dollar cost.
Cost-to-swarm is a product of:

- **Settlement fuel** — the closure-iteration cost of running the dispatch and consuming the response.
  Even a $0 free-tier endpoint consumes fuel.
- **Dollars** — provider charges per token (in/out).
  Free tiers have $0$ here; paid tiers don't.
- **Tokens-against-budget** — provider-side rate limits per window (per minute, per day).
  Tokens consumed against this budget are a third cost dimension; running out of tokens-this-window is a hard constraint regardless of dollar cost or fuel cost.

The Lawvere quantale at $[0, \infty]$ already exists for closure-iteration cost in [`predication-categories/theorems/cost-composition-via-lawvere-quantale`](../../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/) — when authored.
M7's contribution is extending it to a *product* quantale where the three dimensions compose independently (addition for sequential composition; min for choice-among-alternatives) and the product preserves the same arithmetic shape per dimension.

## Theory grounding

**1.
Cost-discipline's quantale invariance** ([`flatfile-agentic-resource-system/concepts/cost-discipline`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/) — when authored). **Reads are free; only settling pays.** The cost-discipline applies at the substrate algebra level: each closure-rule firing has a cost; sequential composition adds; choice-among-alternatives takes the minimum.
M7 doesn't change this — it extends the quantale's value space from $\mathbb{R}_{\geq 0}$ to $\mathbb{R}_{\geq 0}^3$ (settlement fuel × dollars × tokens-against-budget) with componentwise arithmetic.

**2.
Monetary cost as quantale extension** ([FARS open question](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/questions/monetary-cost-as-quantale-extension.md)).
The FARS question explicitly asks whether monetary cost is one cost dimension or two (vs. settlement fuel).
M7 commits to **one product quantale with three dimensions** — not two separate single-dimensional quantales.
The arithmetic is the same shape per dimension; the cells are independent. **A choice operation (dispatch picking among endpoints) takes componentwise minimum, modulo a bilattice-bound on each dimension** (e.g., zero tokens-against-budget remaining is hard-disqualifying regardless of dollars or fuel).

**3.
First-class provenance of cost** ([Charter](../../governance/charter.md) C2).
Every cost-witness is a substrate cell with `RuleFiring` provenance, deterministic `rsv_hash`, and clear authorship (the office that signed the dispatch). **A dispatch without a cost-witness is non-conformant** — the cost-ledger depends on every settle-action being witnessed.

### Design constraints from this grounding

- **The product quantale is one record-type, not three.** A `CostWitness` carries all three dimensions in one cell-set.
  Splitting into three independent witnesses violates the joint-cost reading; the product quantale's algebra requires the dimensions be settled together.
- **Dimensions are addable per-dimension; not summable across.** You cannot "add a dollar and a token" — they're different units.
  Dispatch cannot "convert tokens into dollars" — the quantale doesn't define cross-dimensional arithmetic.
  (Choice-min is per-dimension and combines via lex-order or domain-specific weighting; the FARS question on this is explicitly open and M7 commits to lex-min by default.)
- **The cost-ledger is a projector, not an event.** Per the projector framework's counit law, the cost-ledger projects from substrate cost-witnesses; re-rendering produces the same witnesses.
  This is what makes cost auditable across replays.

## Acceptance

- [ ] A `cost-witness` record type or cell-pattern exists carrying `(settle-action, costs, [<fuel>, <dollars>, <tokens-against-budget>]) = T`.
- [ ] Every dispatch settle-action against an endpoint emits a cost-witness; tests verify no settle-action lacks one.
- [ ] The cost-ledger projects from witnesses to per-endpoint, per-period totals; counit verification: re-rendering reproduces the witnesses.
- [ ] Tests cover: free-tier dispatch (cost in fuel and tokens, $0 in dollars), paid-tier dispatch (all three dimensions nonzero), rate-limit-exhausted dispatch (witness emits with the dispatch's $\top$ on the tokens-against-budget axis).
- [ ] No regression in existing cost-tracking (if any exists pre-M7).
