---
title: Energy Tiling
description: "Stub note for the energy-tiling shared-board game ('r/place but bejeweled,' the windy hinterlands) — a planned single shared-world tile board where transforming a tile costs energy scaled by move complexity and skill. Status: planned — no code exists."
date: 2026-08-19
keywords: ["gaming", "enterprises", "planned", "energy-tiling", "windy-hinterlands", "shared-board", "vision", "stub"]
---

# Energy Tiling ("r/place but bejeweled," the windy hinterlands)

**Status: planned — no code exists.** No service, no board implementation. Crucible
(`public-computer-games-services-section/services/crucible-service`, in-build) is the piloted
solo-scale precursor to this game's cost mechanic — it is a real, separate, in-build service, not
this game under a different name.

## Concept

One shared board — not per-player instances — where tiling or transforming a cell costs energy
scaled by move complexity and the player's own skill. New players start in the "windy
hinterlands," the periphery of the one shared world, and the game is social from the start:
players can pool and sell energy to each other. The aesthetic is pitched as "weird Flatlander meets
weird Zachtronics." The open design question, stated explicitly in the source note rather than
glossed over: how does energy accrue at all — the note does not yet answer this.

## Sources

- `2026-08-19-note-on-gaming-enterprises-vision.md` §2 (whole section).
- `2026-08-19-fleet-spec-coverage-log.md` — roadmap "Later" tier.
- Crucible's own design documents (`crucible-service/DESIGN.md`), which pilot this game's cost
  mechanic at solo scale using the real `@lenticule-science/metrologic` obstruction/cohomology engine — read
  those for the actual, currently-running version of the underlying cost math.

## Staircase tier

**Later**, piloted at Next-tier scale via Crucible. The shared-board version itself is not
scheduled; Crucible's solo-scale build is the concrete, in-build proxy for validating the cost
mechanic before any shared board is attempted.

## Smallest first step

Answer the open design question the vision note itself leaves unresolved — how energy accrues on
a shared board with no single player's session to gate it — before any code is written. That
answer is a design decision, not an engineering task, and per house roadmap discipline a step this
document cannot make falsifiable belongs here as a named blocker, not as invented scope.
