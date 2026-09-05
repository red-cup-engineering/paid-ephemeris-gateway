---
title: "Report a Γ degeneration signal to the steward"
type: jural-relation
kind: power
active-holder: pyfars-theory-officer
passive-party: pyfars-steward
scope-action: file-degeneration-signal-report
correlate-of: liability
theory-basis: [enterprise, jural-relation, normative-operational-layering, delegation-as-authority-residuation]
---


When the theory officer's coverage audit detects one of the three degeneration indicators from `enterprise`, the officer may file a degeneration-signal report directed to the steward.
The steward has a liability: the report creates an obligation to respond — either act on the signal or file a counter-reading explaining why the signal is a false positive.

The passive party here is specifically the steward (not the general community), because the steward is the only office with the authority to take corrective governance action.
Filing to the community-at-large produces no liability; filing to the steward does.

## How a report is filed

A degeneration-signal report is a triage note under `operations/engineering/triage/` with: - `requires-action: steward-review` - Body identifying which of the three degeneration modes is present (or suspected) - Evidence: what substrate-observable signals were found - A reference to the corresponding governance-layer coverage snapshot

## The steward's correlative liability

Per the correlate-of mapping in `jural-relation`, the steward's correlate is a liability: $\langle \mathrm{steward}, \texttt{kind}, \texttt{liability}\rangle$ with scope-action `respond-to-degeneration-report`.
The `maintain-enterprise-from-degeneration` duty is the mechanism by which this liability becomes a duty: receiving a degeneration report triggers the duty.

## Duty that attaches to the theory officer

- `escalate-degeneration-to-steward` fires when a degeneration signal is found during an audit.
  The officer may not sit on a confirmed signal; the power to report becomes a duty when the trigger condition is met.
