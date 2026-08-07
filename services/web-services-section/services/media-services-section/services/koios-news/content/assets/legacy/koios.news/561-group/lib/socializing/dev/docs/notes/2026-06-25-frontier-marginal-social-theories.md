---
title: "Frontier Register: Marginal Social Theories the Model Is Leaning Toward"
author: "emsenn"
date: 2026-06-25
status: register
package: "@emsenn/socializing"
tags: [governance, socializing, frontier, social-theory, roadmap]
---

# Frontier Register

A working register of social/governance theories from the *margins* — heterodox, under-formalized, or radically interdisciplinary — that the package's existing mathematics makes newly tractable.
The inclusion criterion is strict: a theory earns a place only if (a) it is genuinely marginal (not the social-choice/Ostrom canon already implemented) and (b) there is a *live hook* — an existing carrier or reading it would consume rather than require new foundations.
The package already runs: bilattice FOUR + the freedom to hold ⊤; jural relations and Hohfeld correlativity; offices and the operational positions; consensus/judgment/Aumann with the ⊤-escape from impossibility; Ostrom (IAD grid, graduated sanctions, polycentricity, the eight principles); opinion dynamics (DeGroot/Friedkin–Johnsen); voting power (Banzhaf/Shapley–Shubik); fair division; the FCA coalition lattice and Chu effectivity; the closure-regime convergence classifier; and the californication clusters (the savior–slave/Clastrean dual, the structural battery, and the affective battery over a settling trajectory).

This register is the answer to "where next, if next is only *new external theory*."

## Queued for implementation

These five are tasked.
Each is cheap relative to its payoff because it consumes machinery already built.

### 1.
Bateson — the double bind & schismogenesis *Hook:* Hart/Ostrom levels + cross-level ⊤ + `foreclosureWatch` + `dutyPowerValence`; Friedkin–Johnsen polarization + `secede`. *Payoff:* the double bind is the **parent** of the savior–slave: a contradictory injunction across logical *levels* with no admissible exit.
We built the child (authority-fiber case) without the parent.
Formalize `doubleBind` = a cross-level ⊤ that `foreclosureWatch`/refuse-inadmissibility makes inescapable, generalizing savior–slave to any fiber; and `schismogenesis` = runaway differentiation, symmetrical (mutual escalation → polarization, spread growing along a trajectory) vs complementary (one dominates more as the other submits more → concentration growing).
Unifies the affective cluster, the level stratification, and the opinion dynamics under one diagnosis: *double bind (cross-level + foreclosed) vs honest ⊤ (single-level + refusable).* Planned module: `bateson.mts`.

### 2.
Graeber & Wengrow — the three primordial freedoms *Hook:* `secede` (leave), `refuse` (disobey), constitutional self-amendment (`governingLevel`); the affective `recuperationIndex`; recurrent-practice cadence + the regime ladder. *Payoff:* freedom defined as three concrete capacities — to leave, to disobey, to reorganize — each of which we already have as a primitive.
Land `threeFreedoms(field)` → `{ canLeave, canDisobey, canReorganize, free }` and assert the **completeness reading**: a polity is free iff all three remain callable, and californication is exactly the regime that keeps all three *structurally* callable while affectively foreclosing the desire to call them (cross-check against `affectiveRecuperationIndex`).
Stretch: `seasonalSovereignty` — a polity that oscillates regime by cadence (a recurrent practice over the regime ladder), the Dawn-of-Everything dual sovereignty.
Planned module: `freedoms.mts`.
Most on-brand (anthropology of actually-existing non-state freedom; Indigenous).

### 3.
Bourdieu — field, capital, and symbolic violence *Hook:* the Social Field + charges; the savior–slave valence; `affectiveRecuperationIndex`. *Payoff:* symbolic violence — domination *misrecognized as legitimate by the dominated* — is the sociological name for the entire affective cluster.
Enrich agents with capital coordinates (economic / cultural / social / symbolic), symbolic capital as a charge; `symbolicViolence` = a savior–slave (or duty-without-power) configuration whose **subordinated agent's own stalk endorses** the arrangement (a `potential` charge on its own subordination rather than a contesting ⊤/`active`) — misrecognition made measurable.
`capitalConcentration` reuses the concentration math over the capital distribution.
Anchors californication to a sociology giant who is almost never formalized.
Planned module: `bourdieu.mts`.

