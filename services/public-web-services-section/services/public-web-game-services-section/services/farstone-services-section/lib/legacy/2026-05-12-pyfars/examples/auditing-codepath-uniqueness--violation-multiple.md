---
type: example
kind: math
instantiates: [auditing-codepath-uniqueness]
derives-from-claim: witness-emission-is-surface-invariant
depends-on: [auditing-codepath-uniqueness, event-log-append-call-site, finding]
---

# Auditing codepath uniqueness — violation regime (multiple call sites)

A worked instantiation of [`auditing-codepath-uniqueness`](../morphisms/auditing-codepath-uniqueness.md) for the case where the source-code survey returns more than one match.
The morphism produces a `codepath-uniqueness-violation` finding and flips the call-site object's audit state.

## Setup

The call-site record $E_L$ has the same cells as in [`auditing-codepath-uniqueness--pass`](auditing-codepath-uniqueness--pass.md).
A code survey $S'$ at time $T' = \text{2026-05-15T17:00:00Z}$ — *hypothetical*, after a rogue patch added a second event-log opener at `pyfars.runtime.session._direct_append` — posts:

$$ \begin{aligned} (S',\ \texttt{target-pattern},\ P_{\text{path}}) &= \mathbf{t} \\ (S',\ \texttt{open-mode},\ \text{"a"}) &= \mathbf{t} \\ (S',\ \texttt{match-locations},\ [\text{"pyfars.runtime.event\_log.
EventLog.append"},\ \text{"pyfars.runtime.session.\_direct\_append"}]) &= \mathbf{t} \\ (S',\ \texttt{completed-at},\ T') &= \mathbf{t} \end{aligned} $$

## Closure rule firing — fail branch

The morphism's antecedent unifies as in the pass example.
The pass-condition:

$$|?\textit{Locations}| = 1 \;\land\; ?\textit{Locations}_0 = \text{join}(?
M, ?
C, ?\textit{Mth})$$

evaluates to false because $|?\textit{Locations}| = 2 \neq 1$.
The rule fires on the *otherwise* branch, producing a finding entity $F = \texttt{finding:codepath-uniqueness-violation-T'}$ and cells:

$$ \begin{aligned} (F,\ \texttt{kind},\ \text{"codepath-uniqueness-violation"}) &= \mathbf{t} \\ (F,\ \texttt{expected-call-site},\ \text{"pyfars.runtime.event\_log.
EventLog.append"}) &= \mathbf{t} \\ (F,\ \texttt{observed-locations},\ [\text{"pyfars.runtime.event\_log.
EventLog.append"},\ \text{"pyfars.runtime.session.\_direct\_append"}]) &= \mathbf{t} \\ (E_L,\ \texttt{audit-state},\ \text{"violated"}) &= \mathbf{t} \end{aligned} $$

## Closure trace

Before firing, the substrate may already carry an old `(E_L, audit-state, "ok") = `$\mathbf{t}$ from a prior pass.
The new firing asserts `(E_L, audit-state, "violated") = `$\mathbf{t}$.
The two assertions on the same cell with different values produce a $\top$-cell:

$$(E_L,\ \texttt{audit-state}) \mapsto \top$$

— contested state under the bilattice's knowledge order $\leq_k$.
Per the standard repair pattern (per [`closure-2-monad`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/closure-2-monad.md)'s lax-idempotence and the substrate's $\top$-cell repair discipline), the older assertion is superseded by the newer one in monotonic-time order; the fixed point of $\mathrm{Cl}$ resolves to:

$$(E_L,\ \texttt{audit-state},\ \text{"violated"}) = \mathbf{t}$$

The finding $F$ is now substrate-resident and visible to all consumers (captain review, audit ledger, federation).

## Lifecycle

The finding triggers downstream behavior:

- **Captain review** sees a new `codepath-uniqueness-violation` finding in the day's findings list.
- **Federation envelope** for the polity carries the finding cells; peers see the violation immediately on next merge.
- **Triage** assigns the finding to engineering for resolution (per finding-triage rules outside this morphism's scope).
- **Resolution** typically removes the rogue call site from the source code; a subsequent survey $S''$ at $T'' > T'$ re-posts with $|?\textit{Locations}| = 1$, fires the pass branch, and asserts `(E_L, audit-state, "ok") = `$\mathbf{t}$, superseding the violation state.

## Falsifiability

The violation example would not hold if:

- The survey result returned exactly one match (covered by the pass example).
- The closure rule did not fire (e.g., the call-site record's antecedent cells were missing).
  The substrate would carry survey-result cells but no audit assertion or finding.
  This is itself a $\bot$-state condition that should surface a meta-audit finding (out of scope here).
- The repair convention superseded the new violation cell with the old ok cell.
  This would contradict monotonic-time ordering and the $\top$-cell repair pattern; the substrate's commitments forbid it.

The example minimally exercises the violation-regime in its multiple-match form.
A symmetric example for the zero-match form (canonical call site has been *removed*) would have the same shape with different `observed-locations` content; per minimality, only this form is authored.
