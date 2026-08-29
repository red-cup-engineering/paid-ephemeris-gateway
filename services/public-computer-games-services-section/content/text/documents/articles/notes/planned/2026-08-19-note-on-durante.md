---
title: Durante
description: "Stub note for Durante, a first-playable Quake-like FPS built on the abrash raycaster engine — built in the legacy archive, a recovery candidate, not an unbuilt concept. The owner's correction honored directly: shooters are not unbuilt."
date: 2026-08-19
keywords: ["gaming", "enterprises", "legacy", "recovery-candidate", "durante", "shooter", "abrash"]
---

# Durante

**Status: built in legacy archive — recovery candidate.** This is the owner's correction, honored
directly: **shooters are not unbuilt.** Durante is a real, first-playable Quake-like FPS that was
built and (per its own README) tested — "walk a level, strafe, shoot a demon" — not an absent
concept waiting for a first design pass.

## What was actually built

A software-rendered first-person shooter on top of `@561-group/abrash` (the raycaster engine — see
`render-substrate-service`'s note). Its README claims 62 assertions across 4 proof files (arena,
demon, combat, game). It is genuinely first-playable, not a tech demo: a level to walk, strafing
movement, a demon to fight.

## Where it actually lives (pointers, not copies)

1. **The read-only archive copy** —
   `561-group/lib/legacy/2026-08-17-vps-561-group/_archive/from-content-source/apps/games/durante`.
   62 assertions / 4 proofs claimed by its README; **unverifiable as claimed** — `tests/` in this
   copy holds only `_harness.mjs`, the 4 named proof files (`arena`, `demon`, `combat`, `game`) are
   absent.
2. **Two further broken snapshot copies**, already sitting in the *active* tree at
   `public-services-section/.../public-computer-games-services-section/services/durante-services-section/lib/legacy/{2026-06-17-durante,2026-08-17-windows-561-group-apps-games-durante}`.
   Both copies' `package.json` test scripts point at `tests/arena.test.mjs`,
   `combat.test.mjs`, `demon.test.mjs`, `game.test.mjs` — but both copies' `tests/` directories
   contain only `_harness.mjs`. `npm test` was run on both (not protected — these are
   duplicate legacy copies inside an already-public services tree, not the read-only archive) and
   both fail immediately with `MODULE_NOT_FOUND`. The active `durante-services-section` directory
   itself has **no live top-level app** — only these two broken copies.

## Recovery against the active tree

**Durante rides abrash, which rides daleske.** Recovering a playable Durante means, in order:
1. Recover `render-substrate-service`'s stack first — specifically daleske (the pixel/raster
   terminal framework Durante's engine renders through) and abrash (the raycaster game engine
   Durante is built on). Neither game logic nor the render layer can come back independently.
2. Reconstruct or re-author the 4 missing proof files (`arena`, `demon`, `combat`, `game`) — none
   of the three copies on disk (the archive original or either active-tree snapshot) has them, so
   "recovery" here means re-deriving test coverage from the surviving `src/`, not restoring an
   existing proof set.
3. Only then would a `npm test` run against a real, checkable Durante be possible — as of this
   note, no copy of Durante anywhere in the tree has a working test suite.

## Sources

`2026-08-19-note-on-built-asset-and-planned-game-inventory.md` §7 and §8 (games/durante); a direct
disk verification (`npm test` run on both active-tree copies, both failing `MODULE_NOT_FOUND`;
proof-file presence checked in the archive copy, absent).

## Staircase tier

Not on the planned-game staircase — this is a recovery item, not a design-stage item. The
work required is engineering recovery (rebuild the render stack, re-derive tests), not design
judgment.
