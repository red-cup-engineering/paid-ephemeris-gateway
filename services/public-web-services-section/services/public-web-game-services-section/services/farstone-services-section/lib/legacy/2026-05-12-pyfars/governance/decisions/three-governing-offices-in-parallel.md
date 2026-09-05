---
title: "Three governing offices operate in parallel under the captain"
type: decision
status: committed
date: "2026-05-07"
theory-basis: [military-command-chain-as-modal-composition, jurisdiction-as-base-change, jural-relation, charter-as-closure-system]
---


## What

The PyFARS enterprise has three governing offices — `pyfars-steward`, `pyfars-executive-officer`, `pyfars-theory-officer` — that operate as *peers* under the captain (`emsenn`), not as a linear chain.
None of these three offices commands the others; each holds its own domain of authority under the captain's authority.
The XO commands the *functional* offices (records, theory-derivation, developer) via dispatch, but cannot command its peer governing offices.

## Why

Per `military-command-chain-as-modal-composition`, two governance patterns are admissible:

- **Military-command (chain composition)**: per-rank frames compose serially via $R^{r_1} \circ R^{r_2} \circ \cdots \circ R^{r_n}$.
  Authority flows downward as a single composite operator.
  Each rank's authority is bounded by the rank above it.
- **Civilian Hohfeldian pluralism (parallel composition)**: multiple authorities operate in parallel under separate `jurisdiction-as-base-change` jurisdictions.
  Each authority has its own $R^{A_i}$, fibered over its own sub-base $\mathcal{C}_{J_i}$.

PyFARS uses **both patterns** at different layers:

- Below the XO: military-command.
  The XO's `dispatch-task-to-office` power composes with the functional offices' execution authority.
  The chain `XO → records-officer / theory-derivation-officer / developer` is a chain composition; the XO directs, the functional offices execute.
- Among the three governing offices: civilian-pluralism.
  The steward, XO, and theory-officer have *different jurisdictions* (the hard core, operational dispatch, Γ governance respectively).
  They operate in parallel under the captain, each fibered over its own sub-base of substrate cells.

The parallel structure is required because the three governance domains are *non-overlapping by design*.
The steward should not be drawn into operational dispatch decisions (the XO's domain); the XO should not be drawn into Γ-monitoring (the theory officer's domain); the theory officer should not be drawn into hard-core amendment (the steward's domain).
Each office's effectiveness depends on the bounded jurisdiction.

## Rules out

- Treating the XO as the principal of the theory-officer or the steward.
  The XO has no command authority over its peer governing offices.
- Routing audit findings or constitutional matters through the XO as if the XO had authority to decide on them.
  The XO routes (operationally) but does not adjudicate (substantively).
- Adding a fourth governing office without explicit consideration of which jurisdiction it occupies.
  New governing offices are constitutional changes — they require steward-led governance change at minimum, possibly novation.

## Does not constrain

- The captain's authority over all three governing offices.
  The captain is above the parallel structure; the immunities the governing offices hold (e.g., `immunity-from-non-captain-c-amendment`, `immunity-from-xo-audit-direction`) are immunities *from each other*, not from the captain.
- The XO's military-command authority over the functional offices.
  Below the parallel layer, chain composition resumes.
- Whether new governance functions need to be added to existing offices vs. carved into a new parallel office.
  That is a design question per case.

## Theoretical content

Per `jurisdiction-as-base-change`, each governing office's authority is a fiber over its own sub-base $\mathcal{C}_{J_i}$:

- **Steward**: $\mathcal{C}_{J_{\text{steward}}}$ = cells in the rules tier (C1–C5) and the installation/revocation predicates.
- **XO**: $\mathcal{C}_{J_{\text{XO}}}$ = cells in the operational-routing predicates (intent queue, dispatch, watch-state).
- **Theory officer**: $\mathcal{C}_{J_{\text{theory}}}$ = cells in the derivation-coverage and degeneration-signal predicates.

The three sub-bases are essentially disjoint.
Per `tradition-pluralism-as-fragment-coproduct`, when sub-bases are disjoint, the parallel-composition is *cohomologically clean*: there is no obstruction to running both patterns simultaneously, because the patterns do not collide in their respective fibers.
PyFARS's parallel-then-chain structure is structurally sound.

## What this clarifies that the charter does not

The charter (current version 0.2) lists the three governing offices and the three functional offices, and gives an authority chain from `561 polity → captain → steward → XO → functional offices`.
This chain is correct for the operational domain — it traces the dispatch path.
But it does not show where the theory-officer fits.
The answer: not in the chain.
The theory-officer is *parallel* to the steward and XO under the captain, not subordinate to either.

A future charter amendment may make this explicit.
Until then, this decision is the canonical record of the structure.
