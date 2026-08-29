---
type: question
status: open
explores: [witness, cost-quantale, dispatch-grading, mcp-tool-surface, audit-discipline]
---

# Is in-session tool-call grading along the cost quantale axis worth its cost, or are the witness's truth/evidence axes sufficient for what the substrate needs to know about a session's work?

Two grading surfaces exist in the substrate and they are not the same thing:

- **Witness grade.** Each `Witness` carries `truth: float ∈ [0,1]` and `evidence: float ∈ [0,1]` — the bilattice axes per [`pyfars/entities/witness.py`](../src/pyfars/entities/witness.py).
  These describe *what the substrate now believes* about the cell the witness records: with what truth-direction and with what confidence.
  They are about substrate state, not about effort.

- **Cost quantale.** The substrate is committed to $([0, \infty], +, \min)$ per [`cost-is-lawvere-quantale`](../../../pypredcomp/docs/dev/decisions/cost-is-lawvere-quantale.md).
  Cost composes additively along a path; reads contribute the unit (free); settlements and admissions contribute positive cost.
  This describes *what was spent* to reach that state.

The dispatch graph at [`pyfars/runtime/dispatch_graph.py`](../src/pyfars/runtime/dispatch_graph.py) is committed to grading workitem-to-agent matches via twist-product fusion in the bilattice axis (per [`dispatch-composes-authorization`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theorems/dispatch-composes-authorization.md)).
What is *not* committed is whether the harness should additionally grade *individual tool calls inside a session* along the cost axis — emitting a per-call cost cell that the daily ledger sums — or whether the witness's truth/evidence pair plus the eventual session-close finding is enough, with cost composition reserved for the dispatch operator and aggregate-class budget rules.

This question is program-shaping rather than realization: it determines what `pyfars hook-dispatch hook:claude-post-tool-use` writes when a tool call closes, and what shape `append_witness` MCP-tool ([`ship-mcp-write-tool-surface`](../work/plans/ship-mcp-write-tool-surface.md)) accepts.

## What the answer's shape looks like

Either:

(a) **Truth/evidence is sufficient.** Tool-call witnesses carry only $(truth, evidence)$.
Cost composition lives at the dispatch operator and at class-aggregated budget rules ([M3](../work/milestones/m3-continuous-loop.md)) but not at the per-call level.
The audit trail tracks state transitions and confidence, not effort.
Session-close findings name what was accomplished, not what it cost.

(b) **Cost grading is added.** Tool-call witnesses additionally carry a cost-quantale-valued payload (e.g., latency, token consumption, monetary cost — selected by deployment per the cost decision's product-quantale clause).
The daily ledger composes them along $+$ to produce per-session, per-office, and per-workitem totals.
A budget closure rule can disqualify dispatching to an office that has exceeded its day's budget — Phase-3-of-M3 territory.

(c) **A scoped middle.** Cost is graded for *settlement-fuel* purposes inside the dispatch operator (already committed) but witness payloads stay $(truth, evidence)$-only.
The settlement-fuel composition is invisible to the witness chain; a separate cost-cell column is written at session-close as a single aggregate, not at each tool call.

## What's at stake

Witness-payload shape is hard to change later.
Adding cost fields after witnesses are in flight requires a migration; removing them requires demonstrating the ledger downstream doesn't read them.
Choosing shape now affects:

- **Audit complexity.** A cost-graded witness chain answers "how expensive was this workitem?" by traversal; a non-cost-graded chain requires a separate ledger join.
  The first is more self-contained; the second keeps witnesses small.

- **MCP write-tool surface.** `append_witness`'s parameter list grows with every grade axis.
  If cost is graded per-call, every caller (hook dispatcher, session agent, sub-session, autonomous engine) must furnish cost; furnishing it correctly is non-trivial (the dispatcher cannot know token counts without parsing tool results).

- **Federation envelope size.** Cost-graded witnesses carry more bytes in federation messages.
  Under the strict regime (endpoint snapshots), the per-message cost is bounded; in transfinite-bounded regimes (trajectory shipping, future) the cumulative cost matters more.

- **Budget enforcement readiness.** [M3](../work/milestones/m3-continuous-loop.md) wants budget records to disqualify over-budget dispatch.
  Without per-call cost grading, the budget signal must come from somewhere else — most likely a session-close cost roll-up or an external metering surface.
  Either is plausible; the choice should be deliberate.

## What's hard

The cost-as-Lawvere-quantale decision named the *quantale* but did not specify *where in the substrate* cost cells get authored.
The natural reading is "anywhere a substrate operation happens with non-trivial effort," which leaves the per-call decision genuinely open.
The harness is a likely *first* place such authoring would land, since the harness is the operational locus for tool-call settlement.

The bilattice and the cost quantale are categorically different: the first is the value-domain for cells; the second is a Lawvere-quantale for distance composition.
Mixing them at the witness payload level does not collapse them — they sit side by side — but it does ask every reader of a witness to handle two grade axes when previously there was one.
The cognitive cost is real.

## What would need to be answered

1. What audit questions does the captain *actually* expect the ledger to answer?
  (cost-by-office-by-day; tokens-by-workitem-class; latency-by-skill; ratio-of-work-completed-to-fuel-spent — naming concrete questions disciplines the answer.)
2. If cost is graded per-call, which cost component is canonical for the 561 substrate — wall-clock latency, token-consumption, monetary, or a product?
  The cost decision permits products but doesn't pick one.
3. Is there an empirical reason (already-observed need from the in-flight harness) to prefer (a), (b), or (c)?
  Or is the choice still entirely speculative-future?
4. What's the migration shape if the answer changes later — i.e., how invasive is adding/removing a cost field on `Witness`?

When this resolves, the resolving artifact is a [decision](../governance/decisions/) about witness payload shape (and possibly cost-component selection), which feeds into the [`author-mcp-append-witness-tool`](../work/tasks/engineering/author-mcp-append-witness-tool.md) acceptance.
This question note is then deleted.
