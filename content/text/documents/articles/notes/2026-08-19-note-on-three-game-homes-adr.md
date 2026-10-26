---
title: Three Game Homes ADR
description: "One-page decision draft for the owner: games now live under three unrelated section trees (public-web-game-services-section, public-computer-games-services-section, web-services-section/gaming-services-section). What each holds, the honest options, a recommendation, and migration cost per option. Not a migration — a decision request."
date: 2026-08-19
keywords: ["gaming", "filing", "adr"]
tags: ["proposed"]
---

# Three Game Homes ADR

**Status: decision requested, not executed.** This document moves nothing. It surveys what
exists and lays out options for the owner to pick from.

## What each home currently holds

1. **`public-web-game-services-section`** (under `public-web-services-section`) — the browser
   game fleet: `flickering-delve-service`, `onestone-service`, `lantern-service`,
   `solitaire-service`, `crucible-service`, `stoke-service`, and `gambling-trainer-service`. All
   seven follow the same house doctrine (deterministic engines, `.mts` domain modules,
   native-http servers).
2. **`public-computer-games-services-section`** — the destination of the filing correction in
   `studio-filing-reflection.md`: published games/storefront/vision notes that don't fit the
   "browser game" framing directly, plus the storefront itself. Currently holds `durante`,
   `okaga`, `fyreside`, `ruinfold-services-section`, `sites/play.561.group`, and
   `sites/cloudflare-router`. This is also where the fleet's own cross-fleet notes
   (`2026-08-19-note-on-house-specification-standard.md`, the fleet audit, this document) live.
3. **`web-services-section/gaming-services-section`** — `aletheon-services-section`,
   `farstone-services-section`, `qwzspace-services-section`. Older, independently-established
   projects (Dockerfiles, their own `deploy/`, `sites/farstone.emsenn.net`); `qwzspace`'s real
   (non-legacy) source lives here, one level below where its own consumers (ruinfold, the
   render migration ADR) look for it.

A fourth, related-but-distinct location, named for completeness though it is not one of the three
"game homes" (it holds *systems*, not *games*, per `studio-filing-reflection.md`'s own taxonomy):
**`computer-game-system-services-section`** — `cartridge`, `energy-bank`, `parlor-kernel`,
`vault-compiler`'s sibling location, plus `arnold`, `wheatstone`, `replay-spectacle`, `abrash`,
`daleske`, `tsander`, `interactive-fiction-services-section`. This is filed correctly under the
principle already stated in `studio-filing-reflection.md` and is not in question here.

## Why this is a real problem, not just an untidy tree

`studio-filing-reflection.md`'s own governing rule — "the tree is the proof... a stranger can walk
from any published game down through its contracts to the atomic scripts it composed" — fails
today for a stranger who starts at `qwzspace-services-section` and has no reason to expect
`aletheon`/`farstone` sitting next to it, or who starts at `public-web-game-services-section` and
has no reason to expect `durante`/`ruinfold` living in a same-tier, differently-named section one
level up the tree. Three good-faith filings, no single wrong one, still add up to a fleet a
newcomer cannot discover by walking.

## Options

**A — Consolidate everything into `public-computer-games-services-section`.** One home for every
published game, web or not. Cleanest read of `studio-filing-reflection.md`'s own stated intent
("Published playable games... live in the public games section"). Cost: moving seven live,
actively-tested service trees (`public-web-game-services-section`'s own fleet) plus three more
(`aletheon`/`farstone`/`qwzspace`), each needing every consumer's import/registry path checked —
real, non-trivial mechanical work, and `aletheon`/`farstone` in particular have their own
deploy/Dockerfile assumptions that would need re-verifying post-move, not just re-pathing.

**B — Declare a web/computer split rule and leave two homes, reconciling the third.** Keep
`public-web-game-services-section` for browser-rendered games (matches its name honestly) and
`public-computer-games-services-section` for everything else (storefront, non-web/daily-server
games, vision notes) — a real, nameable distinction, not an arbitrary one. `aletheon`/`farstone`
are browser-facing (both have `sites/`) so would move to the web section under this rule;
`qwzspace` (a systems package, not a game) would move to `computer-game-system-services-section`
alongside `cartridge`/`energy-bank`, resolving the "why is a system next to two games" oddity
directly. Cost: smaller than A — only three trees move (`aletheon`, `farstone`, `qwzspace`), and
`qwzspace`'s move is a *correction*, not a lateral shuffle, since it's a system, not a game.

**C — Leave all three as-is; write and maintain a README map.** Zero migration cost today. A
single `content/.../notes/game-fleet-locations.md` (or a top-level README in each of the three
sections) states plainly "games also live at X and Y" and is the one place a stranger checks
first. Real risk, already demonstrated once: hand-maintained cross-references drift (the same
failure mode that produced `catalog.json`'s repeatedly-hand-patched `LIVE_SUBDOMAINS` gates) —
a map is only as good as its last edit, and nothing enforces it stays current the way a real
directory structure does.

## Recommendation

**B.** It costs less than A while fixing the one genuinely wrong placement today (`qwzspace` filed
as a game rather than a system, discovered by this very ADR), it gives the fleet a real,
statable rule ("web-rendered → `public-web-game-services-section`; not → `public-computer-games-services-section`")
instead of one undifferentiated bucket, and it doesn't ask for C's ongoing-maintenance bet against
a house that has already shown it drifts hand-maintained cross-references within a single day.
A is the more thorough long-run answer if the owner wants one true home regardless of surface —
worth choosing instead of B if the web/computer distinction itself is judged not worth preserving
as a first-class filing rule.

## What this document does not do

It does not move a single file. It does not touch `aletheon`, `farstone`, `qwzspace`, or any of
the seven web-game trees. Execution, if any option is chosen, is separate work, gated on the
owner's decision and on every affected tree being settled (none of `aletheon`/`farstone` was
checked for live/mid-build status here, since no move is being made).
