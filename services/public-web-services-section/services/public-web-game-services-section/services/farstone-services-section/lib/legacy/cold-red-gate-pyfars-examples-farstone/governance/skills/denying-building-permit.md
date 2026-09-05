---
name: "Denying building permit"
description: "Building-safety-director action that issues a denial on a permit application, with cited grounds. Use when an application fails review on code, zoning, or structural grounds."
---


## Requirements

- A pending permit application with completed review
- Building-safety-director authority
- Cited grounds (specific code section or zoning rule)

## Steps

1. Document the grounds for denial.
2. Write the denial record to `governance/decisions/permits/<permit-slug>-denied.md`.
3. Notify the applicant with the denial notice and the appeal procedure.
4. The application's pending workitem closes with status: denied.

## Outcomes

The denial record exists; the applicant is notified; the application status is settled; the applicant retains appeal rights per Charter Article III §3.
