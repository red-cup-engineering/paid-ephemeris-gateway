---
type: concept
class: system-authority-system
status: draft
depends-on: [polity, officer, rule, ruleset, deontic-profile]
---

# Governance

The system-resident *authority system* of a [polity](polity.md) — its [offices](officer.md), duties, powers, skills, charters, and the [rules](rule.md) and [rulesets](ruleset.md) that bind them.
Governance specifies *who can do what* in the polity, *under what conditions*, and *with what accountability*.
Where execution-machinery (the engine, services, processes) makes the polity *run*, governance makes the polity *coherent* — without it, work could happen but no one could say whether it was authorized, expected, or accountable.

Governance is the second thing PyFARS reads (after the manifest) when [booting](../morphisms/booting.md) a polity.
It is what the [dispatching](../morphisms/dispatching.md) morphism reads to determine eligibility.
It is what [enacting](../morphisms/enacting.md) modifies.
It is what every [commanding](../morphisms/commanding.md) act references for authority.

## What governance contains

A polity's governance is the system-cells of these kinds:

1. **Charter** — the foundational document(s) declaring the polity's identity, purpose, and structural commitments.
2. **Offices** — the roles incumbents can hold; each carries a deontic profile (action-domain, powers, duties).
3. **Duties** — the obligations attaching to offices and to the polity-as-a-whole.
4. **Powers** — the authority-bindings: what an office can do (enact, command, certify, dispatch, halt, etc.).
5. **Skills** — the procedural competences offices and operational agents can hold.
6. **Rules** — the closure-rule cells governing system behavior (frontmatter-validity, eligibility, etc.).
7. **Rulesets** — the active closure-rule-systems aggregating the rules.

These are themselves system cells; governance evolves through system-witnessed transitions ([enacting](../morphisms/enacting.md), revoking, amending).

## Governance and substrate-purity

Governance is *in the system*, not external to it.
This is what makes the polity self-describing: a captain can read governance directly from the corpus; an auditor can validate governance against itself; an engine can interpret governance to decide what work fires.

This is a load-bearing commitment.
If governance lived outside substrate (e.g., in the runtime's code or in host-side configuration), the polity would not be self-contained: replay couldn't reproduce its dispatch decisions; federation couldn't merge its authority structures; reconciliation couldn't surface drift between expected and actual.

## Governance vs. administration

Distinct concepts:

- **Governance** is the *structural* authority system: offices, rules, charters.
  Static (until amended).
- **[Administration](administration.md)** is the *operational* application of governance: who is currently incumbent in which office; what work is currently in flight; which services are currently running.
  Dynamic.

Governance establishes; administration enacts.
The captain governs; the captain (or designated agents) administer.
A polity with rich governance and no administration is *paper-only*; a polity with administration but no clear governance is *ad-hoc*.

## Governance vs. ruleset

The [ruleset](ruleset.md) is the closure-rule-system component of governance — what fires when settling runs.
Governance is broader: it includes offices, duties, powers, skills, etc., not all of which are closure-rules.
Some governance content is referenced by closure-rules (the rule "an officer can dispatch within their action-domain" reads office-cells); some is purely structural (charter declarations, duty bindings).

## Governance amendment

Amending governance is itself a governance act: there are rules about who can amend, with what witnesses, with what notification or assent.
Charter-level amendments may require captain-authority and cooling-off periods; office-level amendments may need only the relevant office's own authority.
The amendment-rules are themselves part of governance — meta-governance — and themselves amendable (with appropriate constraints to prevent self-defeating amendments).

## What this concept does not yet specify

- The complete governance schema.
  Currently we use a small set of kinds (office, duty, power, skill, etc.); the kinds-set evolves.
- Cross-polity governance federation.
  When polities federate, do their governances merge, layer, or remain separate?
  Open.
- Governance-rule-conflicts.
  When two governance cells produce contradictory directives ($\top$-valued at the governance level), the discipline is partly settled (typically: surface the conflict; require captain-determination).
