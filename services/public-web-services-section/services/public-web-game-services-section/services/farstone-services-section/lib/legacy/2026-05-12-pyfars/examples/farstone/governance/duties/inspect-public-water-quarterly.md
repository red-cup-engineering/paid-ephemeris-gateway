---
title: "Inspect public water quarterly"
type: jural-relation
kind: duty
active-holder: public-works-director
passive-party: farston-residents
scope-action: water-quality-inspection
triggering-powers:
  - inspect-public-water
required-action: file-quarterly-water-quality-report
enforcement: charter-violation
rule-type: N→N
cadence: per-calendar-quarter
charter-section: "Article III §4"
---


Per Charter Article III §4, the public-works director shall inspect every public hydrant and water-quality sampling point at least once per calendar quarter and file the results to the public registry.

## Trigger

The duty fires at the start of each calendar quarter (Jan 1, Apr 1, Jul 1, Oct 1).

## Required action

Inspect every public sampling point; file the inspection record per the conducting-water-quality-inspection skill; file the quarterly summary to the records clerk.

## Enforcement

A quarter ending without a filed report produces a charter-binding-violation cell on `(public-works-director, charter-bound-c1, ...)
` per Charter Article I C1.
The eligibility-by-charter-binding rule then disqualifies the office from receiving new dispatch until the duty is discharged.
