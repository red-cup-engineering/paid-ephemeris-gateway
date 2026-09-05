---
type: workitem
subtype: derivation
title: "Audit FY2026 budget through Q3"
status: pending
priority: medium
requires-capabilities:
  - fiscal-authority
requires-skills:
  - reconciling-monthly-accounts
  - flagging-budget-overrun
touches:
  - examples/farston/governance/decisions/budget-flags/
target-completion: "2026-08-15"
acceptance:
  - all-line-items-reconciled
  - overruns-flagged
  - report-filed
---


Quarterly reconciliation of the FY2026 budget through Q3 (FY ends September 30).
Director Johnson's standing duty per Charter Article I C2 fiscal-responsibility.

## Derivation

The audit is a derivation: line-by-line reconciliation against the adopted budget, applying the rules in `specifications/water-quality-thresholds.md` (no, sorry — applying standard accounting reconciliation; the spec for budget-line classification will come later if needed).

1. Pull each line item's actuals from the treasury system.
2. Compare against the adopted budget: encumbered, unencumbered, projected exhaustion.
3. Flag any line whose forecast exhausts before FY end; invoke flagging-budget-overrun skill on each.
4. Compile the Q3 report; file to records clerk; notify mayor and council.

## Known concern

Snow-removal subline showing forecast overrun.
Director Johnson's flag on this is pending council notification — the audit may surface additional lines as Q3 transactions clear.

## Acceptance

- [ ] All line items reconciled against actuals.
- [ ] Each overrun flag filed with variance and projected exhaustion date.
- [ ] Q3 report filed with records clerk by 2026-08-15.
