---
title: "Escalate a confirmed degeneration signal to the steward"
type: jural-relation
kind: duty
active-holder: pyfars-theory-officer
passive-party: pyfars-steward
scope-action: file-confirmed-degeneration-report
triggering-powers:
  - audit-derivation-chain
required-action: file-degeneration-signal-triage-note
enforcement: substrate-violation
rule-type: O→N
theory-basis: [enterprise, normative-operational-layering, jural-relation]
---


When an audit (`audit-derivation-chain`) produces a confirmed degeneration signal — one of the three indicators from `enterprise` is present in the substrate evidence — the theory officer MUST file a degeneration-signal triage note directed to the steward.
Sitting on a confirmed signal is a substrate violation.

This duty is **O→N**: the operational event of detecting a degeneration signal (the audit's finding) creates a normative obligation on the theory officer (the duty to file).
The signal detection is the antecedent; the duty cell fires as the consequent.

## Confirmed vs. suspected

The duty fires on *confirmed* signals — cases where the audit has found positive substrate evidence of degeneration (loop stalled for multiple sessions, aim-set empty, cell-pattern inverted).
A *suspected* signal — one reading of ambiguous evidence — does not trigger the mandatory duty, though the officer may still file the report voluntarily using `report-degeneration-signal`.

The threshold for confirmation:

- **Exhaustion of positive heuristic**: `auditing-theory-derivation-coverage` has returned no new derivation-ready material on two or more consecutive derivation cycles.
- **Institutional corruption**: the ratio of harness-maintenance tasks to substrate-capability tasks in `work/tasks/engineering/` has exceeded 2:1 for the current active milestone.
- **Closure of domain**: the predication-categories research program has had no new theorems or objects added for more than one month of active sessions.

## Required action

1. File a triage note under `operations/engineering/triage/` with:
   - `requires-action: steward-review`
   - The specific degeneration mode confirmed
   - The substrate evidence (which records, which cell-patterns, which cycle counts)
   - A reference to the coverage snapshot where the signal appeared
2. Do not file a vague report.
  The steward's response is only as good as the officer's documentation; an underdocumented escalation does not satisfy the duty.

## Why this is O→N

An `escalate-when-theory-gap-found` style duty (N→O) fires because a power exercise encounters a condition.
This duty fires because an *operational observation* (the audit finding) creates a *normative obligation* (to report).
The audit's finding is the operational fact; the duty to escalate is the normative consequence.
Per `normative-operational-layering`, O→N rules are those where an operational event modifies the normative standing.
The detection of the signal is the operational event; the duty cell asserting "must escalate" is the normative output.

## Distinction from `maintain-derivation-chain-integrity`

`maintain-derivation-chain-integrity` is the *standing duty* to run audits continuously.
`escalate-degeneration-to-steward` is the *triggered duty* that fires when an audit produces a confirmed finding.
The standing duty creates the cadence; this duty fires on a specific result.
