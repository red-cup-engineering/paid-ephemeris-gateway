---
title: If the Studios Survived
description: "Owner counterfactual, 2026-08-19: what would Sierra, Impressions, LucasArts, and Rocket Science actually make if each survived to 2026, reasoned from their design values rather than their brands — and which of those hypothetical 2026 games the 561 estate is already, accidentally, building."
date: 2026-08-19
keywords: ["gaming", "enterprises", "counterfactual", "sierra", "lucasarts", "impressions", "rocket-science", "lineage"]
---

# If the Studios Survived

Owner's question (`2026-08-19-note-on-sierra-lucasarts-lineage.md` §4): "what if these studios survived
through to today: what would they make?" Answered the way `2026-08-19-note-on-the-suite-and-the-studio.md`
answered the CD-suite question — strip the brand, keep the design **values**, apply 2026
reasoning (browser-first, live determinism, replay verification, ad-revenue-share economics,
AI players as peers), and see what falls out. Not nostalgia projects. Each section below: the
studio's real values (cited to the research digest), the 2026 game those values produce, then
the honest answer on whether the 561 estate is already building it.

## Sierra On-Line — consequence and death as simulation depth under an adventure skin

**The value, not the brand.** Sierra's actual design signature across King's Quest, Space
Quest, Police Quest, and Phantasmagoria was never "point-and-click" as a genre label — it was
**a willingness to let the world simulate consequences the player didn't ask for**, including
lethal ones, inside a genre everyone else was making safe. Death was real, sudden, often unfair
by modern design standards, and that unfairness was the point: it signaled the world had rules
independent of the protagonist's plot armor. Police Quest additionally fused that with
procedural realism (an ex-cop designer encoding real procedure as the actual puzzle content, not
flavor). The Colonel's Bequest went further: NPCs ran on real-time schedules independent of the
player, so the mystery was a simulation the player observed rather than a script the player
triggered.

**What 2026 Sierra would build.** Not a death-heavy adventure game — that mechanic reads as
cruel-for-its-own-sake to a 2026 audience and Sierra's own later titles already retreated from
it. What survives is the *values*, translated: a world with **real, checkable, non-scripted
consequence** — state that evolves on its own clock, whether or not the player is watching, and
where an accusation, a choice, or a delay can genuinely fail, not fail-and-retry. 2026 Sierra
would build this on a deterministic engine with an intent log specifically *because* that's the
only honest way to guarantee "the world kept moving while you weren't looking" isn't a lie the
designer is telling — replay verification is what makes unscripted consequence trustworthy
rather than arbitrary.

