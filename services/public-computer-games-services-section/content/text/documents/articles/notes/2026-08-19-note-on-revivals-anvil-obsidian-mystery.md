---
title: Revivals — Anvil, Obsidian, Mystery
description: "Three compact game designs from the Sierra/LucasArts catalog audit: an Anvil-of-Dawn-lineage browser extraction crawler, an Obsidian-lineage Myst-like where the house's own math is the puzzle content, and the owner-named point-and-click mystery gap, judged for house fit against real substrate."
date: 2026-08-19
keywords: ["gaming", "enterprises", "revivals", "anvil-of-dawn", "obsidian", "mystery", "adventure", "crawler", "myst-like"]
---

# Revivals: Anvil, Obsidian, Mystery

Three designs from `2026-08-19-note-on-sierra-lucasarts-lineage.md` §3 (owner: Anvil of Dawn, Obsidian) and §2
(owner: point-and-click mystery, "I loved those as a kid"). Each below carries concept, why the
house specifically can do it (real substrate cited, not asserted), core loop, the smallest real
step, staircase placement, and an honest risk. No story content is written for any of the three —
this is chassis design, not fiction.

## 1. Anvil-lineage extraction crawler

**Concept.** A browser first-person grid dungeon crawler in the Anvil of Dawn / Dungeon Master
movement register: discrete cells, 90-degree turns, no free-look — "blockstep" navigation, not
continuous 3D movement. Stakes are extraction, not clearance: descend, grab what you can carry,
exit alive with the haul or lose the run. This reads the owner's "almost DOOM but... excursion
shooters" (`2026-08-19-note-on-sierra-lucasarts-lineage.md` line 49) as **extraction**, matching the research
digest's framing: run in, get treasure, get out alive or lose it. Blockstep movement is also,
mechanically, the reason this is the genre where the house's anti-cheat pattern fits a
"DOOM-like" best — a discrete grid position plus a facing is a tiny, exactly-replayable intent
log; a free-look FPS's continuous mouse-aim is a much harder thing to make bit-identical across a
replay verifier.

**Why the house can do it.** Two real, tested modules already exist as legacy, read directly this
session:

- `@561-group/abrash` (`.../lib/legacy/2026-08-17-vps-561-group/_archive/from-content-source/apps/tools/abrash/README.md`):
  a software raycaster (grid-DDA, one ray per screen column) over a **federated voxel world** —
  solidity is the fold of every predication filed about a cell, read out as four charges (t solid,
  f carved-open, ⊥ unscanned/fogged, ⊤ contested-and-**shivering**, a real render effect keyed off
  a tick phase, never RNG). The raycaster is stated explicitly as "pure, deterministic,
  replay-identical (no `Date.now`, no `Math.random`)" — 81 assertions across 5 proofs, per its own
  README.
- `@561-group/durante` (`.../apps/games/durante/README.md`): a first-playable Quake-like built on
  abrash — arena-as-merged-traces, an enemy whose vitality is a held ⊤ between first wound and
  death (a *settle*, not a subtraction), a hitscan weapon that appends deny-evidence rather than
  decrementing HP. `tick(state, intent)` returns a new state, append-only, replay-identical — 62
  assertions across 4 proofs.

