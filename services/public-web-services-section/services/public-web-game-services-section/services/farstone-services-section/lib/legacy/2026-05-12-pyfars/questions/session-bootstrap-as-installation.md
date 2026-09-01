---
type: question
status: open
explores: [office, installation, incumbency, ephemeral-occupant, automated-installer, capability-propagation, session-bootstrap, predicate-specialization]
informed-by-survey: ../work/surveys/session-as-incumbent-from-predgov-and-predcat.md
---

# How does a Claude session bind to a substrate office at boot, such that the office's deontic profile transfers to the session, the office's delegable-skills scope projects into `.claude/`, and the session's MCP writes are gated by the office's authority — using only the existing PredGov + PredWork machinery applied to ephemeral occupants?

[`claude-as-pyfars-runtime`](../work/goals/claude-as-pyfars-runtime.md) Phase 2 commits to "session bound to office" but the substrate-side mechanism has not been authored.
The survey [`session-as-incumbent-from-predgov-and-predcat`](../work/surveys/session-as-incumbent-from-predgov-and-predcat.md) does the research portion of this cycle: PredGov already carries `office-as-double-settlement`, `incumbent`, `installation`, `delegation`, `jurisdiction`, and the residuation gate of `delegation-as-authority-residuation`; PredWork carries the `assignment` (to-office, not to-session) and `dispatch` machinery; PredCat closes the gaps PredGov+PredWork leave open (ephemeral occupants, automated installer, delegable-powers as predicate-specialization sub-scope).
The survey's mapping table is the substantive answer.

This question commissions the formal substrate authoring of that mapping: a claim, three concepts, an object, two morphisms, and three specifications.

## What this cycle authors

- **Claim:** [`session-bootstrap-as-installation`](../claims/session-bootstrap-as-installation.md) — the SessionStart hook is a felicitous installation increment $I^+(A_\mathrm{installer}, \iota_\mathrm{session}, O_\mathrm{default}, \tau_\mathrm{boot})$, with capability propagation transferring the office's deontic profile to the new incumbency.

- **Concepts:** `session-as-ephemeral-incumbent`, `automated-installer`, and the operational reading of `delegable-scope` (a sub-scope of the office's action-domain encoded by predicate-specialization).

- **Object:** `session-record` — the substrate-resident incumbency proposition $\iota$ for a Claude session.

- **Morphisms:** `propagate-office-deontic-profile-to-session` (the closure rule that fires on dignitas settlement) and `project-delegable-skills` (the install-time predicate-specialization on the office's action-domain).

- **Specifications:**
  1. `session-bootstrap-installation` — the contract for the SessionStart hook handler's installation behavior.
  2. `office-delegable-scope` — the substrate-readable shape of an office's `delegable-skills:` and `delegable-sub-agents:` cells.
    Resolves the open question's Q1.
  3. `session-mcp-authority-gate` — the contract for MCP write tools' residuation gate.
    (Implementation deferred to a follow-on cycle; the spec lands here so the leading edge is named.)

## Out of scope (for this cycle)

- The actual implementation of the residuation closure rule (`session-mcp-authority-gate`'s implementation; spec lands but enforcement awaits a follow-on cycle that authors the closure rule formally).
- Phase-5 sub-session delegation (delegation morphism applied recursively under `closure-2-monad`'s lax-idempotence) — tracked as a follow-on cycle.
- Phase-4 outcome-witnessed-close — separate cycle.

When this cycle resolves, the [`delegable-powers-distinct-from-full-powers`](delegable-powers-distinct-from-full-powers.md) question (already `status: research-synthesized`) can be retired.
