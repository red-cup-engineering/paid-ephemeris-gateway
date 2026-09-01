---
type: specification
version: "2026.05.09+session-mcp-authority-gate"
status: draft
authored: 2026-05-09
authored-under-cycle: 2026-05-09-session-bootstrap-as-installation
realizes-claim: session-bootstrap-as-installation
implementation-deferred-to-cycle: TBD-author-mcp-authority-gate-closure-rule
---

# Specification: session-mcp-authority-gate

Version `2026.05.09+session-mcp-authority-gate`.
The substrate-readable contract for the MCP write tools' residuation gate. **Implementation is explicitly deferred to a follow-on cycle** that authors the closure rule formally; this specification lands the contract so the leading edge is named and follow-on engineering has a concrete target.

## 1. Abstract

Each MCP write tool invocation by a session-bound caller MUST be gated by the residuation $\rho_a g = a \Rightarrow g$ where $a$ is the office-derived authority cell on the requested action and $g$ is the candidate write payload.
Out-of-scope writes produce an `ultra-vires` witness instead of mutating substrate.
The four delegation invariants (derivativity, accountability non-transfer, boundedness, revocability) are inherited from the residuation table per [`delegation-as-authority-residuation`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/delegation-as-authority-residuation.md).

## 2. Status

Draft.
Implementation deferred to a follow-on cycle.

## 3. Conformance

RFC-2119 as before.

## 4. Terminology

- **Authority gate** — the residuation gate per [`authority-gate`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/concepts/authority-gate.md), implemented as the right-residuation operator $\mathrm{R}_a$ on $\mathbf{FOUR}$.
- **Session-bound caller** — an MCP client whose request carries a session-id (via bearer token or explicit parameter) that resolves to a session-record with a bound office.
- **Ultra-vires witness** — failure-witness per [`jurisdiction-as-base-change`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/jurisdiction-as-base-change.md) (d) with cells naming the failed authority gate and the requested action.

## 5. Requirements

### R1. Every MCP write tool MUST gate its invocation on the caller's bound office's authority.

For an MCP call `<tool-name>(<args>)` from session-bound caller with session-id $s$ resolving to incumbency $\iota_s$ and bound office $O_s$: - The tool MUST resolve the action $X$ corresponding to `<tool-name>` (e.g., `append_witness` → action `author-witness-record`; `author_record` → action `author-substrate-record`). - The tool MUST read the office's authority cell $a := \langle R^{X,O_s}, \texttt{kind-active}, X\rangle$ (or its propagated equivalent on $\iota_s$). - The tool MUST compute $\rho_a g$ where $g$ is the candidate write payload value (typically $\mathbf{t}$ for an attempted write). - The tool MUST permit the write iff $\rho_a g = \mathbf{t}$ per the residuation table.

### R2. Out-of-scope writes MUST produce an ultra-vires witness.

When $\rho_a g \neq \mathbf{t}$ (specifically: $a = \bot$ silent, $a = \mathbf{f}$ denied, or the action is outside the office's delegable scope $G_O$), the tool MUST author an ultra-vires witness with cells: - $\langle u^\mathrm{uv}, \texttt{kind-of-failure}, \texttt{ultra-vires}\rangle = \mathbf{t}$ - $\langle u^\mathrm{uv}, \texttt{attempted-by-incumbency}, \iota_s\rangle = \mathbf{t}$ - $\langle u^\mathrm{uv}, \texttt{attempted-action}, X\rangle = \mathbf{t}$ - $\langle u^\mathrm{uv}, \texttt{office-authority-value}, a\rangle = \mathbf{t}$

The tool MUST return a structured error to the caller (not raise an exception); the substrate effect is the ultra-vires witness landing in the event log, no other state change.

### R3. Authority MUST be read fresh per call.

The tool MUST NOT cache the office's authority cells across calls within a single session.
The captain's mid-session revocation power requires authority-changes to take effect immediately; caching defeats this.
(Performance optimization may add a per-call cache that invalidates on any incoming witness with `target` matching the office's record path; out of scope for this spec's normative requirements.)

### R4. The four delegation invariants MUST be inherited per the residuation table.

Per [`delegation-as-authority-residuation`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/delegation-as-authority-residuation.md): derivativity (row 1), accountability non-transfer (separate cell-pattern), boundedness (row 2 with $G \subsetneq X$), revocability (row 4).
The implementation MUST NOT introduce additional invariants beyond what the residuation table provides; the implementation MUST NOT drop any of the four.

### R5. Permissive append (transitional) MAY be used until the gate is implemented.

Until the closure-rule implementation lands, MCP write tools MAY operate without the gate.
In permissive mode, every write produces a witness whose `origin` field cites the caller; an after-the-fact audit detects ultra-vires writes from `origin`-field analysis.
Permissive mode MUST be visibly named in the tool's docstring (e.g., "permissive mode; office-authority gate deferred to follow-on cycle").
Spec [`event-log-append`](event-log-append.md)'s `append_witness` is in permissive mode under this clause.

### R6. The gate MUST be uniformly applied across MCP write tools.

A polity MUST NOT have some write tools gated and others permissive (other than the transitional state under R5).
When the gate is implemented, it lands across the entire MCP write surface in one cycle, not piecemeal.

### R7. The gate MUST NOT branch on caller-identity surface fields.

Surface-blindness per `event-log-append` R7.
The gate's decision MUST be a function of the caller's bound office's authority cells alone, not of which transport (interactive, cloud-agent, subprocess) the call arrived on.

### R8. Sub-session calls MUST be gated by the sub-incumbency's office authority.

When a parent session spawns a sub-session, the sub-session's MCP calls are gated by $\rho_{a'} g'$ where $a'$ is the *sub*-incumbency's authority — which is bounded by the parent's $G_O$ via predicate-specialization composition.
The same residuation operator, applied at the sub-incumbency level.
No separate code path.

