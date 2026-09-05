---
title: Mystery Adventure
description: "A point-and-click detective game concept in the Colonel's Bequest / Laura Bow lineage, built on real-time suspect schedules and append-only evidence rather than a fixed dialogue tree."
date: 2026-08-19
keywords: ["gaming", "mystery", "adventure", "point-and-click"]
---


Point-and-click adventures are not a genre the house has anything in yet. The specific shape worth building is not generic point-and-click but the Colonel's Bequest / Laura Bow lineage: a detective-protagonist whodunit built on real-time NPC schedules, where suspects go about their business on a clock and the player has to be in the right place to catch them at it, rather than a game built from a fixed dialogue tree.

## Why the shape fits

A mystery's clue graph is a state machine with a replayable solution path — the kind of structure that logs and reseeds naturally, unlike most arcade genres. Farstone's existing storylet system already demonstrates the mechanism a mystery's evidence needs: a quality settling to a value nobody scripted, where the branch falls out of a join rather than being hand-coded. Evidence that is simultaneously alibi-confirmed and alibi-contradicted isn't a special case requiring its own logic — it's the same contested state Farstone already treats as a first-class, legal value rather than an error.

Farstone's quality taxonomy — append-only trained stats, decaying needs, derived-not-stored values, contested/both-true-and-false values, relational values, world-clock-derived values — maps onto a mystery's own state almost without translation. A suspect's alibi is world-clock-derived. Suspect relationships are relational values of the kind Farstone's world data already commits to. And evidence that both supports and contradicts a suspect is a contested value, not an error state to code around.

## Proposed chassis

Built on the feltos substrate (an assertions-trace plus four-valued logical fold):

1. Suspects carry schedules as world-clock-derived cells — where a suspect is and what they're doing is a pure function of the case's world-clock, not a hand-scripted cutscene per hour.
2. Evidence is append-only witnessed fact, gathered the same way other fizzos-based games append predicate and deny evidence.
3. An accusation is a settle-check against the fold rather than a multiple-choice pick: evidence either settles cleanly to true against one suspect, or the case is legitimately contradictory or insufficient — and the game can honestly say "you don't have it yet" as a state distinct from "wrong suspect."
4. Cases are daily-seeded, reusing one engine across many finite, bounded mysteries rather than building toward a single large one.

## Open risks

Prose at this volume is unproven anywhere in the house's existing work. A good mystery needs real red herrings, suspect dialogue, and alibi text at genuine volume and quality; existing prose in the corpus is good at small scale (roughly thirty rooms, single-pass) but not proven at a mystery's branching, quality-gated scale.

A fair mystery engine is also not automatically a good one. Misdirection, character, and pacing are authorial craft that the state machine doesn't supply by existing — the design and writing work is the actual bottleneck, not the engineering.

## Smallest useful step

A three-suspect, single-location micro-case: author suspect schedules and a handful of evidence facts, build the accusation-settle mechanic, and confirm that "insufficient evidence" is honestly distinguishable from "wrong suspect" — before any prose, red herrings, or real story are written.
