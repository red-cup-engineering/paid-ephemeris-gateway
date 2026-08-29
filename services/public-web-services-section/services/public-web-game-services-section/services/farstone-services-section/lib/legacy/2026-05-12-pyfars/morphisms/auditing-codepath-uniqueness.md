---
type: morphism
class: closure-rule
status: draft
depends-on: [event-log-append-call-site, finding, witness]
realizes: [surface-invariant-codepath]
derives-from-claim: witness-emission-is-surface-invariant
theory-basis: [closure-2-monad, substrate-purity]
implementation: pyfars.audit.codepath_uniqueness  # to be authored
---

# Auditing codepath uniqueness

The closure rule that fires on a code-survey input and produces a finding cell when the realization's actual event-log-append codepath does not match the system's named [`event-log-append-call-site`](../objects/event-log-append-call-site.md).
Closes the audit loop on [`witness-emission-is-surface-invariant`](../claims/witness-emission-is-surface-invariant.md)'s codepath-uniqueness clause: the audit is system-resident, executes as a closure-rule firing rather than as ad-hoc CI tooling, and produces a finding (with the standard finding lifecycle) rather than a build failure.

## Premise → conclusion

**Premise cells (read):**

- `(event-log-append-call-site, implementation-module, ?
  M) = `$\mathbf{t}$
- `(event-log-append-call-site, implementation-class, ?
  C) = `$\mathbf{t}$
- `(event-log-append-call-site, implementation-method, ?
  Mth) = `$\mathbf{t}$
- `(event-log-append-call-site, opens-path-pattern, ?
  P) = `$\mathbf{t}$
- `(event-log-append-call-site, open-mode, ?
  Mode) = `$\mathbf{t}$
- `(code-survey:?
  S, target-pattern, ?
  P) = `$\mathbf{t}$ — a survey input cell asserting that survey $S$ targeted the same path pattern
- `(code-survey:?
  S, open-mode, ?
  Mode) = `$\mathbf{t}$ — survey targeted the same open mode
- `(code-survey:?
  S, match-locations, ?
  Locations) = `$\mathbf{t}$ — list of source-code locations the survey matched
- `(code-survey:?
  S, completed-at, ?
  T) = `$\mathbf{t}$

**Conclusion cells (write, via the closure rule's firing — produced as a [`finding`](../objects/finding.md) when violation; produced as a $\mathbf{t}$ assertion when the audit passes):**

- *On pass* (exactly one match in `?
  Locations`, matching `?
  M.?
  C.?
  Mth`):
  - `(event-log-append-call-site, audit-state, ok) = `$\mathbf{t}$
  - `(event-log-append-call-site, last-audited-at, ?
    T) = `$\mathbf{t}$
- *On fail* (zero or multiple matches, or the matched location does not equal `?
  M.?
  C.?
  Mth`):
  - `(finding:codepath-uniqueness-violation-?
    T, kind, codepath-uniqueness-violation) = `$\mathbf{t}$
  - `(finding:codepath-uniqueness-violation-?
    T, expected-call-site, ?
    M.?
    C.?
    Mth) = `$\mathbf{t}$
  - `(finding:codepath-uniqueness-violation-?
    T, observed-locations, ?
    Locations) = `$\mathbf{t}$
  - `(event-log-append-call-site, audit-state, violated) = `$\mathbf{t}$

## Regime and purity

- **Regime:** strict.
  Antecedent and consequent are quantifier-free; the rule fires once per code-survey input cell and terminates in a single layer.
- **Purity:** `system-state-only-context`.
  The rule reads only system cells (the call-site record + the survey result cell); it does not perform IO.
  The IO is in the *survey* operation that produces the survey result cell, which is a separate runtime concern executed by `pyfars audit-codepaths` (or equivalent CI integration) and witnessed independently.
- **Amplifies-capability:** `false`.
  The rule's consequent is a finding cell or a $\mathbf{t}$-assertion of audit state; neither introduces new capabilities.

## Action

For a polity with a posted code-survey result $S$ targeting the canonical event-log path pattern, when the rule fires:

$$\mathrm{auditing\text{-}codepath\text{-}uniqueness} \colon (\text{call-site record},\ S) \;\longrightarrow\; \begin{cases} \text{audit-ok cells} & \text{if}\ |S.\text{matches}| = 1 \land S.\text{matches}_0 = M.C. Mth \\ \text{codepath-uniqueness-violation finding} & \text{otherwise} \end{cases}$$

The finding is a system-resident record carrying its own lifecycle (per [`finding`](../objects/finding.md)'s schema): it can be triaged, assigned to an officer for resolution, accumulate adjustments, and be closed once the underlying realization defect is fixed.
The system's state under a violation is visible to all consumers — the captain's review, federation envelopes, audit ledger queries — until the finding is resolved.

## How surveys reach substrate

The morphism does not perform the source-code grep itself (substrate-purity §3: "the runtime does not touch substrate" by side effect; closure rules read cells, not filesystems).
The grep happens in `pyfars audit-codepaths` (CLI verb, to be authored) or in a CI hook that runs grep and POSTs the survey result to the system via the [`append_witness`](../work/tasks/engineering/author-mcp-append-witness-tool.md) MCP tool with `operator="codepath-survey"`, `target="event-log-append-call-site"`, `details={"matches": [...], "pattern": "...", "mode": "..."}
`.
The witness's append produces the survey-result cells; the closure rule then fires on them.

This separation — IO outside, closure inside — keeps the audit system-resident in the substrate-pure sense: the survey-result is itself a witnessed system transition, and the audit's firing is determined by system state alone.

## What this morphism does not specify

- It does not specify the *frequency* of audit-codepath surveys.
  A polity may run them per-commit (CI integration) or per-day (scheduled tick) or on-demand.
  The morphism fires whenever a survey-result cell is posted; cadence is operational.
- It does not specify *closure-rule surface-blindness*.
  That is the second half of [`witness-emission-is-surface-invariant`](../claims/witness-emission-is-surface-invariant.md)'s claim — "the closure-rule-system does not branch on `channel`/`origin`/`agent`" — and is a *separate* audit morphism, deferred to a follow-on cycle (see the originating cycle record's *Deferred* section).
- It does not specify the *resolution path* for a violation.
  Once a `codepath-uniqueness-violation` finding lands, standard finding-triage applies; the resolving move is either to fix the realization (remove the rogue call site) or to amend the [`event-log-append-call-site`](../objects/event-log-append-call-site.md) record (rare; would require a separate cycle to authorize).
- It does not specify cross-polity audit discipline.
  Federation-merge audits inherit local audit findings as system cells; cross-polity audit is an M6-tier concern.

## Discipline note

The morphism realizes [`surface-invariant-codepath`](../concepts/surface-invariant-codepath.md)'s codepath-uniqueness clause in the system; the surface-blindness clause is deferred.
Until both audits land, [`witness-emission-is-surface-invariant`](../claims/witness-emission-is-surface-invariant.md) remains at `status: sketch`.
The full proof routes through both audits firing without findings on every survey.
