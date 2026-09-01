---
type: workitem
subtype: process
title: "Q3 quarterly water inspection (all public sampling points)"
status: pending
priority: high
recurring: true
cadence: per-calendar-quarter
duty: inspect-public-water-quarterly
requires-capabilities:
  - water-quality-inspection
requires-skills:
  - conducting-water-quality-inspection
  - filing-quarterly-report
touches:
  - examples/farston/operations/water-quality-reports/
target-completion: "2026-09-30"
acceptance:
  - every-public-sampling-point-inspected
  - quarterly-summary-filed
  - duty-discharged-cell-fired
---

# Q3 quarterly water inspection

Charter Article III §4 requires public works to inspect every public hydrant and water-quality sampling point at least once per calendar quarter.
Q3 covers July-September 2026.

## Process

This is a process workitem: a routine recurring activity rather than a one-shot procedure.
The director coordinates inspectors to cover all sampling points within the quarter.

1. Iterate over public sampling points (87 hydrants + 12 distribution taps + the treatment plant taps).
2. For each: invoke conducting-water-quality-inspection skill.
3. After all are complete: invoke filing-quarterly-report skill to compile the summary.
4. File the Q3 summary to the records clerk.

## Charter binding

Failure to complete by 2026-09-30 fires `(public-works-director, charter-binding-violated, true) = T` per duty `inspect-public-water-quarterly`.
The eligibility-by-charter-binding rule disqualifies the office from new dispatch until the duty is discharged.

## Acceptance

- [ ] Every public sampling point has at least one Q3 inspection record.
- [ ] Quarterly summary filed to records clerk.
- [ ] `(inspect-public-water-quarterly, discharged-q3-2026, true) = T` cell fires.
