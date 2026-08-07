---
title: "Frontier Register: Affect Theory and French Dramaturgy over the Play/Game Substrate"
author: "emsenn"
date: 2026-06-25
status: register
packages: ["@emsenn/playing", "@emsenn/gaming"]
tags: [playing, gaming, ludics, affect-theory, performance, dramaturgy, frontier, roadmap]
---

# Frontier Register — Affect & Dramaturgy in Play

The substrate (`@emsenn/playing` = single-agent ludics + the *-autonomous cut; `@emsenn/gaming` = the scale-2 concurrent-games-with-symmetry lift) is already, structurally, a theory of performance — it just lacks the names.
This register catalogues two theory-families the substrate is nakedly asking for — the **Anglo affect** layer and the **French dramaturgy/stage** layer — bridged by Caillois, meeting at **genre**.
Inclusion criterion as before: marginal-or-underformalized + a live hook (an existing carrier or morphism it consumes).

## Already landed — DO NOT REBUILD

`gaming` has eaten most of the *play-as-cultural-form* canon: - `placing/magic-circle`, `placing/homo-ludens` (Huizinga: the frame that makes moves count). - `placing/paidia-ludus`, `placing/ludus` (Caillois' free↔ruled axis). - `reading/lusory-attitude` (Suits, *The Grasshopper*). - `reading/rhetorics` (Sutton-Smith, *The Ambiguity of Play* — the seven rhetorics). - `reading/deep-play` (Geertz, the Balinese cockfight), `reading/flow` (Csíkszentmihályi), `reading/cascade`, `reading/regime`, `reading/trajectory`. - `strategizing/mask` (formerly `character` — the participant's handedness I/O face), `strategizing/shadow`, `strategizing/play`, `strategizing/strategy`.

`playing` supplies the ludic structures the new work hooks onto: - **design** (the full strategy), **incarnation** (the part materially traversed in interaction), **chronicle** (a play / run), **behaviour** (a set of designs closed under bi-orthogonality — a *type*), **orthogonality** (the cut converges/diverges), **daimon** (the give-up move), **polarity** (Player/Opponent).

The two new layers sit ABOVE the play-base; they are its semantics (what the structures mean affectively and dramaturgically), not a re-derivation.

## The bridge: Caillois' second axis (queued)

Caillois' agon/alea/mimicry/ilinx is the hinge. **agon**(contest)/**alea**(chance) are the formal game already modelled. **mimicry** (mask, role) is the doorway to the dramaturgy layer; **ilinx** (vertigo, the play that unmakes the player) is the doorway to the affect layer.
Land the full quadrant as a reading over an arena/chronicle (`gaming`, beside `paidia-ludus`); mimicry and ilinx are the two coordinates that do not reduce to win/loss, and the two theory-families supply their semantics.

## Layer A — French dramaturgy / stage (queued)

- **Front stage / back stage = incarnation / design** (already structural; name it).
  The design is backstage (every prepared contingency, the unplayed lines); the incarnation is front stage (what the opponent saw).
  Impression management = which loci you incarnate.
  The `daimon` = breaking frame (Goffman) / *Verfremdung* (Brecht).
  Home: `playing` (over incarnation/design).
- **The spectator (Rancière).** The substrate is dyadic (Player/Opponent); performance needs the third party.
  Add a **spectator** role to the interaction and **dissensus** as a move that *redistributes who may act* (breaks the genre's partition of player/opponent/spectator).
  The *emancipated spectator* = a spectator with an admissible move into player position.
  Home: `gaming` (multi-agent).
- **The Paradox of the Actor (Diderot) — as a theorem.** The great actor feels nothing; the affect is manufactured in the audience by pure technique.
  Ludics already proves this: a **design is pure form**; affect lives in the **interaction**, never in the design alone.
  State it: backstage is affectless calculation, front-stage affect is a property of the cut.
  (Same claim as Massumi's autonomy of affect.)
- **Spectacle (Debord) — the degenerate case.** A genre in which the spectator polarity has *no* admissible move into player position.
  Reconnects to californication (spectacle = affective foreclosure of the play-exit).

## Layer B — Anglo affect (queued)

- **Tomkins — scenes & scripts (FIRST CUT).** A **chronicle is a scene**, a **design is a script**, and the nine-affect system is the typology of a play's felt texture beyond payoff.
  A `playAffect` reading over a chronicle (interest/enjoyment/surprise/distress/fear/anger/shame/disgust/dissmell) gives the quality the win/loss reading discards.
  Most directly buildable.
  Home: `playing` (over chronicle).
- **Massumi — affect as intensity.** A magnitude on the cut autonomous from the outcome — reversal density / surprise / steepness of a chronicle, not who won. ilinx is its extreme.
- **Sedgwick — paranoid vs reparative.** Two *stances* toward a game: paranoid (defend every move, zero-sum, the *-autonomous-defensive reading) vs reparative (play to build, positive-sum, generative).
  Maps onto the duality the package already carries; reframes a strategy as having an affective posture.
- **Ahmed — affective economies.** Affect as *sticky*, accumulating on loci as it circulates — a charge field over the locus tree with memory across plays (neither the payoff nor a single chronicle captures it).

## The synthesis: GENRE = behaviour × affect-arc (FIRST CUT)

A genre is two things at once. **Formally** a **behaviour** (the designs closed under bi-orthogonality — the plays that "count" within a frame; also the magic circle, also Sutton-Smith's rhetorics — all present). **Affectively** Berlant's genre: a promised feeling-arc (tension→climax→release).
The killer addition is the **impasse** — Berlant's genre of stuckness, a behaviour with no winning design / a non-terminating chronicle = *cruel optimism*, a game you keep playing because it won't let you win or leave (the same non-convergence the governance work already detects).
So: `genre = behaviour × affect-arc`, with the impasse as its pathology.
The formal half exists; the felt half (the affect-arc read off a chronicle, and the impasse) is the gap.
The single richest first build.

## The weird edge (catalogued, deferred)

- **Lyotard — the figural / libidinal economy.** Affect as the intensity that *deforms* the discursive — not a reading over the locus tree but a distortion *of* it (a libidinal charge bending which loci are even available).
  The inverse of everything else: affect-as-what-breaks-form.
- **Deleuze — theatre of repetition; Artaud — theatre of cruelty.** Performance that is not representation but produces the real; in ludic terms a play whose value is that it cannot be re-played identically (repetition that returns difference). ilinx formalized to its limit.

## First cut (endorsed)

1. **`genre`** = behaviour × affect-arc + Berlant's impasse (the non-convergent pathology).
  Spans `playing` (behaviour/chronicle) — the affect-arc read over a chronicle.
2. **`playAffect`** = Tomkins scene/script affect reading over a chronicle.

Both ride structure already in `playing`; neither rebuilds the magic circle.
Boundary note: peers may be live in `gaming`/`playing` — land each new reading in its own module and re-export; do not edit the ludic core or the existing cultural readings.
