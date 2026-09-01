---
name: "Filing quarterly report"
description: "Public-works-director action that compiles the quarterly water-quality and infrastructure report and files it to the public registry. Charter Article III §4 obligation, due by the 15th of the month following each calendar quarter."
---


## Requirements

- All quarterly water-quality inspections complete (one per public sampling point)
- Infrastructure-maintenance log for the quarter
- Public-works-director authority

## Steps

1. Aggregate the quarter's inspection records and maintenance log.
2. Write the report to `operations/quarterly-reports/<YYYY>-Q<N>.md` with status, anomalies, and corrective actions.
3. File to the public registry through the records-clerk channel.
4. Emit a `quarterly-report-filed` witness.

## Outcomes

The quarterly report is in the public registry; charter §4 duty for the quarter is satisfied; if any inspections weren't complete by the deadline, an anomaly cell surfaces.
