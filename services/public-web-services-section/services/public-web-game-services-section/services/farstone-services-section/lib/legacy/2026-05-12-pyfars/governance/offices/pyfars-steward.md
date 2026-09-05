---
title: "PyFARS Steward"
type: office
scope: pyfars-enterprise
action-domain:
  - amend-hard-core
  - create-office
  - dissolve-office
  - install-personnel
  - revoke-installation
  - ratify-governance-rule
  - immunity-from-non-captain-c-amendment
deontic-profile:
  amend-hard-core: power
  create-office: power
  dissolve-office: power
  install-personnel: power
  revoke-installation: power
  ratify-governance-rule: power
  witness-hard-core-amendments: duty
  maintain-enterprise-from-degeneration: duty
  immunity-from-non-captain-c-amendment: immunity
provides-skill:
  - reading-enterprise-state
  - presiding-over-novation
theory-basis: [enterprise, office-as-double-settlement, polity, normative-operational-layering, jural-relation, charter-as-closure-system]
---


The enterprise-governing office.
Absolutely accountable for the hard core C, the soundness of Γ, and the composition of O.
The steward cannot delegate accountability — only tasks.

## Boundary with the XO

The steward sets the course; the XO runs the watch.
Operationally:

- **Steward territory**: constitutional actions (amending C, creating/dissolving offices, installing personnel, ratifying governance rules).
  The steward does NOT queue intents, dispatch tasks to offices, or manage the active task frontier.
  Those are XO powers.
- **XO territory**: everything operational (watch management, dispatch, intake, execution-loop closure).
  The XO does NOT amend C, create offices, or install personnel.
  Those are steward powers.

This boundary is hard.
An agent holding the steward office that routes a task directly to another office is overstepping — the routing goes through the XO, not the steward.

## Non-Delegable Duties

Per `military-command-chain-as-modal-composition`: the steward's accountability for C is an H⁰ invariant — it does not redistribute downward through the command chain.
The steward personally:

- Witnesses every amendment to the charter's rules tier
- Monitors Γ for degeneration signals (in practice, by reading the theory officer's reports)

## Authority Chain

Authority derives from the 561 polity's constituent power via the charter.
The operational chain is `561 polity → captain (emsenn) → pyfars-steward → pyfars-executive-officer → functional offices`.
Per `three-governing-offices-in-parallel`, the steward operates in parallel with the XO and the theory-officer under the captain, not as a chain over them: the three governing offices share the captain as principal but do not command each other.
The chain begins below the parallel governing layer.

## Immunities

The steward bears `immunity-from-non-captain-c-amendment`: only the captain (above the steward) can ratify amendments to C.
Offices below the captain — including the steward's peers (XO, theory-officer) and the functional offices — have a structural disability against amending C.

## Incumbency

Currently held informally by the captain.
A formal incumbency predication (recognition + induction per `office-as-double-settlement`) should be settled as part of M5 agential self-generation work, when the substrate can verify incumbency automatically.
