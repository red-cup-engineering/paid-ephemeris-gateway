---
name: "Authorizing line-item spend"
description: "Finance-director action that authorizes a specific expenditure against an approved budget line-item, decrementing the available balance. Use whenever a department requests funds against a budget line."
---


## Requirements

- An approved budget line-item with remaining balance
- The requesting department's purchase request
- Finance-director authority

## Steps

1. Read the line-item's approved amount and current spent total.
2. Verify the request fits the remaining balance.
3. Write an authorization record under `governance/decisions/budget-flags/<request-slug>.md`.
4. Update the line-item's `(line-item, spent-total, ?)
  ` cell.

## Outcomes

The expenditure is recorded; the line-item's balance decrements; if the spend would exceed the line's approved amount, the rule emits a budget-overrun anomaly instead.
