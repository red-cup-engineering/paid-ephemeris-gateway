---
title: "Ship the MCP write-tool surface (Phase 1 leading edge of [claude-as-pyfars-runtime](../goals/claude-as-pyfars-runtime.md))"
type: plan
status: planning
milestone: m5-agential-self-generation
tasks:
  - author-mcp-append-witness-tool
  - route-hook-dispatch-through-mcp-append-witness
dependency-order:
  - [author-mcp-append-witness-tool, route-hook-dispatch-through-mcp-append-witness]
milestone-cells:
  - "(mcp-server, has-append-witness-tool, true) = T"
  - "(hook-dispatch, routes-through-mcp-append-witness, true) = T"
  - "(witness-event-log, single-codepath, true) = T"
normative-cleanup: tracked
derives-from-claim: witness-emission-is-surface-invariant
derives-from-cycle: 2026-05-09-witness-emission-codepath-uniformity
derives-from-spec: "event-log-append:2026.05.09+event-log-append"
theory-basis:
  - witness-emission-is-surface-invariant
  - surface-invariant-codepath
  - log-and-record-are-distinct-resource-types
  - substrate-purity
  - closure-2-monad
---


## What this plan does

[`claude-as-pyfars-runtime`](../goals/claude-as-pyfars-runtime.md) Phase 1 names the MCP server's full write-tool surface — `append_witness`, `author_record`, `advance_horizon`, `file_finding`, `file_observation`, plus dispatch-graph tools — and commits that "every read returns the cell's `(truth, evidence)` axes; every write accepts them as parameters and validates against the calling office's authority."
This plan does *not* land all of that.
It lands `append_witness` only, and routes the hook dispatcher through it, so the witness path collapses to a single codepath.

The plan derives from the [`witness-emission-is-surface-invariant`](../../claims/witness-emission-is-surface-invariant.md) claim authored in cycle [`2026-05-09-witness-emission-codepath-uniformity`](../cycles/2026-05-09-witness-emission-codepath-uniformity.md).
The claim commits the substrate to: (a) a single canonical event-log-append call site (`pyfars.runtime.event_log.
EventLog.append`), and (b) surface-blindness of substrate effect.
The supporting object [`event-log-append-call-site`](../../objects/event-log-append-call-site.md) makes the canonical site substrate-readable; the morphism [`auditing-codepath-uniqueness`](../../morphisms/auditing-codepath-uniqueness.md) is the audit closure rule that verifies it.
The specification [`event-log-append`](../../governance/specifications/event-log-append.md) (version `2026.05.09+event-log-append`) names twelve requirements (R1–R12); this plan delivers the realization that satisfies R1–R10 (canonical call site, witness payload schema, surface-blindness via static discipline, append atomicity).

R11 and R12 (the audit operation and the closure rule that verifies codepath-uniqueness in substrate) are *deferred*; this plan settles the milestone-cell `(witness-event-log, single-codepath, true) = T` by manual inspection rather than substrate-resident audit.
A follow-on plan lands the audit operation and rule.

The reason the plan is narrow: `append_witness` is the simplest substrate-mutating verb (append-only, no authority check needed yet), and the hook dispatcher already produces witnesses by direct event-log append in `_pyfars-dispatch.sh`.
Routing the hook witness path through the same canonical function — *which is what makes the surface-invariance claim hold for hook-emitted witnesses* — exercises the entire transport on the verb whose semantics are most forgiving.
Once this codepath is live, every subsequent write tool (`author_record`, `claim_workitem`, `dispatch_subagent`) is an extension along the same axis: same registration shape, same office-authority hook, same witness payload, same return contract.

The plan is also a falsification test: if `append_witness` cannot be wired through the canonical call site without breaking the hook witness ledger's continuity, the [`witness-emission-is-surface-invariant`](../../claims/witness-emission-is-surface-invariant.md) claim's codepath-uniqueness clause is refuted in this realization, and the cycle re-opens for revision.

## Dependency structure

```
author-mcp-append-witness-tool ─→ route-hook-dispatch-through-mcp-append-witness
                                                       │
                                                       ▼
                          (the witness path collapses to one codepath)
```

The two tasks are sequential.
The router task reads the server-side tool's contract — parameter shape, validation behavior, witness payload schema — to know what to call.
Reversing the order means routing through a tool that doesn't exist; building the tool without routing leaves it unused.

## Milestone cells

The plan completes when all three milestone-cells in the frontmatter reach $\mathbf{t}$.
Per [plan-completion-as-meet](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/plan-completion-as-meet.md):

- **`(mcp-server, has-append-witness-tool, true) = T`** settles when a Claude session running against the polity can issue an MCP `append_witness` call and observe the resulting cell appear in `.fars/event-log/`.
  Acceptance is in [`author-mcp-append-witness-tool`](../tasks/engineering/author-mcp-append-witness-tool.md).
- **`(hook-dispatch, routes-through-mcp-append-witness, true) = T`** settles when `pyfars hook-dispatch <slug>` calls the MCP server's `append_witness` rather than appending directly to the event-log file.
  Acceptance is in [`route-hook-dispatch-through-mcp-append-witness`](../tasks/engineering/route-hook-dispatch-through-mcp-append-witness.md).
