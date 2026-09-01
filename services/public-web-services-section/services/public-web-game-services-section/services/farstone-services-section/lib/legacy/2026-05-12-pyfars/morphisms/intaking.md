---
type: morphism
class: work-cycle-spoke
status: draft
depends-on: [work-record, work-status, witness, predication-cell]
realizes: [predicated-work]
---

# Intake

The morphism that takes an external request — an intent arriving from outside the polity (a user request, a captain instruction, an external API call, a scheduled trigger) — and produces a system-tracked [work-record](../concepts/work-record.md) at status `pending`.
The first spoke of the work cycle.

## Action

For an external request $\mathrm{Req}$ with payload $p$ and originating actor $a$ (often an external [principal](../concepts/principal.md), sometimes the captain or an internal agent):

$$\mathrm{intake}(\mathrm{Req}, p, a) \;\longrightarrow\; W_{\text{new}} \in \text{WorkRecords}, \;\text{status: pending}$$

The morphism produces a single new work-record with: - A fresh slug (typically generated from the request's natural-language summary plus a uniqueness suffix). - Frontmatter declaring the request's `kind:` (intent, query, captain-directive, scheduled-task, etc.), the originating actor, the timestamp, and the payload reference. - `status: pending` until the [plan](plan.md) morphism specifies the work's requirements and the closure rules promote it to `ready`.

A [witness](../concepts/witness.md) event records the intake; the witness's `cells:` field declares the new work-record's initial cells.

## Composition

Intake composes with downstream morphisms to form the work cycle:

$$\mathrm{intake} \to \mathrm{plan} \to \mathrm{dispatch\text{-}decision} \to \mathrm{execute} \to \mathrm{witness\text{-}completion} \to \mathrm{review}$$

Specifically: intake produces a `pending` work-record; the plan morphism takes the pending record and refines its requirements (`requires-skills:`, blockers, decomposition into sub-tasks) until the record can be promoted to `ready`.

## What this morphism commits to

1. **Single record per request.** A complex request is initially one work-record at intake; decomposition into sub-records happens in plan.
  Intake does not pre-decompose.
2. **Authority gate.** Intake from an external principal requires the principal's authentication and granted-profile to admit intake-shaped requests.
  Anonymous intake is restricted (or refused) by polity policy; principal-based intake follows the principal's gating.
3. **Substrate-purity preserved.** Intake produces a witness; no out-of-witness system writes occur.
4. **Idempotent under retry.** Replaying the same request (same actor, same payload, same timestamp) produces no new work-record (the existing one is found and returned).
  Retried requests don't create duplicates.

## What this morphism does not do

- It does not decompose the request into tasks.
  That's plan.
- It does not assign the request.
  That's dispatch.
- It does not authenticate the principal.
  That's an upstream middleware concern; intake assumes the principal is already validated.
- It does not validate that the request is *actually doable*.
  A request asking for the impossible is intaken as a pending work-record; the plan morphism may classify it as abandonable or escalate it.

## Implementation pointer

The pyfars realization should provide an `intake` operation that, given an inbound request, produces a system-tracked work-record.
The current realization has scattered intake-shaped code (`intake_intent.py`, parts of `ingest.py`, the MCP `queue-intent` verb) that the refactor consolidates into a single morphism.

## Open structural questions

- The handling of *malformed* intakes (a request whose payload is unparseable).
  Does it create a work-record with status `pending` and an `intake-error:` cell, or refuse entirely with an error response?
  Currently mixed; the discipline is partly settled.
- The relationship to scheduled triggers (a recurring task firing).
  Each cycle's instance is a fresh intake from the scheduler; the recurrence engine itself is upstream from intake.
- The boundary with external-API receivers (the FastAPI app receiving JSON, the MCP server receiving tool-calls).
  Each transport's intake adapter is implementation-side; the morphism is the abstract operation underlying all of them.
