---
type: example
kind: math
status: draft
authored: 2026-05-09
authored-under-cycle: 2026-05-09-session-bootstrap-as-installation
realizes-claim: session-bootstrap-as-installation
exercises:
  - automated-installer
  - installation
falsifies-when: standing-delegation-or-installation-form-cells-absent
---

# Session bootstrap — missing default office

Concrete cell trace for an *infelicitous* Claude Code SessionStart attempt: the polity has not configured a default office.
Demonstrates failure-witness emission per the felicity check, with no recognition-predicate advancement.

## Substrate state at $\tau^- = \tau_\mathrm{boot} - \epsilon$

Captain's standing delegation cells are asserted:

- $\langle R^B_\mathrm{install}, \texttt{kind}, \texttt{power}\rangle = \mathbf{t}$
- $\langle R^B_\mathrm{install}, \texttt{active-holder}, \texttt{agent:claude-session-installer}\rangle = \mathbf{t}$
- $\langle R^B_\mathrm{install}, \texttt{scope-action}, \texttt{install-claude-session-into-office:pyfars-executive-officer}\rangle = \mathbf{t}$

But the harness install config has no `default-office:` set (e.g., the polity was bootstrapped without running `pyfars install-harness claude-code-hooks --office=...
`).

## Bootstrap event at $\tau_\mathrm{boot}$

The captain runs `claude`.
The hook dispatcher fires `pyfars hook-dispatch hook:claude-session-start`.
The hook handler:

1. Reads the harness install config; finds **no** `default-office:` cell.

2. The handler cannot proceed to author the session-record because there is no $O_\mathrm{default}$ to bind to.
  Two acceptable failure shapes per the spec [`session-bootstrap-installation`](../governance/specifications/session-bootstrap-installation.md):

**Option (a): Block the session.** Emit a failure-witness: - $\langle u_{\tau_\mathrm{boot}}^\mathrm{fail}, \texttt{kind-of-failure}, \texttt{installation-blocked}\rangle = \mathbf{t}$ - $\langle u_{\tau_\mathrm{boot}}^\mathrm{fail}, \texttt{cause}, \texttt{no-default-office-configured}\rangle = \mathbf{t}$ - $\langle u_{\tau_\mathrm{boot}}^\mathrm{fail}, \texttt{at-stage}, \tau_\mathrm{boot}\rangle = \mathbf{t}$

The hook handler exits non-zero; Claude Code refuses to start the session per its standard hook-failure handling.

**Option (b): Default to no-office (degraded).** Emit a degraded-incumbency witness: - Same failure-witness cells as above, but also: - The session is allowed to start with `office: null`; `recognized-as-incumbent-of` does not settle; capability propagation never fires. - The session has no derived authorities; every MCP write attempt by it produces an `ultra-vires` witness.

This is the "fail-open with logging" mode; not the default per the spec, but allowable for development/debugging contexts.

The default per the spec is Option (a) — fail-closed.

3. **No installation increment fires.** The recognition predicate cell $\langle \iota_?, \texttt{recognized-as-incumbent-of}, ?\rangle$ is never authored (there is no $\iota$ to author it on, since session-record authoring is gated on default-office availability).

## Falsifiability

The example fails (the claim's negative case is refuted) if:

- The hook handler proceeds to install the session into *some* office despite the missing config.
  Symptom: the audit trail shows installation-witnesses with no traceable authority chain; the captain has no record of having authorized installation into that office.
- The failure-witness is not emitted.
  Symptom: the polity has no record of the failed bootstrap attempt; debugging requires reading Claude Code's own logs rather than substrate.

## What this example earns

Names the *most common* deployment failure for the harness — forgetting to run `pyfars install-harness ... --office=...
` before starting `claude` — as a substrate-readable failure mode rather than an opaque "the bootstrap didn't work" condition.
The spec [`session-bootstrap-installation`](../governance/specifications/session-bootstrap-installation.md) §6 (acceptance) lists this as a required failure-witness shape that compliant implementations must emit.
