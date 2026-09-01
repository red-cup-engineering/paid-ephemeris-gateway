---
title: "Decide permit within 30 days"
type: jural-relation
kind: duty
active-holder: building-safety-director
passive-party: permit-applicants
scope-action: permit-decision
triggering-powers:
  - issue-building-permit
  - deny-building-permit
required-action: file-permit-decision-record
enforcement: charter-violation
rule-type: N→N
cadence: per-application
charter-section: "Article III §3"
---


Per Charter Article III §3, the building-safety director's office shall decide every complete permit application (approve, deny with reason, or request additional information) within 30 calendar days of the complete-application receipt.

## Trigger

A complete permit application landing in `operations/triage/dispatch-intents/` with classification `permit-application`.

## Required action

Within 30 days, file a decision record under `governance/decisions/permits/<permit-slug>.md` with `decision: approved | denied | additional-information-requested`.

## Enforcement

An application whose `received-at` is more than 30 calendar days old without a decision record produces `(application, charter-bound-c5, jurisdictional-boundaries-violated) = T` and `(building-safety-director, charter-binding-violated, true) = T`.
The eligibility-by-charter-binding rule then disqualifies the office from receiving new permit dispatches until the duty is discharged on at least one held application.
