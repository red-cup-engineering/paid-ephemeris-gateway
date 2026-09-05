---
name: "Issuing building permit"
description: "Adopts a permit decision in favor of an applicant: writes the approval record, files the certificate to the public registry, and witnesses the issuance. Use when a complete application has been reviewed against code and meets all requirements."
---


## Requirements

- A complete permit application record under `operations/triage/dispatch-intents/`
- Code-review notes establishing compliance
- Authorization from the building-safety-director office (or the director's named delegate)

## Steps

1. Verify the application is within the 30-day decision window per Charter Article III §3.
2. Confirm code-review notes establish compliance on every reviewed axis.
3. Write the permit decision record to `governance/decisions/permits/<permit-slug>.md` with `decision: approved`, `decided-by: <agent-slug>`, `decided-at: <iso-timestamp>`.
4. File the certificate to the public registry through the records clerk.
5. Witness the issuance with the appropriate metadata.

## Outcomes

A permit decision record exists; the certificate appears in the public registry; the applicant is notified through the records clerk.
The applicant's intent record's status moves to `resolved`.
