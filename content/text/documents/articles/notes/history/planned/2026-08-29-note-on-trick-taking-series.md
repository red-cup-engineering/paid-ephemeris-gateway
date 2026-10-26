---
title: Trick-Taking Series
description: "Stub note for the deferred trick-taking card engine (Hearts and/or Cribbage) for the Card Table shelf — considered alongside the solitaire-variant pack as a cheap win, then explicitly deferred as a bigger lift for later. Status: planned — no code exists."
date: 2026-08-29
keywords: ["gaming", "cards", "planned", "trick-taking", "hearts", "cribbage", "card-table", "casino", "stub"]
---

# Trick-Taking Series (Hearts / Cribbage)

**Status: planned — no code exists.**

Recovered 2026-08-29 from the founding session transcript (session 47cac153, 2026-08-19).

## Concept

In the same cheap-wins pass that picked the solitaire-variant pack (Pyramid, TriPeaks, Golf,
Yukon, Forty Thieves — cheap because the existing solitaire engine is already data-driven, so new
variants are config, not code), a trick-taking engine for something like **Hearts or Cribbage**
was considered and explicitly set aside: "a bigger lift to tackle later." Trick-taking needs a new
rules engine — trick order, trump/no-trump resolution, hand scoring — where solitaire's variants
are just new `VariantSpec`s on an engine that already exists.

## Tier

**Later** — behind the solitaire-variant pack and the shelf's already-running larger projects.

## Why revisit it

`2026-08-29-note-on-social-casino-direction.md` commits the Card Table shelf to a real, monetized,
spectacle-first social casino at casino.561.group, on the tickets/chips economy over
`@red-cup-engineering/energy-bank`. Trick-taking and Cribbage tables are natural casino-floor
candidates under that direction — familiar formats with real stakes-adjacent play, no additional
design justification needed beyond what the casino direction already establishes. This note does
not move the tier; it records that the deferred engine is worth reconsidering sooner than "later"
once casino build-out reaches the table-games layer.

## Sources

- Founding session transcript (session 47cac153, 2026-08-19) — the cheap-wins reasoning pass that
  named and deferred this.
- `2026-08-29-note-on-social-casino-direction.md` — the monetization direction that makes this
  relevant again.
- `2026-08-19-note-on-games-census.md` — the existing solitaire and Parlor entries this would sit
  beside on the Card Table shelf.