**Is the estate already building it?** Yes, twice, by name. `2026-08-19-note-on-farstone-qbn-design.md`'s
Building Permit #23 is a quality settling to ⊤ **nobody scripted** — the exact Colonel's-Bequest
shape (a world-clock-derived state resolving on its own) already proven in this codebase, not
hypothesized. And the point-and-click mystery gap (`2026-08-19-note-on-revivals-anvil-obsidian-mystery.md` §3,
owner-named, ranked #1 in the research digest) is the direct 2026-Sierra answer: real-time
schedules, append-only evidence, an accusation that can honestly fail as "insufficient" rather
than "wrong." It is a planned design, not shipped code — see `planned/2026-08-19-note-on-mystery-adventure.md`.

## Impressions Games — readable economies and scenario craft, not walker nostalgia

**The value, not the brand.** Impressions' walker model (Part 4 of the research digest) is
often read as the whole point of Caesar/Pharaoh/Zeus, but the walker abstraction was a *means*,
chosen because it made an economy legible at a glance — you could watch the actor walk and
understand your city's service coverage without reading a spreadsheet. The other real value,
separable from the walker mechanic itself, was **scenario craft**: finite, hand-authored
missions with distinct win conditions and a campaign arc moving through history, which taught
the player a widening rule-set one bounded lesson at a time rather than dumping the whole
simulation on them at once.

**What 2026 Impressions would build.** Not a walker-economy clone — the walker's own real
limitations (pathfinding randomness read as frustrating, limited player agency over
distribution, no real material physics, per the digest's Part 4) are well-documented, and a 2026
studio with better simulation tools available would not choose the abstraction that exists
because 1990s hardware couldn't afford real material flow. It would keep the *legibility*
(watch the state, understand the system) and the *scenario/campaign structure* (finite missions,
widening rules, a history to move through), but replace the walker's fixed-throughput
abstraction with real seasonal material chains and survival pressure — exactly the Dawn-of-Man
half of the brief's own instruction (research digest Part 4: "campaign/scenario structure and
resource-loop substance are separable design axes... borrowing scenario shape from one and
resource physics from the other is not a category error").

**Is the estate already building it?** Yes — this is the flagship of the whole wave, already a
full design brief: `2026-08-19-note-on-seasons-builder-design.md` (working title "Seasonal Round"), Impressions-
style finite scenarios and campaign structure fused with Dawn-of-Man material/seasonal
resource management, first campaign Lakota. See `planned/2026-08-19-note-on-seasons-builder.md`. Zero code yet, but
design judgment — the actual scarce resource per `2026-08-19-note-on-the-suite-and-the-studio.md` §4.1 — is spent.

## LucasArts — no-death comedy and cinematic staging, puzzles as jokes with rules

**The value, not the brand.** LucasArts' defining break from Sierra was philosophical, not
technical: Ron Gilbert's design manifesto against arbitrary death and unwinnable states meant
the SCUMM-era games (Monkey Island, Day of the Tentacle, Grim Fandango) treated failure
differently — you could not lose the game to a moment you didn't understand was dangerous. The
puzzle was the entire adversarial layer; comedy timing and cinematic staging (camera cuts,
scripted set-pieces, character-driven jokes) did the emotional work a Sierra death-scare would
have done. This is the inverse design value of Sierra's, not a competing flavor of the same
thing — Sierra trusted the world to punish you; LucasArts trusted the world to entertain you
while never punishing you unfairly.

**What 2026 LucasArts would build.** A puzzle-comedy engine where the puzzle **is** the joke —
mechanically fair, generously clued, and staged with real production value (timing, character
voice, visual gags), built to be *finished* and *replayed for delight* rather than beaten once
and shelved. In 2026 terms: no permadeath, no punishing state, a state machine whose failure mode
is "you haven't found the funny solution yet," not "you're locked out." Daily-seeded content
would be a genuinely novel extension LucasArts never had the infrastructure for — a new joke-
puzzle arrangement each day, same cast, same fairness contract every time.

**Is the estate already building it?** Not yet, and this is the honest gap. The point-and-click
mystery gap borrows LucasArts' *engine shape* (state machine, real-time or logic-driven
resolution) but not its *comedy-and-no-death* register — Colonel's Bequest is a Sierra shape
(death is real, the world doesn't care about you), not a LucasArts one. Nothing currently planned
in the estate targets a pure no-death comedy adventure. This is worth naming as the second
adventure-engine build once the mystery chassis exists, not a currently-planned item — flagged
here rather than invented a stub for, per the standing discipline against fabricating scope.

## Rocket Science Games (Obsidian) — place-as-puzzle, the world as the mind

**The value, not the brand.** Rocket Science only shipped one title of real consequence, but
Obsidian's actual design value (research digest Part 6) was distinct even from Myst, its nearest
genre-sibling: where Myst's worlds were book-lore (someone else's story you excavate), Obsidian's
worlds were **externalized cognition** — literal dreams, and an AI's attempt to model its own
nature by building a place. The puzzle-worlds weren't set dressing around puzzles; they were the
puzzle-solver's mind made walkable. Production process matched: art proposed a place freely
("anything can go in a dream"), and puzzle and story were built to fit whatever the place
suggested — an inverted pipeline (place first, puzzle and story after) rather than
story-then-puzzle.

**What 2026 Rocket Science would build.** A slow, first-person, painterly puzzle game where a
real cognitive or logical system is not represented by the puzzles but **is** the puzzles — no
translation layer between "the math" and "the content." 2026 gives this studio something 1996
Rocket Science didn't have: an actual house-owned formal system (obstruction/settling,
four-valued logic) to build the dream-worlds *out of*, rather than inventing dream-logic puzzles
from whole cloth the way the original had to.

**Is the estate already building it?** Yes, as a planned design: `2026-08-19-note-on-revivals-anvil-obsidian-mystery.md` §2, the Obsidian-lineage AI Myst-like, where `@lenticule-science/metrologic`'s obstruction engine
(already load-bearing in Crucible) and the abrash/durante-proven four-valued readout supply real
puzzle content with, per the design note's own claim, "zero translation." See
`planned/2026-08-19-note-on-obsidian-lineage.md`. Also unbuilt, design-only — and the note names Obsidian's own
commercial failure as a real, unsoftened risk, not a hypothetical one.

## What this counterfactual is missing on purpose

No studio row for Dynamix (flight/sports sim) or the pure-arcade LucasArts early titles
(Rescue on Fractalus!, Ballblazer) — neither has an owner-named signal or a values argument this
document can make honestly without inventing one. The Anvil-of-Dawn/DreamForge lineage (grid
dungeon crawler, tempo-controlled combat, no-XP skill-by-use) is deliberately not framed as a
"what would the studio build in 2026" counterfactual here, because DreamForge's actual design
value — tight single-hero combat feel — is a craft property, not a values argument the way the
other four studios' choices were; it belongs with the revivals note as a chassis to build, not
a counterfactual to reason through. See `planned/2026-08-19-note-on-extraction-crawler.md` for that one; it is the
fourth planned note in this wave but sits outside this document's "values, not brand" frame on
purpose.

## Sources

`2026-08-19-note-on-sierra-lucasarts-lineage.md` §4 (the owner's question, verbatim); the research digest
Parts 1, 2, 4, 5, 6 (catalog and mechanical detail, cited inline above); `2026-08-19-note-on-seasons-builder-design.md` and `2026-08-19-note-on-revivals-anvil-obsidian-mystery.md` (the estate's actual planned answers, read
directly, both already-existing design documents, not summarized from memory);
`2026-08-19-note-on-the-suite-and-the-studio.md` §4.1 (design judgment as the scarce resource, load-bearing for the
LucasArts-gap paragraph's framing).
