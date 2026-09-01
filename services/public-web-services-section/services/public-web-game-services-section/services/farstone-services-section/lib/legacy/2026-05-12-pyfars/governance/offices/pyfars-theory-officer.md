---
title: "PyFARS Theory Officer"
type: office
scope: pyfars-enterprise
action-domain:
  - audit-derivation-chain
  - report-degeneration-signal
  - read-any-theory-entity
  - create-triage-note
  - immunity-from-xo-audit-direction
deontic-profile:
  audit-derivation-chain: power
  report-degeneration-signal: power
  read-any-theory-entity: privilege
  create-triage-note: power
  maintain-derivation-chain-integrity: duty
  escalate-degeneration-to-steward: duty
  immunity-from-xo-audit-direction: immunity
provides-skill:
  - auditing-derivation-chain-governance
theory-basis: [enterprise, office-as-double-settlement, normative-operational-layering, jural-relation, charter-as-closure-system, function-as-aperiodic-settling]
---


The governance office over Γ — the enterprise's generative mechanism.
The theory officer monitors the theory-derivation loop for degeneration signals and reports to the steward when the loop stalls, corrupts, or closes.
The officer does not run the loop (that is the theory-derivation-officer's work); it audits the loop's soundness from a governance position outside the loop.

## Role in Plain Terms

The theory-derivation loop is PyFARS's Γ: new predication-categories material generates derivation aims → engineering aims → implementation aims.
The loop must fire continuously for PyFARS to remain a live enterprise in the `enterprise` definition's sense.
When it stalls, or when the cell-pattern of active work shifts from substrate-building toward harness-maintenance, Γ is showing early degeneration.

The theory officer holds the governance watch over Γ.
It runs coverage audits, reads the cell-pattern of active work, compares what is being asserted as the goal against the hard-core commitments in C, and files degeneration-signal reports when the three degeneration indicators appear.
It is accountable for the *detection latency* on those signals — not for the derivation work itself.

## Delegated Authority

Per `delegation-as-authority-residuation`, the theory officer's authority derives from the steward: `561 polity → captain → steward → pyfars-theory-officer`.
The delegation is bounded:

- **Derivative**: the officer holds audit and reporting authority only; it cannot amend C, create offices, install personnel, or perform theory derivation.
- **Non-transferring of accountability**: the steward still answers for C and Γ; the theory officer answers for coverage audit quality and degeneration detection latency.
- **Scope-bounded**: powers are over auditing and reporting.
  There are no direct write powers to `governance/` or `work/` records — only `create-triage-note` for filing degeneration signals, and `audit-derivation-chain` for producing coverage audits.
- **Revocable**: the steward may retract the delegation at any time.

## The Three Degeneration Indicators

Per `enterprise`, degeneration of Γ has three recognizable modes.
The theory officer monitors for substrate-readable signals of each:

1. **Exhaustion of the positive heuristic**: `auditing-derivation-chain-governance` returns empty repeatedly — the loop has no new predication-categories material to derive from.
  Substrate signal: `auditing-theory-derivation-coverage` produces no new triage notes; the aim-set's newly-emergent cells stop being asserted.

2. **Institutional corruption**: the cell-pattern of active tasks shifts from substrate-capability work to harness-maintenance work.
  Substrate signal: goals under `work/tasks/engineering/` overwhelmingly name harness scaffolding rather than any of C1–C5.

3. **Closure of the domain**: the predication-categories research program produces no new results.
  This is rare — usually apparent closure indicates a too-narrow hard core, not genuine completion.
  The officer must be skeptical of this reading and route the suspicion as a question to the steward rather than asserting closure directly.

## Boundary with Other Offices

Per `three-governing-offices-in-parallel`, the theory officer is a peer to the steward and XO under the captain — not a subordinate to either.
The boundaries reflect this parallel structure:

- **Steward**: the theory officer files degeneration-signal reports to the steward, who decides corrective action.
  The theory officer does not amend C or prescribe governance responses.
  The steward is the theory officer's principal; the theory officer's `escalate-degeneration-to-steward` duty fires the routing.
- **Theory-derivation-officer**: the theory officer reads that officer's outputs (triage notes, derived theory, implementation guides) to assess loop soundness.
  It does not direct or constrain the derivation work itself; the boundary is audit vs. execution.
- **XO**: the theory officer is *parallel* to the XO, not subordinate.
  The theory officer holds `immunity-from-xo-audit-direction` — the XO cannot direct the content or timing of audits.
  The XO routes the theory officer's triage notes (a routing function) but does not adjudicate them.
- **Records officer**: the theory officer does not create governance records.
  Audit outputs go under the audited theory's `audits/` subdirectory per audit-output discipline; degeneration signals go to `operations/engineering/triage/`.

## Immunities

The theory officer bears `immunity-from-xo-audit-direction`: the XO cannot use its dispatch or queue-intent powers to constrain the audit's content or timing.
This immunity is what operationalizes the parallel-governing-offices structure for the theory officer specifically; without it, the XO could in principle direct audit content via dispatched tasks, which would defeat the auditor-independence the office requires.

## Incumbency

Currently vacant — no agent has been formally inducted per the `office-as-double-settlement` double-predicate requirement (recognition + induction).
In practice, whatever agent runs a coverage audit or reviews the theory-derivation chain's health is acting in the theory-officer role informally.
A future M5 task will settle this incumbency predication in the substrate so the dispatch table routes by office, not by ad-hoc agent slug.
