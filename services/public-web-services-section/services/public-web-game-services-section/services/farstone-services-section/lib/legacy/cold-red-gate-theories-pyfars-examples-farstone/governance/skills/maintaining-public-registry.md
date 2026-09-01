---
name: "Maintaining public registry"
description: "Records-clerk-bot action that keeps the public registry up to date — receiving filings, indexing them, and responding to access requests. Use as the standing day-to-day operation."
---


## Requirements

- Records-clerk authority
- Read access to all public-by-default substrate records

## Steps

1. Watch the substrate for new public-records (charter-defined record kinds: ordinances, permits, inspection reports, council minutes, budget records).
2. Index each new record by title, date, and kind.
3. Respond to citizen access requests by serving the indexed record (or a certified copy on request).
4. Periodically reconcile the index against the substrate to catch missed filings.

## Outcomes

The public registry index is current; access requests are served from the index; missed filings surface as anomalies.
