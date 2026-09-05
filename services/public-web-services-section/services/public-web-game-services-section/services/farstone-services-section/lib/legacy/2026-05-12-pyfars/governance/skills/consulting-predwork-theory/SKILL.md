---
name: "Consulting PredWork theory"
description: "Walks the predication-categories → predicated-computing → AOP → FARS theory chain to find how a concept is theorized, producing an improved record schema grounded in that theory. Use before encoding any governance or work record."
---


## Requirements

- `pyfars context` available
- The name of the concept you are about to encode (e.g., "milestone", "duty", "office")

## Steps

1. Find the concept in the theory stack — start at AOP for operational concepts, predication-categories for mathematical ones.
  Use `pyfars context <slug>`.
2. Read the frontmatter fields and relations the theory assigns to the concept.
3. Compare the theory schema against your draft record schema and note the differences.
4. Update the draft schema to match the theory before writing the record.

## Outcomes

A revised draft schema for the record about to be written, with field names and relation types drawn from the theory rather than guessed.
