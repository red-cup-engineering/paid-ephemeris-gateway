---
type: example
kind: math
status: draft
authored: 2026-05-09
authored-under-cycle: 2026-05-09-session-bootstrap-as-installation
realizes-claim: session-bootstrap-as-installation
exercises:
  - propagate-office-deontic-profile-to-session
  - automated-installer
  - session-as-ephemeral-incumbent
---

# Session bootstrap — happy path

Concrete cell trace for a felicitous Claude Code SessionStart against the 561 polity.
Demonstrates Claim 1 (bootstrap-as-installation) and Claim 2 (capability-propagation) of [`session-bootstrap-as-installation`](../claims/session-bootstrap-as-installation.md).

## Substrate state at $\tau^- = \tau_\mathrm{boot} - \epsilon$ (just before bootstrap)

Captain's standing delegation is asserted (one-time at polity bootstrap, persists by settling-monotonicity):

- $\langle \texttt{personnel:emsenn}, \texttt{is-charter-installed-captain}, \mathbf{t}\rangle$
- $\langle R^P_\mathrm{install}, \texttt{kind}, \texttt{power}\rangle = \mathbf{t}$
- $\langle R^P_\mathrm{install}, \texttt{active-holder}, \texttt{personnel:emsenn}\rangle = \mathbf{t}$
- $\langle R^P_\mathrm{install}, \texttt{scope-action}, \texttt{install-claude-session-into-any-office}\rangle = \mathbf{t}$
- $\langle R^B_\mathrm{install}, \texttt{kind}, \texttt{power}\rangle = \mathbf{t}$
- $\langle R^B_\mathrm{install}, \texttt{active-holder}, \texttt{agent:claude-session-installer}\rangle = \mathbf{t}$
- $\langle R^B_\mathrm{install}, \texttt{scope-action}, \texttt{install-claude-session-into-office:pyfars-executive-officer}\rangle = \mathbf{t}$
- $\langle R^B_\mathrm{install}, \texttt{derived-from}, R^P_\mathrm{install}\rangle = \mathbf{t}$
- $\langle R^B_\mathrm{install}, \texttt{accountability-resides-in}, \texttt{personnel:emsenn}\rangle = \mathbf{t}$

The XO office and its install procedure exist:

