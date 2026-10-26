---
title: Fyreside
description: "Stub note for Fyreside, a card-game seed reduced on disk to a single orphaned Python Card class with no game loop. Its status does not match the 'built legacy archive recovery candidate' bucket the other four legacy stubs share — recorded honestly, with the mismatch flagged."
date: 2026-08-19
keywords: ["gaming", "enterprises", "legacy", "fyreside", "card-game", "discrepancy"]
---

# Fyreside

**Status: dormant — a single orphaned source fragment, not a built game.** This note flags a
discrepancy up front rather than papering over it: the built-asset inventory
(`2026-08-19-note-on-built-asset-and-planned-game-inventory.md`) groups fyreside with durante, the
render substrate, wheatstone, and okaga under one status label ("built in legacy archive — recovery
candidate"). What's actually on disk does not support that label, and this note states what's true
instead, per the house standard of verifying every status claim on disk rather than repeating a
suggested label the evidence doesn't support.

## What's actually there

The active `fyreside-services-section` directory
(`public-services-section/.../public-computer-games-services-section/services/fyreside-services-section/lib/legacy/cards.py`)
holds exactly one file: a single Python `Card` base class. No game loop, no `package.json`, no
tests, no README anywhere in the section. This is not comparable to the other four legacy stubs in
this section, each of which is a complete (if now-broken or proof-stripped) application with a
package.json, a `src/` tree, and at least a claimed test suite — durante and okaga are archived
*games*; wheatstone and the render substrate are archived, proof-file-backed *engines*. Fyreside is
one class.

It also lives in a different place than the other four: durante/render-substrate/wheatstone/okaga
all sit in the read-only `_archive/from-content-source/` tree; fyreside's fragment sits directly in
the *active* tree's own `lib/legacy/`, one directory below a section that has otherwise never held
a working build.

## Concept (as far as the fragment states one)

A card-game seed — the `Card` class's shape (whatever fields/methods it defines) is the only
evidence of design intent that exists; no rules, no game loop, no variant is specified anywhere in
the surveyed corpus or on disk.

## Recovery against the active tree

There is no working build to "recover" in the sense the other four stubs use that word — recovery
here means authoring a game from a single reusable class, not reconstructing tests around
surviving application logic. The honest first step, if this seed is picked up: read `cards.py` in
full, decide what game (if any) its `Card` shape was heading toward, and treat everything past that
class as a fresh design task rather than a restoration.

## Sources

`2026-08-19-note-on-built-asset-and-planned-game-inventory.md` §7 (fyreside-services-section row:
"dormant (source fragment only)"); a direct disk check of the section's contents.

## Staircase tier

Not applicable in the recovery sense the other four legacy stubs use — this is closer to the
planned-game "no code exists" bucket than to a genuine recovery candidate, except that one file
of prior intent does exist. Not scheduled on any tier in the assigned corpus.
