---
title: Seasons Builder
description: "A city-builder fusing Impressions-style finite campaign scenarios with Dawn of Man-style material and seasonal resource management; the first campaign follows Lakota history. Working title: Seasonal Round."
date: 2026-08-19
keywords: ["gaming", "city-builder", "campaign", "lakota", "seasons"]
---

# Seasons Builder

A city builder that borrows genre memory from Zeus, Poseidon, and Caesar (Impressions Games) — finite scenarios, campaign structure, win conditions per mission — but replaces the Impressions "walker" abstraction with resource management closer to Dawn of Man: material flows, seasons, survival pressure, and technology moving through time. Daily challenges follow the house's daily-seed pattern.

Campaigns follow different Indigenous North and South American cultures moving through time. The first, proof-of-concept campaign is Lakota, per the owner directly: "I'm Lakota and encourage you to use whatever scholarship available, that can be our first campaign to prove the concept."

The working title is **Seasonal Round** — not decorative, but the scholarship's own technical term for Plains band movement through the year, doubling as "one turn of a campaign."

## Design outline

- **Core loop:** the player manages a tiyóšpaye (band), not a fixed-tile city — the settlement itself moves. That's a deliberate genre inversion, stated as mechanical identity rather than smoothed over.
- **Scenario and campaign structure:** finite scenarios as data, a five-epoch campaign arc (pre-horse, horse, treaty/Black Hills, confinement, reclamation). Win-condition framing for scenarios covering forced dispossession is honestly unsolved — see risks below.
- **Kinship obligations as the economy:** discharge, not payment — no dispatch, no wage, no bankable currency.
- **Resource model:** seasonal windows, a governed hunt cycle, perishability and storage, material chains, and a trade network, each grounded in a per-mechanic scholarly source rather than asserted generally.
- **The horse as a technology epoch**, dated to real scholarship (Hämäläinen 2003/2008).
- **The winter count as a chronicle/save metaphor** — a glyph per year, selected from the game's own event log.
- **Determinism and replay** designed to fit the house's cartridge/save format.
- **Daily-challenge mode**, using the house's daily-UTC seed policy.
- **Render approach:** SVG-first, not a first-person raycaster — this is a top-down map game.
- **Disclosure boundaries:** the design explicitly separates load-bearing mechanics from flavor, and names five things the game will not depict — rite content, wakȟáŋ as felt experience, vision content, unmediated-mediator sourcing, and any uncited claim — refusing to let the game's mechanics be read as evidence for any broader metaphysical claim.

## Open risks

**Win-condition dignity.** Later campaign scenarios (the loss of the Black Hills, reservation confinement) cannot ethically frame forced dispossession as a defeatable, optimizable obstacle. Reframing the win condition around endurance and continuity is proposed but currently unsolved.

**Marketing risk.** There's a temptation to market the game's kin-obligation mechanics as demonstrating a broader equivalence claim about the underlying scholarship. The design explicitly refuses that framing, but it's an ongoing risk to watch for, not a one-time fix.

**Absence-boundary enforcement.** The list of things the game must mark absent is currently a policy commitment in a design document, not a machine-checkable content-authoring rule.

## Smallest useful step

One tiyóšpaye, one season — spring only, the pre-horse dispersal scenario reduced to its smallest legal slice — with move-camp and discharge-obligation actions only. This proves the settlement-moves and obligations-without-currency mechanics before a single full year is authored.