### 4.
Beer — the Viable System Model & the algedonic channel *Hook:* polycentric recursion; `requisiteVariety`; the jural routing graph; `coagulationGuard`. *Payoff:* from the cybernetics margin (Cybersyn, VSM, syntegration).
The unimplemented gem is the **algedonic channel** — a pain signal that *bypasses* the normal hierarchy and reaches the apex directly.
`algedonicAlert(field, distressedObserver)` routes a meme straight past the translation graph to a designated System-5 / the coagulation apex — the structural antidote to a captured chain of command, the companion to `coagulationGuard`.
Plus `viableRecursion` — each level is itself a Social Field (System 1–5) with a requisite-variety check, tying to polycentric nesting.
(Syntegration's icosahedron is even a literal Laplacian object, for later.)
Planned module: `viable.mts`.

### 5.
Girard — the mimetic scapegoat as pathological consensus *Hook:* `consensusClose`; `secede`; `contestedCells` / the recuperation trajectory. *Payoff:* the scapegoat mechanism is unanimity-minus-one: a sacrificial crisis (a field saturated with ⊤ — total undifferentiation) resolved by expelling **one** member, after which the remainder is unanimous.
It is a *coerced* `secede` and a forced convergence — the malign twin of `consensusClose` and the worst case of recuperation.
`scapegoatDetector(before, after)` flags the signature: high prior contestation, exactly one member removed *not by their own choice*, posterior consensus among the remainder.
A detector for "consensus reached by expulsion, not agreement."
Planned module: `girard.mts`.

## Catalogued (deeper margins / math frontier — not yet queued)

- **Higher-order networks — simplicial social topology.** Everything is dyadic (edges, the graph Laplacian, H¹ over a 1-complex).
  The real frontier lifts the consensus sheaf to a **simplicial complex** (a 3-way coalition is a 2-simplex), giving higher Betti numbers as *higher-order* disagreement no pairwise reconciliation resolves, and persistent homology as which coalitions survive across scales.
  The relating cohomology machinery and the FCA coalition lattice already supply the simplices.
  The single highest-ceiling "use our best math" move; deferred only because it is the largest lift.
- **Rappaport — ultimate sacred postulates & ritual regulation.** The sacred = the un-amendable fixed point closure never revises (the Grundnorm at the constitutional level); ritual as a homeostatic regulator.
  On-brand for the Lakota ceremonial-transmission already in the corpus.
- **Tarde — imitation / opposition / invention.** The rich micro-sociology of which DeGroot averaging is the degenerate quantitative shadow: imitation = propagation, opposition = ⊤, invention = a new cell.
- **Luhmann — autopoiesis.** Is the polity reproducing its *own* jural relations (operationally closed) or being produced from outside (allopoietic / captured)?
  A closure reading over the act stream.
- **Liquid democracy.** Delegation graphs whose **cycles** are a real failure mode the no-periodic-orbit / aperiodic machinery already forbids; composes with `delegate` and voting power.
- **Parecon — balanced job complexes.** An allocation constraint that no agent accumulates all the *empowering* work — anti-savior-slave fair division; composes with `allocateWork`.
- **Sortition / lottocracy.** Random office assignment as anti-capture; composes with `rotate` and the Clastrean anti-coagulation argument.

## Adversaries to red-team (model, do not endorse)

- **Exit-maximalist "patchwork."** Secession with *no* remaining commons — the dark use of the tools just built; the missing twin of `foreclosureWatch` should catch fragmentation-without-commons.
- **"Social physics" (behavioral optimization).** Governance-by-prediction; californication's engineering manual.
  The thing the affective battery is defending against — useful as the adversary the detectors are tuned to flag.

## Note on boundaries

Peers concurrently own `consensus.mts` (spectral), `coalition.mts` / `effectivity.mts` (FCA + Chu), and `trajectory.mts` (the regime classifier).
The queued work consumes those but should not edit them; each new theory lands in its own module and re-exports through the package index.