### R9. Audit queries MUST be able to reconstruct the gate decision.

The substrate event log MUST contain enough information (the witness's `origin`, the caller's session-id, the requested action, the office's authority value at decision-time) to reconstruct any gate decision in the audit.
This is the [`charter-as-closure-system`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/charter-as-closure-system.md) §"Charter compliance is fixed-point status" requirement applied to the authority gate.

### R10. The gate's decision MUST be expressible in the strict regime.

Same regime constraint as `session-bootstrap-installation` R10.

## 6. Acceptance

This specification's acceptance is **deferred to the follow-on cycle's implementation**.
Acceptance criteria the implementation MUST satisfy:

### 6.1. Permitted call passes through

A session-bound caller invoking a write tool whose action is within the bound office's delegable scope MUST see the call complete with a normal substrate write (e.g., `append_witness` returns `{witness_hash, path, ...}
`).

### 6.2. Ultra-vires call blocks

A session-bound caller invoking a write tool whose action is *outside* the bound office's delegable scope MUST receive a structured error and find an ultra-vires witness in the event log.

### 6.3. Mid-session revocation takes effect immediately

If the captain (or another delegating agent) revokes the office's authority on action $X$ mid-session, the next session call requesting $X$ MUST fail per R2, even though prior calls in the session succeeded.
(Verifies R3.)

### 6.4. Sub-session inherits the gate

If a sub-session is bound to a sub-office with $G_\mathrm{sub} \subsetneq G_\mathrm{parent}$, calls within $G_\mathrm{sub}$ pass; calls in $G_\mathrm{parent} \setminus G_\mathrm{sub}$ ultra-vires.
(Verifies R8.)

## 7. Non-normative examples

To be authored under the follow-on cycle's stage-5 work.

## 8. What this specification does not decide

- **The closure-rule-language formal statement** of the gate.
  The follow-on cycle authors it.
- **The exact action-naming convention** mapping MCP tool slugs to substrate action slugs.
  The follow-on cycle decides.
- **Performance considerations** for very-high-frequency call patterns.
  The current spec asserts correctness, not throughput.
- **The bilattice cost-axis interaction.** Per the open question [`in-session-cost-axis-grading`](../../questions/in-session-cost-axis-grading.md), whether per-call cost is graded is unresolved; this spec's residuation is bilattice-truth-axis only.

## 9. References

- Claim: [`session-bootstrap-as-installation`](../../claims/session-bootstrap-as-installation.md)
- Cycle: [`2026-05-09-session-bootstrap-as-installation`](../../work/cycles/2026-05-09-session-bootstrap-as-installation.md)
- PredGov: [`delegation-as-authority-residuation`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/delegation-as-authority-residuation.md), [`jurisdiction-as-base-change`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/jurisdiction-as-base-change.md)
- Spec (sibling): [`event-log-append`](event-log-append.md), [`session-bootstrap-installation`](session-bootstrap-installation.md), [`office-delegable-scope`](office-delegable-scope.md)
