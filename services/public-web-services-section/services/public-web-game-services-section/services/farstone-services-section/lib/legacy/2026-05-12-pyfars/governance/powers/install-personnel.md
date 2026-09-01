---
title: "Install personnel into an office"
type: jural-relation
kind: power
active-holder: pyfars-steward
passive-party: pyfars-community
scope-action: induct-candidate-into-office
correlate-of: liability
theory-basis: [office-as-double-settlement, jural-relation, normative-operational-layering, delegation-as-authority-residuation]
---


The steward may install a candidate (human or LLM agent) as the incumbent of an office.
Installation settles both required predicates of `office-as-double-settlement` on the candidate: recognition ($\langle \iota, \texttt{recognized-as-incumbent-of}, O \rangle = \mathbf{t}$) and induction ($\langle \iota, \texttt{inducted-into}, O \rangle = \mathbf{t}$), reaching the *dignitas* state — full incumbency.

Until installation by the steward, an agent acting in an office's role does so informally: the substrate has no incumbency cells at $\mathbf{t}$ for that agent and office.
The agent may exercise the office's powers as a practical matter, but the normative layer does not formally attribute those exercises to the office — the N→O capability-propagation rule has not fired.

## The two-predicate requirement

Per `office-as-double-settlement`, installation requires both predicates:

- **Recognition**: backward-sensitive.
  Accumulated witnesses (steward record, prior acknowledgments) settle the recognition predicate.
  An agent known to the community as legitimately holding the office is partially recognized even before formal installation.
- **Induction**: forward-obligating.
  The candidate has taken on the office's duties.
  Induction is not automatic on recognition; it requires an explicit act of acceptance — the candidate's own acknowledgment of the duties.

Installation by the steward settles both cells simultaneously, asserting both the community's recognition and the candidate's induction in a single substrate increment.
Post-M5, the two cells may be settled separately (recognition first, induction second) with the *interrex* and *recognition-only* intermediate states being substrate-readable.

## Succession

When a current incumbent is revoked and a new candidate installed, succession has occurred.
The substrate carries both the prior incumbent's revocation record and the new incumbent's installation record.
Per `succession-as-handoff-cobordism`, succession is a cobordism between the prior and new incumbency settling — the office's structural cells persist unchanged through the transition.

## Delegation and incumbency

Installing a candidate does not make them the steward.
The installed incumbent holds the *delegated* powers of their office, not the steward's constitutional powers, per `delegation-as-authority-residuation`.
A steward who installs themselves into the XO office simultaneously holds both roles — an unusual state that should be flagged as a potential concentration-of-authority concern.