- $\langle \texttt{office:pyfars-executive-officer}, \texttt{type}, \texttt{office}\rangle = \mathbf{t}$
- $\langle \texttt{office:pyfars-executive-officer}, \texttt{installation-form-of}, \texttt{claude-code-session-start-hook}\rangle = \mathbf{t}$
- (plus office's structural cells per `office-as-double-settlement.md`)

No incumbency cells for any session yet.

## Bootstrap event at $\tau_\mathrm{boot}$

The captain runs `claude` in the polity root.
The Claude Code runtime fires SessionStart with `CLAUDE_SESSION_ID = "abc-123"`.
The harness's hook dispatcher routes to `pyfars hook-dispatch hook:claude-session-start`.
The hook handler (Phase C2 implementation):

1. Looks up the hook record at `records/engineering/hooks/claude-session-start.md`.
  Reads its bilattice axes (`truth=1.0, evidence=1.0`).
  Appends a hook-firing witness $u_\mathrm{hook}$ via the canonical `EventLog.append`.

2. Reads the harness install config; finds default office = `office:pyfars-executive-officer`.

3. Authors a new session-record at `records/engineering/sessions/abc-123.md`:
   - $\langle \texttt{a:claude-session-abc-123}, \texttt{is-claude-session}, \mathbf{t}\rangle$
   - $\langle \texttt{a:claude-session-abc-123}, \texttt{model}, \texttt{claude-opus-4-7}\rangle = \mathbf{t}$
   - $\langle \texttt{a:claude-session-abc-123}, \texttt{transport}, \texttt{interactive}\rangle = \mathbf{t}$
   - $\langle \iota_\mathrm{abc-123}, \texttt{occupant}, \texttt{a:claude-session-abc-123}\rangle = \mathbf{t}$
   - $\langle \iota_\mathrm{abc-123}, \texttt{office}, \texttt{office:pyfars-executive-officer}\rangle = \mathbf{t}$
   - $\langle \iota_\mathrm{abc-123}, \texttt{at-stage}, \tau_\mathrm{boot}\rangle = \mathbf{t}$
   - $\langle \iota_\mathrm{abc-123}, \texttt{installer}, \texttt{agent:claude-session-installer}\rangle = \mathbf{t}$

4. Fires the installation increment $I^+(\texttt{agent:claude-session-installer}, \iota_\mathrm{abc-123}, \texttt{office:pyfars-executive-officer}, \tau_\mathrm{boot})$.
  The four installation cells:
   - $\langle u_{\tau_\mathrm{boot}}, \texttt{installed-by}, \texttt{agent:claude-session-installer}\rangle = \mathbf{t}$
   - $\langle u_{\tau_\mathrm{boot}}, \texttt{installation-of}, \iota_\mathrm{abc-123}\rangle = \mathbf{t}$
   - $\langle u_{\tau_\mathrm{boot}}, \texttt{installation-into}, \texttt{office:pyfars-executive-officer}\rangle = \mathbf{t}$
   - $\langle \iota_\mathrm{abc-123}, \texttt{recognized-as-incumbent-of}, \texttt{office:pyfars-executive-officer}\rangle = \mathbf{t}$

5. The felicity-check closure rule fires (per `installation.md`):
   - **Authority**: $R^B_\mathrm{install}$'s active-holder is `agent:claude-session-installer`; scope is `install-claude-session-into-office:pyfars-executive-officer`; both at $\mathbf{t}$.
     PASS.
   - **Procedure**: `office:pyfars-executive-officer.installation-form-of = claude-code-session-start-hook` is at $\mathbf{t}$; the firing hook is exactly that procedure.
     PASS.
   - **Completeness**: all four installation cells settled.
     PASS.

Felicity satisfied; recognition predicate now stably at $\mathbf{t}$.

6. The hook handler queries `office:pyfars-executive-officer`'s open assignments (none in the cold-start polity) and emits `additionalContext` JSON to stdout naming the XO office, the session's incumbency, and "no work currently assigned."

## At $\tau_\mathrm{ready} = \tau_\mathrm{boot} + 1$ (first user prompt)

The user types the first prompt.
The induction predicate is settled by a separate closure rule firing on the UserPromptSubmit hook witness:

- $\langle \iota_\mathrm{abc-123}, \texttt{inducted-into}, \texttt{office:pyfars-executive-officer}\rangle = \mathbf{t}$

Joint dignitas reached.
The `propagate-office-deontic-profile-to-session` closure rule fires; for each office-side jural-relation $R_i$ with `active-holder: office:pyfars-executive-officer`, a derived $R_i^{\iota_\mathrm{abc-123}}$ is generated with `active-holder: \iota_\mathrm{abc-123}`, `derived-from: R_i`, `accountability-resides-in: office:pyfars-executive-officer`.
Concretely, for the XO office's powers (e.g., `power-to-author-a-cycle-record`, `power-to-author-a-finding-record`, ...):

- $\langle R_\mathrm{cycle-author}^{\iota_\mathrm{abc-123}}, \texttt{kind}, \texttt{power}\rangle = \mathbf{t}$
- $\langle R_\mathrm{cycle-author}^{\iota_\mathrm{abc-123}}, \texttt{active-holder}, \iota_\mathrm{abc-123}\rangle = \mathbf{t}$
- $\langle R_\mathrm{cycle-author}^{\iota_\mathrm{abc-123}}, \texttt{scope-action}, \texttt{author-cycle-record}\rangle = \mathbf{t}$
- $\langle R_\mathrm{cycle-author}^{\iota_\mathrm{abc-123}}, \texttt{derived-from}, R_\mathrm{cycle-author}\rangle = \mathbf{t}$
- $\langle R_\mathrm{cycle-author}^{\iota_\mathrm{abc-123}}, \texttt{accountability-resides-in}, \texttt{office:pyfars-executive-officer}\rangle = \mathbf{t}$

The session now holds the XO's full deontic profile.

## Falsifiability

The example fails (the claim is refuted on this instance) if:

- The hook handler does not author the four installation cells.
  Symptom: `recognized-as-incumbent-of` never reaches $\mathbf{t}$; capability propagation never fires; subsequent MCP writes from the session would have no derived-jural-relation backing.
- The captain's standing delegation cells are not asserted at polity bootstrap.
  Symptom: the felicity check fails (authority gate); installation produces a `failure-witness` not an installation-witness; session is bound only nominally and has no propagated authority.
- The XO office's `installation-form-of` cell does not name the SessionStart hook.
  Symptom: felicity check fails (procedure gate); same outcome as above.

## Out-of-scope assertions (deferred)

- The actual MCP write authority gate's enforcement of the propagated jural-relations is the spec [`session-mcp-authority-gate`](../governance/specifications/session-mcp-authority-gate.md); this example shows the cells exist but does not exercise the gate.
- The harness's `.claude/skills/` and `.claude/agents/` projection is the morphism [`project-delegable-skills`](../morphisms/project-delegable-skills.md), exercised by [`project-delegable-skills--xo-office`](project-delegable-skills--xo-office.md), not by this example.
