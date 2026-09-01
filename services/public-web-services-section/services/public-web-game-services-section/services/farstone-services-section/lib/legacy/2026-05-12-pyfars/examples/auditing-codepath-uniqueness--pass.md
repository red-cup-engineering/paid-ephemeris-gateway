---
type: example
kind: math
instantiates: [auditing-codepath-uniqueness]
derives-from-claim: witness-emission-is-surface-invariant
depends-on: [auditing-codepath-uniqueness, event-log-append-call-site]
---

# Auditing codepath uniqueness — pass regime

A worked instantiation of [`auditing-codepath-uniqueness`](../morphisms/auditing-codepath-uniqueness.md) for the case where the source-code survey returns exactly one match equal to the substrate's named canonical call site.
The morphism produces an `audit-state: ok` assertion.

## Setup

Continuing from [`event-log-append-call-site--singleton-instance`](event-log-append-call-site--singleton-instance.md), let $E_L$ be the substrate's singleton call-site record with cells:

$$ \begin{aligned} (E_L,\ \texttt{implementation-module},\ \text{"pyfars.runtime.event\_log"}) &= \mathbf{t} \\ (E_L,\ \texttt{implementation-class},\ \text{"EventLog"}) &= \mathbf{t} \\ (E_L,\ \texttt{implementation-method},\ \text{"append"}) &= \mathbf{t} \\ (E_L,\ \texttt{opens-path-pattern},\ P_{\text{path}}) &= \mathbf{t} \\ (E_L,\ \texttt{open-mode},\ \text{"a"}) &= \mathbf{t} \end{aligned} $$

where $P_{\text{path}} = \text{"<root>/<event-log-dir>/<YYYY-MM-DD>.jsonl"}$.

A code survey at time $T = \text{2026-05-09T17:00:00Z}$, identified by entity $S$, posted survey-result cells:

$$ \begin{aligned} (S,\ \texttt{target-pattern},\ P_{\text{path}}) &= \mathbf{t} \\ (S,\ \texttt{open-mode},\ \text{"a"}) &= \mathbf{t} \\ (S,\ \texttt{match-locations},\ [\text{"pyfars.runtime.event\_log.
EventLog.append"}]) &= \mathbf{t} \\ (S,\ \texttt{completed-at},\ T) &= \mathbf{t} \end{aligned} $$

The single match in the list equals `?
M.?
C.?
Mth` from $E_L$, namely `"pyfars.runtime.event_log"` $\cdot$ `"EventLog"` $\cdot$ `"append"`.

## Closure rule firing

The morphism's antecedent unifies as:

- $?
  M \mapsto \text{"pyfars.runtime.event\_log"}$
- $?
  C \mapsto \text{"EventLog"}$
- $?\textit{Mth} \mapsto \text{"append"}$
- $?
  P \mapsto P_{\text{path}}$
- $?\textit{Mode} \mapsto \text{"a"}$
- $?
  S \mapsto S$
- $?\textit{Locations} \mapsto [\text{"pyfars.runtime.event\_log.
  EventLog.append"}]$
- $?
  T \mapsto T$

The pass-condition (one match equal to expected call site) is satisfied:

$$|?\textit{Locations}| = 1 \;\land\; ?\textit{Locations}_0 = \text{join}(?
M, ?
C, ?\textit{Mth})$$

The rule's consequent fires on the pass branch, producing the cells:

$$ \begin{aligned} (E_L,\ \texttt{audit-state},\ \text{"ok"}) &= \mathbf{t} \\ (E_L,\ \texttt{last-audited-at},\ T) &= \mathbf{t} \end{aligned} $$

No `finding:codepath-uniqueness-violation-T` entity is created on the pass branch.

## Closure trace

Before firing, $S(P)$ contains the call-site cells (above), the survey-result cells (above), and no `audit-state` cell on $E_L$ (so $(E_L, \texttt{audit-state}, ?) = \bot$ for any value).

After firing, $S(P)$ additionally contains:

$$\bigsqcup_{i \in \{1,2\}} \text{cells}(c_i) \;=\; \{(E_L,\ \texttt{audit-state},\ \text{"ok"}) = \mathbf{t},\ (E_L,\ \texttt{last-audited-at},\ T) = \mathbf{t}\}$$

The closure of $S(P) \sqcup \text{(rule output)}$ under the active rule-system is the new substrate state.
No further cells fire on the new $\texttt{audit-state}$ value (because no rule in the current system has it as antecedent).

## Falsifiability

This example would *not* hold if:

- The survey-result cell carried more than one entry in `match-locations`.
  Then the pass-condition fails and the rule fires on the violation branch (separate example).
- The survey-result cell carried zero entries.
  Same — fail branch.
- The survey-result entry's value did not equal `join(?
  M, ?
  C, ?
  Mth)`.
  Same — fail branch.
- The morphism's antecedent failed to unify (e.g., the call-site record were missing the `implementation-class` cell).
  The rule does not fire; substrate state is unchanged; no audit assertion or finding is produced.
  (This itself is a $\bot$-state condition that *should* surface a separate finding from a meta-rule auditing the call-site record's well-formedness; that meta-rule is out of scope here.)

The example minimally exercises the pass-regime.
