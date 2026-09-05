---
title: "Finance Director"
type: office
scope: budget-treasury-reconciliation
reports-to: mayor
action-domain:
  - prepare-draft-budget
  - reconcile-monthly-accounts
  - authorize-line-item-spend
  - flag-overrun
  - publish-budget-status
deontic-profile:
  prepare-draft-budget: duty
  reconcile-monthly-accounts: duty
  authorize-line-item-spend: power
  flag-overrun: duty
  publish-budget-status: duty
  veto-overrun-spend: power
provides-capabilities:
  - fiscal-authority
  - budget-management
provides-skill:
  - preparing-draft-budget
  - reconciling-monthly-accounts
  - authorizing-line-item-spend
  - flagging-budget-overrun
jurisdiction-write:
  - examples/farston/governance/decisions/
  - examples/farston/operations/triage/dispatch-intents/
  - examples/farston/work/tasks/municipal/
---


The office that manages the city's budget and treasury.
Prepares the annual draft budget by April 15 (Charter Article III §5), reconciles accounts monthly, authorizes line-item expenditures, and flags overruns to the mayor and council.

## Powers

- **Authorize line-item spend.** Within an approved budget line; up to the line's unencumbered balance.
- **Veto overrun spend.** Refuse to authorize an expenditure that would exceed an unencumbered balance, regardless of departmental request.
  Mayor or council may override only by formal budget amendment.

## Duties

- **Prepare draft budget by April 15** annually.
- **Reconcile monthly accounts.** Reports filed to the records clerk by the 15th of the following month.
- **Flag overrun** to mayor and council within 5 business days of detection.
- **Publish budget status** monthly; available to citizens through the records clerk.

## Current status

FY2026 budget adopted June 12, 2026, with $48k contingency line.
Public Works projecting overrun on snow-removal subline; flag pending council notification.
