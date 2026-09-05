---
name: "Accepting citizen petition"
description: "Receives a citizen-filed petition, validates required fields and signature count, files it to the public registry, and emits a citizen-petition dispatch intent. Use whenever a citizen presents a petition meeting Charter Article III §3 thresholds."
---


## Requirements

- Petition document with petitioner identity, subject, and at least the threshold signature count for the petition class
- Records-clerk authority

## Steps

1. Validate the petition's required fields and signature count.
2. Assign a petition slug (e.g. `citizen-petition-YYYY-NNN`).
3. Write the petition record under `operations/triage/dispatch-intents/`.
4. Emit a `citizen-petition-received` witness so downstream dispatch fires.

## Outcomes

The petition is in the public registry; the dispatch intent appears for next-tick scheduling; the petitioner has a tracking slug.
