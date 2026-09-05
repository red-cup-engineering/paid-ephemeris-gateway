---
type: specification
version: "2026.05.09+session-bootstrap-installation"
status: draft
authored: 2026-05-09
authored-under-cycle: 2026-05-09-session-bootstrap-as-installation
realizes-claim: session-bootstrap-as-installation
exercises:
  - automated-installer
  - session-as-ephemeral-incumbent
  - propagate-office-deontic-profile-to-session
math-examples:
  - session-bootstrap--happy-path
  - session-bootstrap--missing-default-office
---

# Specification: session-bootstrap-installation

Version `2026.05.09+session-bootstrap-installation`.
The substrate-readable contract for the SessionStart hook handler's installation behavior, per claim [`session-bootstrap-as-installation`](../../claims/session-bootstrap-as-installation.md).

## 1. Abstract

When a Claude Code session starts in a polity, the SessionStart hook handler authors a substrate-resident session-record and fires a *watch-takeover witness* engaging the persona that holds the configured default office (per [`session-as-ephemeral-incumbent`](../../concepts/session-as-ephemeral-incumbent.md)).
Authority propagation happened previously at persona-investiture (Layer 1, durable); the session inherits via the `wears-persona:` cell (Layer 2, ephemeral).
The hook handler emits `additionalContext` JSON to stdout naming the office binding, the persona being worn, and the session's current work, which Claude Code injects into the session's context.

## 2. Status

Draft.
Revised 2026-05-09 to reflect the persona layer per [`session-as-ephemeral-incumbent`](../../concepts/session-as-ephemeral-incumbent.md) and [`automated-installer`](../../concepts/automated-installer.md).

### Revision note (2026-05-09)

This specification was originally authored treating the session as a direct incumbent of the office.
The corrected architecture is two-layered: a persona is the durable incumbent of the office (Layer 1, settled at one-time persona-investiture by the captain — e.g., 2026-04-05 for `persona:calder-underhill` into `office:first-officer`), and the session is the ephemeral body-natural of the persona (Layer 2, settled at SessionStart by the watch-takeover witness this spec describes).
Where the R-clauses below say "installation increment", read "watch-takeover witness"; where they say "the session is bound to office", read "the session wears the persona that holds the office".
The substrate effects (cells settled, contexts emitted, failure modes) are otherwise as specified — the corrections are at the framing layer, not the cell-shape layer.

## 3. Conformance

The key words "MUST", "MUST NOT", "REQUIRED", "SHOULD", "SHOULD NOT", "MAY" in this document are to be interpreted as described in [RFC 2119].

## 4. Terminology

- **Session-record** — substrate-resident incumbency proposition $\iota$ for a Claude Code session, per the [`session-record`](../../objects/session-record.md) object.
- **Default office** — the office named by the harness install configuration (set via `pyfars install-harness claude-code-* --office=<slug>`).
- **Automated installer** — the substrate-resident installer entity per the [`automated-installer`](../../concepts/automated-installer.md) concept.
- **Felicitous installation** — an installation increment satisfying the three Austin-style felicity conditions per PredGov [`installation`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/morphisms/installation.md).

## 5. Requirements

### R1. The hook handler MUST author a session-record at `records/engineering/sessions/<session-id>.md`.

The session-id MUST be sourced from the SessionStart payload's `session_id` field if present, then `CLAUDE_SESSION_ID` env var, otherwise generated as a UUID.
The session-record's frontmatter MUST include the cells named in [`session-as-ephemeral-incumbent`](../../concepts/session-as-ephemeral-incumbent.md) §"Cell pattern" — including the `wears-persona:` cell.

### R2. The hook handler MUST fire a felicitous watch-takeover witness.

The handler MUST resolve the persona via the office's `held-by:` cell (e.g., `office:first-officer.held-by → persona:calder-underhill`).
The watch-takeover witness names: the handler entity (operator), the new session-record (target), the persona being engaged (in details), the bootstrap stage.
The witness's `agent:` field MUST be the persona slug — "institutional knowledge accumulates against the persona, not against the runtime instance" (per `calder-underhill.md`).

### R3. The hook handler MUST verify the watch-takeover felicity conditions before asserting wears-persona.

Specifically: (a) the office's `held-by:` cell MUST resolve to a substrate-resident persona record; (b) the persona's `holds-office:` cell MUST round-trip to the same office (no orphaned investiture); (c) the persona record's expected body-natural shape (model, transport) SHOULD be checked against the running session — mismatches MAY warn but MUST NOT block.
All checks MUST be against substrate state, not config files.

### R4. On felicity-check failure, the hook handler MUST emit a failure-witness and exit non-zero.

The failure-witness MUST carry cells naming the failed felicity condition (`authority-gate`, `procedure-gate`, or `completeness-gate`) and the cause (e.g., `no-default-office-configured`, `default-office-not-found`, `installer-lacks-power`).
The hook handler MUST NOT author a session-record in the failure case.
Per Claude Code's hook semantics, exit-non-zero blocks session start.

### R5. On successful installation, the hook handler MUST emit `additionalContext` JSON to stdout.

