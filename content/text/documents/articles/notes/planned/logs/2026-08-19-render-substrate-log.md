---
title: Render Substrate — Log
description: "Legacy-archive recovery status, proof-file inventory, and recovery order for the render-substrate stack (arnold, daleske, tsander, abrash)."
date: 2026-08-19
keywords: ["log"]
---

# Render Substrate — Log

## Status

Built in the legacy archive; a recovery candidate, not part of the active tree.

## Proof-file inventory

| Layer | Claimed tests | Proof files present on disk? |
|---|---|---|
| arnold | 122 assertions / 6 proofs | yes — 6 `prove-*.mjs` present |
| daleske | 79 assertions / 5 proofs | yes — 5 `prove-*.mjs` present |
| tsander | references math/world/wireframe/horsetail/engine proofs, no explicit total found | no — `tests/` holds only `_harness.mjs`; 5 proof files absent |
| abrash | 81 assertions / 5 proofs | no — `tests/` holds only `_harness.mjs`; 5 proof files absent |

arnold and daleske are the two layers with intact proof files; tsander and abrash have had their proof files stripped to a bare harness, so their assertion counts are currently unverifiable from what's on disk, not merely unverified.

## Where it lives

All four: read-only archive at `561-group/lib/legacy/2026-08-17-vps-561-group/_archive/from-content-source/apps/tools/{arnold,daleske,tsander,abrash}`. No active-tree copy of any of the four exists anywhere else in the estate.

## Recovery order

1. **arnold first** — intact proof files (6 `prove-*.mjs`), and nothing else in the stack builds without it. Recovering arnold alone would already be independently useful, since it underlies daleske and tsander both.
2. **daleske next**, using its own 5 intact proof files — unblocks abrash.
3. **tsander and abrash last**, and hardest — both need their 5 missing proof files each re-derived from surviving `src/`, since neither has a checkable test suite as archived. Abrash is the direct dependency for durante; tsander is the direct dependency for Okaga.

## Sources

`2026-08-19-note-on-built-asset-and-planned-game-inventory.md` §8, tools/ table; direct disk verification of proof-file presence per layer.
