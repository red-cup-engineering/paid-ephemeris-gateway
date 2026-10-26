---
title: Farstone Service Note
description: "Status stub for Farstone: built as a legacy MUD (read-only archive), QBN redesign specified, no active code under this section yet."
date: 2026-08-19
keywords: ["gaming", "farstone", "mud", "qbn", "stub"]
---

# Farstone Service Note

**Status: built as legacy MUD (read-only archive); QBN redesign specified, no active code yet.**

## Concept

Farstone names two real artifacts sharing a common ancestor, not one town in two formats. **The
pyfars polity** is an in-fiction municipality — Mayor Aliyah Reyes, Harbormaster Takeshi Aoki, city
hall, a permit backlog aging past its 30-day charter window — authored as markdown-plus-frontmatter
governance records that a Python engine (pyfars) dispatches work against. **`@561-group/farstone`**
is a *built*, playable MUD — JavaScript game content riding the `tab` EAVT world-engine and the
FizzOS MUD driver, servable over HTTP/SSE and playable in a browser today — whose seed-island world
carries the same Takeshi Aoki (verbatim-matching biography) and the same eleven place-slugs as the
pyfars polity, and whose headline mechanic is that Building Permit #23 ages under its own clock past
its decision window and settles to a bilattice ⊤ (held contradiction) with no scripted "permits go
bad" rule — the fold produces it. That mechanic is already storylet-shaped: a quality settling to a
value nobody scripted, surfaced as content. A QBN redesign would keep both artifacts as content wells
(pyfars for governance-record texture and the permit/office/duty convention; the legacy MUD for room
prose, NPC bios, and the needs/mood loop) while building new game logic against the *current*,
actively-tested FizzOS package rather than the retired tab-riding lineage the legacy MUD actually
depends on.

## Pointers

- Design note (verdict, core loop, content pipeline, qualities, prose-at-volume risk, staircase
  placement, cast, load-bearing disclosure):
  `services/public-services-section/services/public-computer-services-section/services/public-computer-games-services-section/content/text/documents/articles/notes/2026-08-19-note-on-farstone-qbn-design.md`
- Legacy MUD (built, playable, read-only reference — do not treat as the target runtime):
  `lib/legacy/2026-08-17-vps-561-group/_archive/from-content-source/apps/games/farstone/`
  (four content packs: `farstone/` seed island, `farstone-harbor/` the served ~30-room world,
  `farstone-tale/` designed DSL world, `farstone-wild/` generated world; depends on the retired
  `@561-group/tab` + old `@561-group/fizzos` lineage, per its own README)
- pyfars governance polity (records, not runtime — the fiction-vs-deployment discriminator applies):
  `lib/legacy/2026-08-17-vps-561-group/_archive/code/pyfars/examples/farstone/`
- Active FizzOS engine (the real target for any new build; 60/60 tests, one dependency —
  `@lenticule-science/metrologic`, no `tab` import):
  `services/computer-services-section/services/computer-systems-services-section/services/computer-mud-services-section/apps/fizzos/`

## Smallest first step

Re-author Permit #23's ages-into-⊤ arc — the one piece of content proven twice, by two different
authoring passes, in two different engines — as three or four cells against the *active* fizzos's
`predication.mjs` / `world-clock.mjs` (a `within-window` predicate, its declared converse, one
tick-boundary rule), render it through a bare page reading the assertions trace, and confirm it
settles to a visibly-contradictory state on its own after N ticks with zero hand-written "if
overdue" branch. That proves the thesis in the smallest possible unit, on the engine that is
actually alive today.