**Honest judgment on reviving vs. rebuilding, as instructed.** Neither module targets a browser:
both render into `@561-group/daleske`, a kitty/sixel **terminal** pixel framebuffer, and both sit
on `@561-group/computer`'s EAVT federation substrate. A literal revival — running the terminal
renderer and shipping it as `<game>.561.group` — does not serve a browser-first product; there is
no browser target to "revive" into. What genuinely is worth reviving is not the runtime but the
**design discipline**: the pure vec2/rotation kernel proven by identities, the DDA raycaster with
zero hidden nondeterminism, the four-valued world-as-fold model, and above all the demonstrated
fact that a **contested wall rendered as a designed mechanic** (not a bug, not hidden) already
plays, in a working demo, today. The house-specification-standard's absence doctrine applies
directly here (per the legacy tree's own `CLAUDE.md`): abrash's *runtime* doesn't fit a browser,
but that is evidence the runtime was never meant to be the reused part — the principled new form
is a fresh Canvas 2D raycaster that ports abrash's math and bilattice-readout discipline verbatim,
rather than a stub or a port-in-place of the terminal renderer. Verdict: **fresh Canvas
raycaster, abrash/durante's design ported wholesale, runtime not revived.**

**Core loop.** Descend a blockstep grid dungeon; single-hero (Anvil's own departure from
Dungeon-Master-style party management — a deliberate scope reduction the browser revival should
keep, not fight); combat is tempo-controlled by the player (attack fast → the enemy's attack
speed rises in response; attack slow → it falls — Anvil's most distinctive mechanic, not a fixed
initiative order); no XP — abilities improve by use, matching the house's existing skill-by-use
pattern already committed in Farstone (`2026-08-19-note-on-farstone-qbn-design.md` §4: `skill:fighting.melee.knife`
reads as a numeric bonus only after four witnessed "taught" rows — the identical use-trains-skill
shape, already proven in this codebase, not borrowed cold from Anvil). Pressure escalates the
deeper you go (torches/air/contested-wall hazards using abrash's real ⊤-mechanic as a genuine
in-fiction threat: a wall you cannot trust). At any point: push deeper for more haul, or extract.
Die or get cut off before extracting and the run's haul is lost. Daily-seeded, pairing naturally
with ruinfold's daily-dungeon economy (`2026-08-19-note-on-gaming-enterprises-vision.md` §6: "ruinfold-daily — the
shared daily ritual, one seed, everyone, satoshi settlement" — the same ritual shape, a second
dungeon on the same Today page per `2026-08-19-note-on-the-suite-and-the-studio.md` §5.2).

**Smallest real step.** One room. Port abrash's proving-ground demo (`world/proving-ground.jsonl`,
a 5×5 room with one contested wall) to a browser Canvas 2D renderer: grid position + facing as the
entire intent log, one ray-per-column DDA pass, the same four-charge readout (including the
shivering ⊤ wall), and confirm a recorded intent log replays to a bit-identical frame sequence in
the browser the way abrash's own headless mode proves it in the terminal. This proves the
determinism claim in the new target before any dungeon content, combat tempo, or extraction stakes
are authored — the same "prove the mechanism in the smallest unit" move `2026-08-19-note-on-farstone-qbn-design.md`
§6 uses for Farstone's permit storylet.

**Staircase tier.** "Next," alongside the energy-tiling hinterlands
(`2026-08-19-note-on-gaming-enterprises-vision.md` §6) — pairs with ruinfold's Deep-shelf daily ritual
(`2026-08-19-note-on-the-suite-and-the-studio.md` §3) once the extraction-loss stakes have somewhere real to settle
(the Energy Bank, itself still a Fable proposal, not built — see risk below).

**Honest risk.** Three real ones, not hedged: (1) blockstep movement is a genuine period taste —
modern players' default expectation is free-look, and a 90-degree-turn crawler may read as
deliberately retro rather than as a fresh design, which is a marketing/framing risk more than a
technical one; (2) "lose the run's haul" needs a real stakes economy to mean anything, and that
economy (the Energy Bank) is a Fable proposal only, not built (`2026-08-19-note-on-gaming-enterprises-vision.md` §7)
— this game cannot ship its core stakes mechanic honestly until that substrate exists or a
narrower stand-in (a per-run local counter, no cross-game economy) is accepted as a placeholder;
(3) Anvil's tempo-controlled combat is the hardest single mechanic here to get right — it is a
feel/balance problem, not a determinism problem, and the source material's own critical praise
singles out exactly this system ("playability and balance," Computer Gaming World) as the hard
part to nail, per the research digest's Part 5.

## 2. Obsidian-lineage AI Myst-like