- **`(witness-event-log, single-codepath, true) = T`** is the joint settlement: there is *exactly one* place in the pyfars source where event-log records are authored, and it is reached from both the hook path and the in-session MCP path.

Partial settlement is partial completion.
Routing through MCP without a working tool is incoherent; landing the tool without routing leaves the harness's witnesses on the old path and produces no integration win.

## Defeasibility

This plan can be revised by adding tasks (e.g., a third task that lands `author_record` once `append_witness` settles) without breaching its commitment, provided the milestone-cells in the frontmatter remain the joint settlement gate.
Adding milestone-cells requires a revision-witness with `justified-by:` per [predwork plan](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/plan.md) §"Defeasible stability"; silent revision is forbidden.

If the captain abandons the plan, the abandonment cell propagates to the two tasks; in-flight work stops.
Witnesses already settled (e.g., the MCP tool's registration witness if the first task partially completed) survive — abandonment does not retract substrate history.

## Normative profile

Each task generates a duty cell on the assigned agent at dispatch (per O→N rule in [normative-operational-layering](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/normative-operational-layering.md)).
At plan completion, normative residue is `tracked`, not `required`: this is harness-plumbing work, not governance-establishing work.
The duty-cell ledger records what was assigned and discharged but doesn't gate completion.

## Theory grounding

- [`witness-emission-is-surface-invariant`](../../claims/witness-emission-is-surface-invariant.md) — the realization claim this plan operationalizes; the milestone-cells map to the claim's codepath-uniqueness clause.
- [`event-log-append`](../../governance/specifications/event-log-append.md) specification — R1–R10 are the in-scope requirements; R11–R12 are explicitly deferred (see §"What this plan does NOT claim").
- [`surface-invariant-codepath`](../../concepts/surface-invariant-codepath.md), [`event-log-append-call-site`](../../objects/event-log-append-call-site.md), [`auditing-codepath-uniqueness`](../../morphisms/auditing-codepath-uniqueness.md) — the cycle's stage-4 substrate primitives.
- [Math examples](../../examples/event-log-append-call-site--singleton-instance.md) — the cycle's stage-5 worked instantiations; the implementation chain's code examples lift these into pyfars Python fixtures.
- [`Witness`](../../src/pyfars/entities/witness.py) — the `truth`/`evidence` axes are the parameter shape `append_witness` accepts.
- [`Cost-as-Lawvere-quantale`](../../../pypredcomp/docs/dev/decisions/cost-is-lawvere-quantale.md) — reads contribute the unit, settlements contribute positive cost.
  `append_witness` is a settlement-class operation; the per-call cost question (whether to grade) is open: [`in-session-cost-axis-grading`](../../questions/in-session-cost-axis-grading.md).
- [`Regime-classification-is-load-bearing`](../../../pypredcomp/docs/dev/decisions/regime-classification-is-load-bearing.md) — strict regime; the witness payload is endpoint-state-shaped.
- [Plan-completion-as-meet](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/plan-completion-as-meet.md) — the joint-settlement structure of the three milestone-cells.

## What this plan does NOT claim

Per [`author-honest-non-claims-section`](../../governance/duties/author-honest-non-claims-section.md):

- This plan does *not* land the substrate-resident audit (specification R11–R12).
  Authoring `pyfars audit-codepaths` (or equivalent CI integration) and the [`auditing-codepath-uniqueness`](../../morphisms/auditing-codepath-uniqueness.md) closure-rule registration is deferred to a follow-on plan.
  Until that plan lands, the milestone-cell `(witness-event-log, single-codepath, true) = T` is settled by manual inspection (a one-off grep producing a finding-or-pass at plan completion), not by a substrate-resident audit firing per-commit.
- This plan does *not* land the full Phase 1 surface.
  `author_record`, `advance_horizon`, `file_finding`, `file_observation`, `read_assignment`, `claim_workitem`, `release_workitem`, `escalate_workitem`, `dispatch_subagent`, and the bilattice-aware reads remain unwritten.
  They will accrete as subsequent plans once `append_witness` proves the transport.
- This plan does *not* introduce office-authority checks at the MCP boundary.
  `append_witness` is left authority-permissive in this plan; the authority gate lands when the substrate primitives for sub-office binding (Phase 2) and delegable powers ([open question](../../questions/delegable-powers-distinct-from-full-powers.md)) settle.
  Permissive append in the interim is acceptable because every append produces a witness whose `origin` field names the caller; an after-the-fact audit can detect ultra-vires appends even without a write-time gate.
- This plan does *not* commit to whether the MCP server runs as stdio (the current default per `.mcp.json`), as a uvicorn HTTP service, or both.
  The `append_witness` tool's contract is transport-independent; the deployment shape is a [separate question](../../questions/dispatch-workitems-plans-and-external-surfaces.md).
- This plan does *not* address the cost-grading question.
  `append_witness`'s parameter list in this plan carries `truth` and `evidence` only, not a cost-quantale-valued payload.
  If [`in-session-cost-axis-grading`](../../questions/in-session-cost-axis-grading.md) resolves toward graded cost, a follow-on plan migrates the parameter list; this plan does not pre-empt the resolution.
