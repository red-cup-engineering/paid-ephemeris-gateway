---
title: Service Composition and Filing
description: The filing principle the game fleet follows — games are the user-facing membrane, systems are the leaf nodes composed underneath them, and contracts are the only coupling between the two.
date: 2026-08-19
keywords: ["gaming", "architecture", "filing", "composition"]
---

# Service Composition and Filing

The house's governance corpus states a standing rule: no unit may act on another unit's
execution directly — only a contract, hook, schema, or checkpoint may. Applied to a game
studio built from one person and many agents, this gives a concrete filing principle.

1. **Games are the micro-enterprises.** Each published game faces users directly at its
   own subdomain, so games live in the public games section — the user-facing membrane.
2. **Gaming is the demand inducer.** Each game's needs pull simple, atomic services into
   existence upstream: a seed deriver, a ledger, a replay harness, a raycaster. Those
   leaf nodes live wherever their *kind* lives — game systems under the game-systems
   section, math under math, transport under its own section — not wherever the game
   that first wanted them happens to sit.
3. **Contracts are the only coupling.** Interfaces like the cartridge contract or the
   energy-bank settlement interface are pre/post contracts between an enterprise and a
   system. A game never reaches into a system's execution, and a system never knows
   which game is calling it. That is what makes it possible to build specialized systems
   — a card-game engine, a city-builder simulation kernel, a storylet compiler — as
   compositions of simpler upstream services rather than as monoliths.
4. **The tree is the proof.** If the filing is right, a stranger can walk from any
   published game, down through its contracts, to the atomic scripts it composes, and
   every step is a directory. If the filing is wrong, the theory is invisible no matter
   how sound it is.

## The composition shape

An app is a composition, never an origin: `x/apps/y` should compose scripts that live in
`x/services/{p,r,q}/scripts/`, never define its own logic from scratch. Logic born
inside an app dies with the app instead of joining the wider network; logic filed as a
service can be reused by everything else. Composing small services into apps, and those
apps into larger apps, is what lets the house earn reusable assets across the whole
codebase — a benefit that reaches well past gaming.

Two consequences that follow from this for the game fleet specifically:

- **All web games render through shared house assets.** TUFTE handles document-shaped
  surfaces (storefronts, panels, tiles); QwzSpace handles realtime surfaces (presence,
  tick-driven multiplayer). Canvas/SVG game boards stay game-owned, since the board is
  the game, but the chrome, panels, pages, and transport around it are shared fibers.
  Hand-rolled per-game render or serve scaffolding is transitional and should be drawn
  down as these shared fibers mature — with the ambition that they become competitive
  with mainstream frontend and web-game-engine tooling, not just internally convenient.
- **A shared package registry is the reaching mechanism**, so it has to actually be
  reachable from every box and agent that needs it. Cross-directory imports happen
  through published packages, never through relative reaches across section boundaries.
