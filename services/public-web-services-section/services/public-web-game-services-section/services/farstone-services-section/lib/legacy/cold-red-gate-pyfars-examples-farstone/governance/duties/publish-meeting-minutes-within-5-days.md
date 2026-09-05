---
title: "Publish meeting minutes within 5 days"
type: jural-relation
kind: duty
active-holder: records-clerk
passive-party: farston-residents
scope-action: minutes-publication
triggering-powers:
  - publish-meeting-minutes
required-action: file-published-minutes-to-public-registry
enforcement: charter-violation
rule-type: N→N
cadence: per-council-meeting
charter-section: "Article I C3"
---


Per Charter Article I C3, the records clerk shall publish council meeting minutes to the public registry within 5 business days of the meeting.

## Trigger

A council meeting concluding (regular session or emergency session).

## Required action

Within 5 business days, write a published-minutes record to `governance/decisions/minutes/<meeting-date>.md` and surface it through the public registry.

## Enforcement

A meeting whose `concluded-at` is more than 5 business days old without a published-minutes record produces `(records-clerk, charter-binding-violated, true) = T`.
Eligibility-by-charter-binding then disqualifies the office until the duty is discharged.
