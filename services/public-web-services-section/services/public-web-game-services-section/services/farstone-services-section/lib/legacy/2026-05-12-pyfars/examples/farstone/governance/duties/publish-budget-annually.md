---
title: "Publish budget annually"
type: jural-relation
kind: duty
active-holder: finance-director
passive-party: farston-residents
scope-action: budget-publication
triggering-powers:
  - prepare-draft-budget
required-action: publish-adopted-budget
enforcement: charter-violation
rule-type: N→N
cadence: per-fiscal-year
charter-section: "Article III §5"
---


Per Charter Article III §5, the finance director presents a draft FY budget to the council by April 15, and the council adopts a final budget by June 15.
The adopted budget is published immediately upon adoption.

## Trigger

The fiscal-year boundary (FY begins July 1).

## Required action

By April 15: submit draft budget to council.
By June 15: council adoption signed by mayor; finance director publishes the adopted budget to `governance/decisions/budget-fy<year>.md` and to the public registry.

## Enforcement

A fiscal year ending without a published adopted budget produces `(finance-director, charter-binding-violated, true) = T` plus `(city-council, charter-binding-violated, true) = T` (joint failure).
Eligibility-by-charter-binding disqualifies both until the duty is discharged.
