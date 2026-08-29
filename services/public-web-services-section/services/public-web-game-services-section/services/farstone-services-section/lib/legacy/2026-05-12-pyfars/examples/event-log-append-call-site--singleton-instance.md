---
type: example
kind: math
instantiates: [event-log-append-call-site, surface-invariant-codepath]
derives-from-claim: witness-emission-is-surface-invariant
depends-on: [event-log-append-call-site, surface-invariant-codepath]
---

# Event-log-append call site — singleton instance for the 561 substrate

A worked instantiation of the [`event-log-append-call-site`](../objects/event-log-append-call-site.md) singleton record for the running 561 polity, witnessing the [`surface-invariant-codepath`](../concepts/surface-invariant-codepath.md) concept's codepath-uniqueness clause.

## Setup

Let $P$ be the 561 polity with root $/\text{home}/\text{emsenn}/561$ and event-log resource $L$ at relative path $.\text{fars}/\text{event-log}/$.
There is one substrate entity of kind `event-log-append-call-site` for the polity; call its slug $E_L$.
The realization commits to the singleton constraint stated in the object record.

## Cell trace

The frontmatter projection produces the following cells in the substrate $S(P)$ at the value-domain $\mathbf{L} = \{\bot, \mathbf{t}, \mathbf{f}, \top\}$:

$$ \begin{aligned} (E_L,\ \texttt{implementation-module},\ \text{"pyfars.runtime.event\_log"}) &= \mathbf{t} \\ (E_L,\ \texttt{implementation-class},\ \text{"EventLog"}) &= \mathbf{t} \\ (E_L,\ \texttt{implementation-method},\ \text{"append"}) &= \mathbf{t} \\ (E_L,\ \texttt{opens-path-pattern},\ \text{"<root>/<event-log-dir>/<YYYY-MM-DD>.jsonl"}) &= \mathbf{t} \\ (E_L,\ \texttt{open-mode},\ \text{"a"}) &= \mathbf{t} \\ (E_L,\ \texttt{audited-by},\ \text{auditing-codepath-uniqueness}) &= \mathbf{t} \end{aligned} $$

Every other cell of shape $(E_L,\ \texttt{<predicate>},\ \texttt{<value>})$ for predicates not in the set above is at $\bot$ (no information).
The cells *cannot* hold the value $\mathbf{f}$ unless authored to reject a candidate (none such here).

## Singleton constraint

For any other entity $E_L'$ in $S(P)$ of kind `event-log-append-call-site`, the substrate carries:

$$ (E_L,\ E_L') \in \{\langle E, E'\rangle : E \neq E' \land \text{both are kind-event-log-append-call-site for the same event-log resource}\} \implies \top $$

— two such entities targeting the same event-log resource produce a $\top$-cell (contested-state) under the singleton constraint, and the [`auditing-codepath-uniqueness`](../morphisms/auditing-codepath-uniqueness.md) morphism produces a finding.
In the present polity there is no second entity; the singleton holds; no $\top$-cell exists; no finding is authored.

## Witness of the surface-invariant-codepath concept

The concept [`surface-invariant-codepath`](../concepts/surface-invariant-codepath.md) names two clauses; this example witnesses the *codepath-uniqueness* clause:

- The substrate names exactly one canonical call site via $E_L$'s frontmatter cells.
- Every realization caller (per the cycle's stage-2 prior-art-cited inventory: `runtime/session.py:263`, `runtime/federation.py:421/538/605`, `runtime/lifecycle.py:144/330`, `runtime/promote.py:1338/1376`, `runtime/tool_registry.py:75`, `web/app.py:461`, `cli/hook_dispatch.py`, future `mcp/tools.py` write tools) terminates at the single library function the cells name.

The *surface-blindness* clause is witnessed by separate examples (deferred to a follow-on cycle, per the morphism record's discipline note).

## Falsifiability

This example would *not* hold for the polity if any of the following were true:

- Some pyfars module opened `<root>/.fars/event-log/<date>.jsonl` for append outside the named function.
  Verifiable by source-code grep returning $> 1$ match.
- A second `event-log-append-call-site` entity were authored in the substrate with conflicting cells.
  Verifiable by listing entities of that kind.
- The `implementation-method` cell were $\mathbf{f}$ for the value `"append"`.
  Verifiable by inspecting the substrate cell directly.

None of the three holds in the running 561 polity at the time of authoring.
The example witnesses the object's well-formedness for $P$.
