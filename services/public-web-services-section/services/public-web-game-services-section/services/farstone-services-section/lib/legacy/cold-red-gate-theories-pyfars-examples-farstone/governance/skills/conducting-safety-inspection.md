---
name: "Conducting safety inspection"
description: "Building-safety-director action that inspects a structure for building-code compliance during construction or after an incident. Use during permit-required construction inspections or post-incident investigations."
---


## Requirements

- A target structure (permit slug or address)
- Building-safety-director authority
- Building-code reference

## Steps

1. Inspect the target against the relevant building-code sections.
2. Note any code violations with location and severity.
3. Write the inspection record to `operations/building-inspections/<target-slug>-<date>.md`.
4. On code violations, issue a stop-work order if the construction is active and queue a remediation workitem.

## Outcomes

The inspection record exists; the target carries its `building-code-compliance` cell; stop-work orders and remediation workitems queue when violations are found.