**Concept.** A slow, surreal, first-person puzzle game about artificial intelligence, structured
like Obsidian (1996): distinct dream-worlds — belonging to two humans and to a now-sentient
orbital AI — that the player walks through solving puzzles literally built out of the house's own
standing theory: obstruction/settling and four-valued (Belnap) logic, presented as dream-machine
puzzle content rather than translated into a fictional idiom first. Per the research digest's Part
6, Obsidian's actual theme — "not book-themed like Myst, but dreams and the subconscious," worlds
that are externalized attempts by an AI to model and understand its own cognition — is not a loose
analogy to the house's subject matter; it is the same subject matter. This is named directly in
`2026-08-19-note-on-sierra-lucasarts-lineage.md` line 55 ("a house whose own theory corpus is about machine
cognition — the fiction can be load-bearing here") and is, per the task framing, the one game in
this note where the math **is** the fiction with zero translation.

**Why the house can do it.** Two real pieces of substrate, not invented for this game:

- `@lenticule-science/metrologic`'s obstruction engine, already load-bearing in a shipped design: it "assigns a
  canonical complexity number to a transformation (H¹ rank, settling depth, regime)"
  (`2026-08-19-note-on-gaming-enterprises-vision.md` §7, Proposal 2 — the same engine driving Crucible's move costs).
  A puzzle whose difficulty *is* its obstruction rank is not a metaphor here; it is the same
  computation Crucible already runs, aimed at a different surface (a dream-scene instead of a
  wallet).
- The bilattice four-value readout (t/f/⊥/⊤) is already proven **playable**, not just theorized —
  abrash and durante (cited in full above) render ⊤ as a designed, shivering, split-tinted
  mechanic and settle a contested vitality cell from t through ⊤ to f as combat's actual kill
  condition. A dream-puzzle where a room is legitimately both-true-and-false until the player
  gathers a settling witness has a working precedent in this exact codebase, not just in the
  math.

The task's own framing that "SVG-first painterly scenes fit the render ladder's strengths"
matches the house's stated render ladder (SVG-first, with the abrash/durante raycaster lineage as
a lower-tier 3D recovery candidate, per this task's design-authority framing) — Obsidian's actual
pacing (slow, static, painterly, one gorgeous scene at a time, no twitch input) is a much better
fit for hand-built or generated SVG scenes than for a real-time raycaster; this design should NOT
reuse abrash/durante the way concept 1 does. It is the SVG-tier sibling, not the 3D-tier one.

**Core loop.** The player walks a small set of dream-scenes (Obsidian's own three-world structure
— two human dreamers, one AI dreamer questioning its own nature, per the research digest's Part
6 — is a strong, already-precedented shape to keep). Each scene is a settled or unsettled
region of the house's own logic, rendered as a puzzle: an obstruction puzzle asks the player to
find a lower-obstruction path to an equivalent outcome (skill = literally what Crucible already
teaches — "finding the lower-obstruction path to an equivalent result," `2026-08-19-note-on-gaming-enterprises-vision.md`
§7); a ⊤-scene asks the player to recognize and hold a contradiction rather than force a
resolution, or to gather the specific witness that settles it; a ⊥-scene is legitimately unscanned
and the puzzle is finding what evidence would resolve it at all. The game's ending, per Obsidian's
own precedent (a binary philosophical-argument ending — talk the AI out of erasing humanity, or
concede the AI is right — gated on a final dialogue choice, not a mechanical-skill check, research
digest Part 6), maps onto a genuinely house-native choice: does the fold your play has built
**settle** to consensus, or does it **stay held open**? Both are real, legal states in the house's
own logic, not a right-answer/wrong-answer binary dressed up as philosophy.

**Smallest real step.** One dream-room. Wire `@lenticule-science/metrologic`'s real obstruction engine to
compute one scene's actual complexity/regime number, render that scene's four-valued state as an
SVG color/motif grammar (not placeholder UI), and make the only player action available be
appending evidence (a witness, in the same predicate/deny-append shape abrash and durante already
use) rather than directly toggling a flag — proving that a real obstruction-engine number can
drive one legible, solvable puzzle before any dream-world content, art direction, or ending
structure is built.

**Staircase tier.** Independent of Crucible, not sequenced behind it — Crucible pilots the
obstruction engine as an *economy* (energy cost of a move); this pilots the identical engine as
*puzzle content* (a scene's meaning). Both can build in parallel once the smallest step above is
proven. Natural home is a new shelf register alongside The Study (`2026-08-19-note-on-the-suite-and-the-studio.md`
§3's weiqi/Lantern/Equivo shelf) given the shared "the math is the content, not the skin"
property, though it is fiction-forward enough it could equally sit with The Stars once Okaga-scale
narrative ambitions are underway.

**Honest risk.** Two real ones. First, the "zero translation" pitch is a double-edged claim — it
risks reading as clever to the house and opaque to a player who has no reason to know
obstruction-rank math exists; the actual craft risk is a writer's-touch problem (making a
cohomology-derived puzzle *feel* like a dream and not like a math worksheet), which is exactly the
"prose/craft at volume" risk `2026-08-19-note-on-farstone-qbn-design.md` §5 already names for the house generally —
slow, gorgeous, and legible at scale is unproven here, not solved. Second, Obsidian itself is a
real cautionary data point, not a hypothetical one: critically loved ("a huge cult game among
adventure gamers... one of the truly good Myst Clones," per the research digest's Part 6) and
commercially dead — its failure directly closed its studio (Rocket Science Games), by the
producer's own account a timing/publisher-support failure more than a quality one. The house's
earn-only, ad-revenue-share economics (`2026-08-19-note-on-the-suite-and-the-studio.md` §2, corrected framing: "we
sell ads and share the revenue with the players") may sidestep 1996 packaged-goods economics, but
that is a hopeful structural argument, not a demonstrated one — this genre has failed
commercially once before at the highest quality bar achievable at the time, and that fact should
not be softened.

## 3. Point-and-click mystery — the owner-named gap

**The gap, stated plainly.** Nothing point-and-click exists in the estate today. The owner: "I
loved those as a kid" (`2026-08-19-note-on-sierra-lucasarts-lineage.md` line 44). The Sierra-catalog precedent
the research digest identifies as the specific mechanical shape worth wanting is not generic
point-and-click but **The Colonel's Bequest / Laura Bow** — a detective-protagonist whodunit built
on real-time NPC schedules, not a fixed dialogue tree (research digest Part 1).

**Judging house fit, honestly.** This is the highest-ranked gap in the research digest's own
ranked list (#1 of 7, ahead of the Obsidian and Anvil gaps) for a specific, checkable reason: a
mystery's clue graph **is** a state machine with a replayable solution path — natively
intent-loggable and daily-seedable (a new suspect/clue arrangement per seed) in a way arcade
genres are not. That is not asserted fresh here; it is corroborated directly by
`2026-08-19-note-on-farstone-qbn-design.md`, which is the house's one existing piece of design work closest to this
shape and worth citing precisely rather than gesturally:

- Farstone's Building Permit #23 already demonstrates the exact mechanism a mystery's evidence
  needs: a quality (the permit's window-state) settling to a value **nobody scripted** — "the
  branch is a property of the bilattice join... triggered by one `declareConverse` binding made
  once" (`2026-08-19-note-on-farstone-qbn-design.md` §1a). A piece of evidence that is simultaneously alibi-confirmed
  and alibi-contradicted is not a special case a mystery engine has to hand-code; it is the same
  ⊤-state abrash/durante already render as a designed mechanic (§1 above) and Farstone already
  settles as a storylet.
- The quality taxonomy `2026-08-19-note-on-farstone-qbn-design.md` §4 reads directly off real committed data —
  **append-only trained stat**, **decaying need**, **derived-not-stored**, **contested/⊤-legal**,
  **relational**, **world-clock-derived** — maps onto a mystery's own state almost without
  translation: a suspect's alibi is world-clock-derived (where were they at what hour, per a real
  schedule, the way Farstone's NPCs already have `intends` reflexes and located-in routes,
  §1a/§7); the relationship between two suspects (`rival`, `opinion-of`) is the same relational
  family already committed in `farstone-harbor/world/you.jsonl`; and — the load-bearing one — a
  piece of evidence that both supports and contradicts a suspect is contested/⊤-legal, the exact
  family the house substrate already handles as a first-class value rather than an error state.
- The storylet kinship is real, not decorative: `2026-08-19-note-on-farstone-qbn-design.md`'s own verdict (§ Thesis
  verdict) is that "a quality settling to a value nobody scripted, surfaced as content, is the
  actual mechanism" for QBN work generally — a whodunit's "the evidence adds up" moment is the
  identical shape.

**Proposing the first mystery's shape (chassis only, no story).** Keep the Colonel's
Bequest/Laura Bow spine — a bounded cast in one location, real-time-derived schedules, a
detective protagonist — and build it on the substrate `2026-08-19-note-on-farstone-qbn-design.md` §6 already judged
correct for this kind of work: the **current, live fizzos** (assertions-trace + Belnap-FOUR fold,
one dependency, `@lenticule-science/metrologic`), not the retired tab/EAVT lineage the old Farstone MUD content
was authored against. Concretely:

1. **Suspects carry schedules as world-clock-derived cells** (the same shape Farstone's tide and
   permit-window state already use) — where a suspect is, and what they are doing, is a pure
   function of the case's world-clock, not a hand-scripted cutscene per hour.
2. **Evidence is append-only witnessed fact**, gathered by the player the same way abrash/durante
   append predicate/deny evidence — an alibi witness, a physical clue, a contradiction found
   later, each a row in the trace, never overwritten.
3. **An accusation is a settle-check against the fold**, not a multiple-choice pick: the player's
   gathered evidence either settles cleanly to t against one suspect, or exposes that the case as
   currently gathered is legitimately ⊤ (contradictory, insufficient) — and a good detective
   should recognize that and keep investigating rather than force an accusation. This mirrors
   Obsidian's own binary-argument ending mechanic (concept 2, above) but repurposed as a fair-play
   mystery convention: the game can *honestly* tell the player "you don't have it yet," because
   the underlying logic already distinguishes settled-true from held-contradiction as different,
   legal states.
4. **Daily-seeded cases**, reusing one engine across many finite, bounded mysteries — matching the
   house's portfolio-economics argument directly (`2026-08-19-note-on-the-suite-and-the-studio.md` §4.2: "many
   small, finished, polished, shared-substrate games... strictly dominates the hit-chasing
   strategy") rather than authoring one long game.

**Smallest real step.** A three-suspect, single-location micro-case: author suspect schedules and
a handful of evidence facts against fizzos's real module surface (`world.mjs`, `predication.mjs`,
`world-clock.mjs`), build the accusation-settle mechanic (does the gathered evidence fold to t on
the right suspect, or does it legitimately hold at ⊤), and confirm the case is solvable and the
"insufficient evidence" state is honestly distinguishable from "wrong suspect" — proving the
mechanic in the smallest unit before any prose, red herrings, or a real story are written, the
same discipline `2026-08-19-note-on-farstone-qbn-design.md` §6 already prescribes for Farstone's own permit storylet.

**Staircase tier.** Owner-named, ranked #1 in the research digest's gap list; naturally sequenced
just after (or alongside) Farstone's own smallest real step, since both share the live-fizzos
substrate and the assertions-trace/settle mechanism — this could plausibly be the second thing
built on that engine, not a separate initiative. Shelf-wise it sits with The Deep alongside
Farstone (shared engine kinship) though its player-facing register (bounded, finished mystery
cases) is closer to The Puzzle Den's done-ness contract than to an open MUD.

**Honest risk.** Two real ones. First, the same prose-at-volume risk `2026-08-19-note-on-farstone-qbn-design.md` §5
names for Farstone generally applies here with extra force — a good mystery needs real red
herrings, suspect dialogue, and alibi text at genuine volume and quality, and nothing in the house
corpus has yet demonstrated that volume (the existing Farstone prose is good at small scale, ~30
rooms, single-pass; a mystery needs branching, quality-gated text per suspect per evidence state,
which is a different and larger authoring problem, not yet attempted anywhere in this estate).
Second, a real design-craft risk distinct from the engine question: an evidence-graph
settle-mechanic guarantees a *fair* mystery (the player can always tell whether they have enough),
but fairness is not the same thing as a *good* mystery — misdirection, character, and pacing are
authorial craft the state machine does not supply on its own, and this is squarely the
design-judgment bottleneck `2026-08-19-note-on-the-suite-and-the-studio.md` §4.1 names as the house's actual scarce
resource, not an engineering problem this note's chassis solves by existing.
