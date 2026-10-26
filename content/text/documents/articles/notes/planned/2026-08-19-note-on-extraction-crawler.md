---
title: Extraction Crawler
description: "Stub note for the Anvil-of-Dawn-lineage browser extraction crawler — blockstep grid movement, tempo-controlled combat, no-XP skill-by-use, ported (not literally revived) from the house-owned abrash/durante substrate. Status: planned-design-note-exists — full chassis design written, zero code."
date: 2026-08-19
keywords: ["gaming", "enterprises", "planned", "anvil-of-dawn", "crawler", "extraction", "abrash", "durante", "stub"]
---

# Extraction Crawler

**Status: planned-design-note-exists.** A compact chassis design exists
(`2026-08-19-note-on-revivals-anvil-obsidian-mystery.md` §1, in this same `notes/` directory). No game code
exists for this game specifically; it draws on but does not reuse the runtime of two related,
already-built legacy modules (see below).

## Concept

A browser first-person grid dungeon crawler in the Anvil of Dawn / Dungeon Master movement
register: discrete cells, 90-degree turns, no free-look ("blockstep" navigation, not
continuous 3D movement). Stakes are extraction, not clearance — descend, grab what you can
carry, exit alive with the haul or lose the run. Reads the owner's "almost DOOM but...
excursion shooters" (`2026-08-19-note-on-sierra-lucasarts-lineage.md` §3, likely "extraction" shooters) as
extraction, matching the research digest's own framing.

## Why the house can do it — and the honest revival judgment

Two real, tested legacy modules exist, read directly:

- `@561-group/abrash` — a software raycaster (grid-DDA) over a federated voxel world, four-
  valued solidity readout (t/f/⊥/⊤, with ⊤ rendered as a designed "shivering" contested-wall
  effect, not a bug), pure and deterministic per its own README (81 assertions / 5 proofs
  claimed). See `2026-08-19-note-on-render-substrate.md` for this module's own status and
  recovery notes.
- `@561-group/durante` — a first-playable Quake-like built on abrash (62 assertions / 4 proofs
  claimed). See `2026-08-19-note-on-durante.md` for this module's own status as a **recovery
  candidate**, distinct from this game.

**Neither module targets a browser** — both render into `@561-group/daleske`, a terminal
kitty/sixel pixel framework. The design note's explicit, honest verdict: a literal revival
(running the terminal renderer, shipping it as `<game>.561.group`) does not serve a
browser-first product. What is worth reviving is the *design discipline* — the pure
vec2/rotation kernel, the DDA raycaster with zero hidden nondeterminism, the four-valued
world-as-fold model, and the proven fact that a contested wall as a designed mechanic already
plays today. The recommended path is a **fresh Canvas 2D raycaster that ports abrash's math
and four-valued readout discipline verbatim**, not a runtime resurrection.

## Core loop

Single-hero, tempo-controlled combat (attacking fast speeds up the enemy's attack rate;
attacking slow slows it — Anvil of Dawn's own most distinctive and most critically-praised
mechanic), no XP — skill-by-use instead, the same pattern Farstone already uses. Contested
(⊤) walls are a real in-fiction hazard, not a bug.

## Staircase tier

**Next**, alongside the energy-tiling hinterlands — pairs with ruinfold's Deep-shelf daily
ritual once the extraction-loss stakes have somewhere real to settle (the Energy Bank, itself
still a Fable proposal, not built).

## Honest risks (named in the design note, not softened here)

1. Blockstep movement is a genuine period taste — may read as deliberately retro rather than
   fresh, a framing risk more than a technical one.
2. "Lose the run's haul" needs a real stakes economy to mean anything, and the Energy Bank
   that would carry that stake is a proposal only, not built.
3. Anvil's tempo-controlled combat is the hardest single mechanic to get right — a feel/balance
   problem, not a determinism problem; the source material's own critical praise singles out
   exactly this system as the hard part to nail.

## Sources

`2026-08-19-note-on-sierra-lucasarts-lineage.md` §3 (owner statement, verbatim); `2026-08-19-note-on-revivals-anvil-obsidian-mystery.md` §1 (the full chassis design, same directory); `2026-08-19-note-on-render-substrate.md` and
`2026-08-19-note-on-durante.md` (the related legacy-recovery stubs this design explicitly does not
reuse as runtime); `2026-08-19-note-on-if-the-studios-survived.md` (notes this game as a craft-value chassis
rather than a studio-values counterfactual, on purpose).

## Smallest first step

Port the abrash one-room proving-ground demo to Canvas 2D and prove bit-identical replay —
before any dungeon content, combat tuning, or extraction-stakes economy is authored.