The JSON MUST conform to Claude Code's hook-output schema:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "<text body>"
  }
}
```

The `additionalContext` text MUST include: - The bound office's slug and title (e.g., "You are bound to office:pyfars-executive-officer (PyFARS Executive Officer)"). - The session's incumbency-proposition path (so the session can self-reference in audits). - A summary of any open assignments routed to the bound office (e.g., "Current work: <task-slug>" or "No work currently assigned"). - A pointer to the captain's standing instructions for the bound office (typically the office record's body content).

### R6. The hook handler MUST trigger capability propagation.

After the installation increment fires felicitously, the [`propagate-office-deontic-profile-to-session`](../../morphisms/propagate-office-deontic-profile-to-session.md) closure rule MUST fire (or the session-record MUST carry cells signaling that propagation has been requested for the rule-runner to pick up at the next closure step).
Concretely: the hook handler MAY perform the propagation inline by walking the office's jural-relation cells and authoring derived cells on the new $\iota$, or it MAY rely on a substrate-side closure-rule pass to perform the propagation.

### R7. The hook handler MUST NOT branch its substrate effect on caller-identity surface fields.

The same surface-blindness principle as `event-log-append` R7.
The hook handler's installation behavior MUST be uniform regardless of which Claude Code transport (interactive, cloud-agent, subprocess) fired it; surface-identity fields on the resulting witnesses MAY differ (per R6 of `event-log-append`), but the substrate effect (cells authored, propagation triggered) MUST be the same.

### R8. The session-record's lifecycle cells MUST settle on session-stop.

The companion SessionStop hook handler MUST settle `\langle \iota, \texttt{stage-range-bound.close}, \tau_\mathrm{stop}\rangle = \mathbf{t}$.
Per *dignitas non moritur*, the office's structural cells MUST NOT be modified by session-stop; only the incumbency cells lapse.

### R9. Sub-sessions MUST carry a `parent-incumbency:` cell.

When a parent session spawns a sub-session via the `Agent(...)
` tool (Phase 5 of [`claude-as-pyfars-runtime`](../../work/goals/claude-as-pyfars-runtime.md), out of scope for this specification's enforcement), the sub-session's session-record MUST carry $\langle \iota_\mathrm{sub}, \texttt{parent-incumbency}, \iota_\mathrm{parent}\rangle = \mathbf{t}$.
The audit trail MUST be able to reconstruct the delegation chain by walking these cells.

### R10. The hook handler MUST be implementable in the strict regime.

The installation, felicity-check, and capability-propagation closure rules MUST be expressible in bare $\Pi_1$ + $<$ ordering per [`charter-as-closure-system`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/charter-as-closure-system.md)'s rules-tier fragment.
Settlement MUST be finite-fuel-bounded.

## 6. Acceptance

### 6.1. Felicitous bootstrap (happy path)

Per math example [`session-bootstrap--happy-path`](../../examples/session-bootstrap--happy-path.md): a SessionStart against a polity with the captain's standing delegation cells asserted and the default office configured produces (a) a session-record with the cells named in R1 and R2, (b) installation cells satisfying the felicity check, (c) `additionalContext` JSON on stdout naming the bound office.
Verifiable by integration test against a temp polity.

### 6.2. Missing-default-office (failure path)

Per math example [`session-bootstrap--missing-default-office`](../../examples/session-bootstrap--missing-default-office.md): a SessionStart against a polity with no default office configured produces a failure-witness with cells `kind-of-failure: installation-blocked` and `cause: no-default-office-configured`, and the hook handler exits non-zero.
No session-record is authored.
Verifiable by integration test.

### 6.3. Capability propagation triggered

After 6.1's felicitous bootstrap, querying the substrate for jural-relations with `active-holder: <session-iota>` MUST return a non-empty set whose elements are derived (via `derived-from`) from the office's own jural-relations.

### 6.4. `additionalContext` injection visible in session

A captain-driven test (Phase E of the implementation roadmap): start `claude` against the polity; the first message visible in the session window includes the office binding text from R5.
(Test runs interactively; cannot be fully automated without Claude Code SDK simulation.)

## 7. Non-normative examples

Math examples (cycle stage 5): - [`session-bootstrap--happy-path`](../../examples/session-bootstrap--happy-path.md) - [`session-bootstrap--missing-default-office`](../../examples/session-bootstrap--missing-default-office.md)

## 8. What this specification does not decide

- **The exact `additionalContext` text format.** R5 names the required content fields; the prose form is implementation choice.
  A future spec may standardize a markdown template.
- **The mechanism for asserting the captain's standing delegation.** This specification assumes the cells are present; how they get there (charter authoring, polity-bootstrap script, etc.) is out of scope.
- **Sub-session installation procedure.** R9 names the required cell on sub-session records but does not specify how the parent session drives the sub-installation.
  Phase 5's cycle handles that.
- **MCP authority gate enforcement.** Spec [`session-mcp-authority-gate`](session-mcp-authority-gate.md) handles the gate's contract; this spec only asserts that capability propagation happens, not that the gate enforces against the propagated cells (that's the gate spec's R-list).
- **Cloud-agent SessionStart semantics.** This spec is written for interactive Claude Code sessions; cloud-agent sessions (Phase 3 of the goal) will likely require an extension specifying how the office is determined from a workitem assignment rather than from the harness install config.

## 9. References

- Claim: [`session-bootstrap-as-installation`](../../claims/session-bootstrap-as-installation.md)
- Cycle: [`2026-05-09-session-bootstrap-as-installation`](../../work/cycles/2026-05-09-session-bootstrap-as-installation.md)
- Survey: [`session-as-incumbent-from-predgov-and-predcat`](../../work/surveys/session-as-incumbent-from-predgov-and-predcat.md)
- PredGov: [`installation`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/morphisms/installation.md), [`incumbent`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/incumbent.md), [`office-as-double-settlement`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/office-as-double-settlement.md)
- Concept: [`session-as-ephemeral-incumbent`](../../concepts/session-as-ephemeral-incumbent.md), [`automated-installer`](../../concepts/automated-installer.md)
- Object: [`session-record`](../../objects/session-record.md)
- Morphism: [`propagate-office-deontic-profile-to-session`](../../morphisms/propagate-office-deontic-profile-to-session.md)
