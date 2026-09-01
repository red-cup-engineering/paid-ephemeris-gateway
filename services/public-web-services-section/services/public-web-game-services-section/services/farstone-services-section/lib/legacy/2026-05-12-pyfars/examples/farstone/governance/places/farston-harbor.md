---
type: place
kind: natural-feature
title: "Farston Harbor"
contained-in: farstone-island
biome-zone: coastal-lowland
status: active
---


The south-coast embayment fronting the town — protected by a granite breakwater, deep enough at most tides for the mainland ferry, fishing boats, and recreational moorings.
The Farr River meets the harbor at its western edge; the ferry terminal sits at its eastern end.

Tide cells the harbor carries (populated each tick by the [`tide-derivation`](../../objects/) closure rule, forthcoming):

- `(farston-harbor, tide-state, rising|falling) = T`
- `(farston-harbor, tide-height-m, x) = T`
- `(farston-harbor, next-high-tide-at, t) = T`
- `(farston-harbor, next-low-tide-at, t) = T`

The harbor's high-tide line is the chartered jurisdiction boundary of the town: above it, the city council and dept directors hold authority; below it, harbor and channel matters route through the harbormaster's office and (for matters above the city's reach) the mainland Coast Guard.

In severe-storm cells, the harbormaster issues a temporary closure witness; the ferry's morning sailing is then cancelled or rescheduled.
The closure is itself a substrate cell, replayable from the event log.
