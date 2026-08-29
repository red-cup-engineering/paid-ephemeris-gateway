---
title: Kind-Incremental Idle
description: "Stub note for the kind-incremental idle game — a planned idle/incremental game with no dark patterns, whose prestige multiplier is proposed to be priced as a real Perron-Frobenius eigenvalue of the player's own production graph. Status: planned — no code exists."
date: 2026-08-19
keywords: ["gaming", "enterprises", "planned", "idle-incremental", "spectral", "vision", "stub"]
---

# Kind-Incremental Idle

**Status: planned — no code exists.** No prototype anywhere in the tree. The one concrete thing
that has happened is a feasibility check: `@lenticule-science/metrologic` already exports a `./spectral`
subpath, confirmed present, which is what the wild extension below would need.

## Concept

An idle/incremental game built on the "kind incremental" instinct — honest numbers, no dark
patterns, the same house ledger discipline every other 561-group game holds to (no energy/lives
gate that fully blocks free play, no rewarded ads, transparent odds). `2026-08-19-note-on-wilder-conceptions-01.md`
item 5 proposes a wild, non-authored extension on top of that baseline: price the prestige
multiplier as the literal Perron–Frobenius dominant eigenvalue of the player's own production
graph, rather than as a hand-tuned curve — a real spectral-graph-theory computation standing in
for what every other idle game fakes with a formula.

## Sources

- `2026-08-19-note-on-gaming-enterprises-vision.md` §3 — names the idle+gambling series generally, placed at Next
  tier.
- `2026-08-19-note-on-wilder-conceptions-01.md` item 5 (whole item, plus the ringleader's adoption of the
  eigenvalue mechanic as "phase 1 of the kind-incremental lane when it launches").

## Staircase tier

**Next** (research spike on the spectral-eigenvalue mechanic) / **Later** (a shipped idle game
built on top of it). The ringleader's response confirms only that the `@lenticule-science/metrologic`
dependency check passed — not that any prestige-pricing code, or any idle-game code at all, has
been written.

## Smallest first step

A research spike: take a toy production graph (even a hand-authored 4–5-node example) and compute
its Perron–Frobenius dominant eigenvalue using the existing `@lenticule-science/metrologic` `./spectral`
subpath, with real printed output — the same "worked example, real command, real output" discipline
`equivo-design.md` §5 already models for a different game. That spike would be the first evidence
this mechanic is buildable, distinct from the dependency-exists check already done.
