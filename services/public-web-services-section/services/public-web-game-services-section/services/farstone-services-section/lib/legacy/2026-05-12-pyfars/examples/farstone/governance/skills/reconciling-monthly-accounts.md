---
name: "Reconciling monthly accounts"
description: "Finance-director action that reconciles the prior month's actuals against the budget line-by-line, flagging variances. Use as the monthly closing procedure."
---


## Requirements

- Treasury system actuals for the closed month
- Approved budget for the fiscal year
- Finance-director authority

## Steps

1. Pull each line-item's actuals from the treasury system.
2. Compare against the approved budget line-by-line.
3. Flag variances exceeding the line's tolerance (default: 5%).
4. Write the reconciliation record to `operations/reconciliations/<YYYY>-M<NN>.md`.

## Outcomes

The reconciliation record exists; flagged variances queue `flagging-budget-overrun` workitems; the month is closed when the reconciliation is filed.
