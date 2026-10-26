---
title: Obsidian Lineage
description: "A slow, first-person puzzle game about artificial intelligence, structured like Obsidian (1996), where the house's own obstruction/settling math and four-valued logic are the puzzle content directly rather than a reskin."
date: 2026-08-19
keywords: ["gaming", "obsidian", "myst-like", "puzzle"]
---

# Obsidian Lineage

A slow, surreal, first-person puzzle game about artificial intelligence, structured like Obsidian (1996, Rocket Science Games): distinct dream-worlds — two human dreamers, and a now-sentient orbital AI attempting to model its own cognition — that the player walks through, solving puzzles built out of standing house theory: obstruction/settling and four-valued (Belnap) logic, presented as dream-machine puzzle content rather than translated into a fictional idiom first.

Obsidian's actual theme is not book-lore like Myst — it's dreams and the subconscious, worlds that are externalized attempts by an AI to understand its own nature. That isn't a loose analogy to the house's subject matter; it's the same subject matter, which is why this is the one game in the concept where the math is the fiction rather than dressed up as it.

## Why the house can do it

Two real pieces of substrate already exist, not invented for this game:

- The obstruction engine already load-bearing in Crucible: it assigns a canonical complexity number (rank, settling depth, regime) to a transformation. A puzzle whose difficulty is its obstruction rank is the same computation Crucible already runs, aimed at a dream-scene instead of a wallet.
- The bilattice four-value readout (true/false/neither/both) is already proven playable, not just theorized — other house games render "both" as a designed, shivering, split-tinted mechanic and settle a contested state as an actual gameplay condition.

This should be built SVG-first rather than on a raycaster engine. Obsidian's real pacing — slow, static, painterly, one scene at a time — fits hand-built or generated SVG scenes, not a real-time raycaster.

## Core loop

The player walks a small set of dream-scenes (Obsidian's own three-world structure). Each scene is a settled or unsettled region of the house's own logic, rendered as a puzzle: an obstruction puzzle asks the player to find a lower-obstruction path to an equivalent outcome (the same skill Crucible already teaches); a "both" scene asks the player to recognize and hold a contradiction, or gather the witness that settles it; a "neither" scene is legitimately unscanned, and the puzzle is finding what evidence would resolve it at all. The ending maps onto a house-native choice: does the fold your play has built settle to consensus, or stay held open — both real, legal states, not a right/wrong binary dressed as philosophy.

## Open risks

The "zero translation" pitch risks reading as clever to the house and opaque to a player with no reason to know obstruction-rank math exists — a writer's-touch problem, not a solved one.

Obsidian itself is a real cautionary data point: critically loved, commercially dead, and its failure directly closed Rocket Science Games. The house's ad-revenue-share economics may sidestep 1996 packaged-goods economics, but that's a hopeful structural argument, not a demonstrated one — this genre has failed commercially once before at the highest quality bar achievable at the time.

## Smallest useful step

One dream-room: wire the real obstruction engine to compute one scene's actual complexity/regime number, render that scene's four-valued state as an SVG color/motif grammar (not placeholder UI), and make the only player action available be appending evidence rather than directly toggling a flag — before any dream-world content, art direction, or ending structure is built.
