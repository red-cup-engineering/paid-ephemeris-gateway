---
type: morphism
status: draft
revised: 2026-05-09
class: closure-rule
authored: 2026-05-09
authored-under-cycle: 2026-05-09-session-bootstrap-as-installation
derives-from-claim: session-bootstrap-as-installation
realizes:
  - office-as-double-settlement  # PredGov §"Connection to capability fiber bundle"
  - incumbent
theory-basis:
  - office-as-double-settlement
  - incumbent
  - capability-fiber-bundle
  - settling-monotonicity
  - agential-self-generation  # the persona layer that mediates session ↔ office
regime: strict
purity: system-state-only-context
future-split: this morphism captures two distinct rule firings — see body §"Two layers"
---

# Propagate office deontic profile to session (via persona)

The closure rule(s) that propagate an office's deontic profile from the office down to a Claude Code session that is currently bearing it.
Per [`session-as-ephemeral-incumbent`](../concepts/session-as-ephemeral-incumbent.md), this propagation is **two-layered** — and what's named here as a single morphism is, more honestly, two distinct rule firings that compose.

## Two layers

**Layer 1 — `propagate-office-deontic-profile-to-persona`.** Fires once at persona-investiture (e.g., 2026-04-05 for Calder Underhill into office:first-officer).
Per [`office-as-double-settlement`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/office-as-double-settlement.md) §"Connection to capability fiber bundle": when a candidate $\iota$ reaches dignitas, the office's capability section is joined pointwise to the incumbent's.
Here the incumbent is the *persona*; the propagation is durable; the persona's record carries the derived jural-relations forever after.

**Layer 2 — `engage-persona-watch-in-session`.** Fires per session at SessionStart.
The session's `wears-persona:` cell asserts the body-natural-of-persona relation.
Through this cell, the session inherits the persona's authorities transitively — no fresh capability propagation is needed because Layer 1 already settled the persona's authorities and they persist.
This rule is more like a *binding* than a *propagation*: it links the body-natural to the body-politic for the duration of the session.

A future substrate refactor should split this morphism's frontmatter into two slugs to match the two firings; for now, both are described here so consumers (the SessionStart hook handler, audit queries) have one place to read.

## Premise (Layer 1 — persona-investiture)

For a persona $p$ being installed into office $O$ at stage $\tau^*$:

- $\langle \iota_p, \texttt{recognized-as-incumbent-of}, O\rangle = \mathbf{t}$
- $\langle \iota_p, \texttt{inducted-into}, O\rangle = \mathbf{t}$
- $\langle p, \texttt{holds-office}, O\rangle = \mathbf{t}$
- $\exists R_i$ with $\langle R_i, \texttt{kind}, k_i\rangle = \mathbf{t}$ for $k_i \in \{\texttt{power}, \texttt{duty}, \texttt{privilege}, \texttt{immunity}\}$ and $\langle R_i, \texttt{active-holder}, O\rangle = \mathbf{t}$.

(Per [`office-as-double-settlement`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/office-as-double-settlement.md), the office's deontic profile is the family of jural-relations attached to the office.)

## Conclusion (Layer 1)

For each such $R_i$, the rule produces a derived jural-relation $R_i^p$ on the persona with:

- $\langle R_i^p, \texttt{kind}, k_i\rangle = \mathbf{t}$ — same kind.
- $\langle R_i^p, \texttt{active-holder}, p\rangle = \mathbf{t}$ — the persona is now the active-holder.
- $\langle R_i^p, \texttt{passive-party}, P_i\rangle = \mathbf{t}$ — same passive party as $R_i$.
- $\langle R_i^p, \texttt{scope-action}, X_i\rangle = \mathbf{t}$ — same scope.
- $\langle R_i^p, \texttt{derived-from}, R_i\rangle = \mathbf{t}$ — explicit linkage to the office's source jural-relation.
- $\langle R_i^p, \texttt{accountability-resides-in}, O\rangle = \mathbf{t}$ — accountability stays with the office.

These cells are durable.
They settle once per persona-investiture and persist across all sessions that subsequently wear the persona.

## Premise (Layer 2 — session-watch-takeover)

For a session-record $s$ at SessionStart stage $\tau_\mathrm{boot}$:

- $\langle s, \texttt{is-claude-session}, \mathbf{t}\rangle$
- The hook handler reads $\langle O, \texttt{held-by}, p\rangle = \mathbf{t}$ for the bound office $O$ and resolves persona slug $p$.

## Conclusion (Layer 2)

The rule asserts:

- $\langle s, \texttt{wears-persona}, p\rangle = \mathbf{t}$ — the body-natural-of-persona relation.
- $\langle s, \texttt{office}, O\rangle = \mathbf{t}$ — denormalized for query convenience; canonical chain is `s → wears-persona → holds-office`.

No new jural-relations are derived on the session.
The session's authority resolution at MCP-call-time walks `s.wears-persona → p → R_i^p` (the durable Layer-1 cells), and the residuation gate operates against $R_i^p$.
The session is a *body-natural* of the persona; the persona is the substrate-algebraic locus of authority.

## Why this is just the standard PredGov rule + a binding

Layer 1 is the substrate-instantiation of `office-as-double-settlement.md` §"Connection to capability fiber bundle"'s capability propagation, applied at the persona granularity. **No new substrate primitive.**

Layer 2 is the binding rule that `agential-self-generation` requires for any operative element to be a substrate entity — the session is operative; the session must record its body-politic relationship in the system.
The `wears-persona` cell is that record.

## Composition with revocation

**Layer 1 revocation.** If the captain relieves the persona via PredGov's [`succession`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/morphisms/succession.md), the persona's `holds-office` cell is retracted; each derived $R_i^p$ has its `active-holder` cell driven from $\mathbf{t}$ to $\top$ (per [`delegation-as-authority-residuation`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/delegation-as-authority-residuation.md) revocation row), then resolves to $\mathbf{f}$.

**Layer 2 revocation.** When the session-stop event lands and $\langle s, \texttt{stage-range-bound.close}, \tau_\mathrm{stop}\rangle = \mathbf{t}$, the `wears-persona:` cell remains in the system (audit-trail discipline), but the session's runtime body-natural is gone.
The persona's $R_i^p$ cells are unchanged — they remain available for the next session to wear.

## When this rule is bypassable

It isn't.
The persona's authority resolution at MCP-call-time walks `wears-persona → holds-office → derived jural-relations`; bypassing the wears-persona link would mean the session has no path to the office's authority, and every MCP write would ultra-vires per the residuation gate.
The harness's `.claude/` projection is *separate* — [`project-delegable-skills`](project-delegable-skills.md) fires at install-time and concerns which skill records get *exposed* in the session's surface; this morphism concerns which jural-relations the session can *exercise*.
A session whose `.claude/` carries a skill but whose persona lacks the skill's underlying jural-relation cannot invoke it through the system-mediated MCP path.

## Status

`draft` because the closure-rule formalization in [closure-rule-language](../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/closure-rule-language.md) is not yet authored, and the substrate refactor that splits this morphism into two slugs (one per layer) has not been performed.
Promotion to `proved` requires both.
