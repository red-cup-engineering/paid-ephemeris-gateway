---
name: "Flagging budget overrun"
description: "Notifies mayor and council of a department's projected or actual overrun on a budget line within 5 business days of detection. Use when monthly reconciliation or in-month tracking shows a line approaching or exceeding its unencumbered balance."
---


## Requirements

- Monthly reconciliation showing the line's status
- Department-level forecast for the remainder of the FY
- Authorization from the finance-director office

## Steps

1. Calculate the projected variance: forecast remaining spend minus unencumbered balance.
2. If variance is negative (overrun), write a flag record to `governance/decisions/budget-flags/<line-slug>-<date>.md` with the variance, projected exhaustion date, and recommended action (amendment, contingency draw, or department-level reduction).
3. Notify mayor and council through the standard inter-office channel.
4. File a copy to the records clerk.
5. Witness the flag.

## Outcomes

A flag record exists.
Mayor and council are notified.
Council has the information needed to consider a budget amendment, contingency draw, or other remedy.
The Charter Article I C2 fiscal-responsibility commitment is upheld through the flag's surfacing.
