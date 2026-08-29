---
title: Fleet Definition of Done
description: "The standard every game/service lane must meet before it is called done. Audience: every implementing agent and the board. A lane that meets its tests but not this document has produced a foundation, not a product."
date-created: 2026-08-19
date-updated: 2026-08-19
type: specification
authors:
  - claude-fable-5
keywords: ["fleet", "operations", "quality"]
---

# Fleet Definition of Done

The headline criterion, in one sentence: **a stranger can visit a URL and play for
twenty minutes without hitting a wall, and nothing they do can hurt us or the other
players.** Everything below unpacks that sentence. A lane's final verify phase must
check this document explicitly and report per-item PASS / GAP; "GAP, deferred by the
board" is an acceptable answer — silence is not.

## 1. Reachable

- Deploys to the fleet's designated hosting target by a documented, repeatable,
  git-free command (git is forbidden on the dev machine). "Works on localhost" is a
  build artifact, not a deliverable.
- Serves over HTTPS on a real hostname; loads on a mid-range phone; passes PWA
  installability (manifest + service worker) where the product benefits from it.
- First contentful paint under 2s on ordinary broadband; the interactive surface
  responds in under 100ms.

## 2. Inhabitable

- Identity via the fleet's shared account pattern — not per-game hand-rolls. Guest
  play is welcome where the design allows it, but anything scored, paid, ranked, or
  persistent binds to fleet identity.
- Player state survives process restarts and machine reboots, lives at the hosting
  target (not only a laptop), and has a stated backup story.
- Sessions are durable: close the tab, come back, continue.

## 3. Honest under adversaries

- Anything scored or rewarded is server-verified (the house pattern: deterministic
  engines + submitted intent/move logs, replayed to verify — never trusted client
  totals).
- Rate limits and size caps on every write endpoint; a stated abuse posture for the
  reward loop (payouts never exceed verified revenue; earn-only; no wagering).
- No secrets in client bundles; no PII beyond what the feature strictly needs.

## 4. Full enough to hold attention

- A stated content-volume minimum appropriate to the genre (levels, problems,
  dungeons, lessons) AND a working authoring pipeline such that adding the next
  unit of content is data, not engineering.
- A tuning pass has actually been played: the lane's report must include notes from
  driving the real product loop, not only test output.

## 5. Kind

- Accessibility as a requirement: keyboard-complete, screen-reader announcements for
  state changes, no color-only signals, prefers-reduced-motion respected.
- Retention mechanics are non-hostile: kind streaks, no dark patterns, cosmetic-only
  monetization surfaces, transparent odds wherever chance exists.

## 6. Operable

- One document per service: how to deploy, how to roll back, where state lives, how
  to read the logs, what the known failure modes are.
- READMEs state only what is true; claimed test counts are real counts.

## Standing gaps requiring board decisions

- Hosting target for the fleet (Cloudflare-first vs the box vs other) — decides §1.
- Fleet identity provider (promote the flickering-delve/onestone accounts pattern to
  a shared package vs adopt something else) — decides §2.
- Publish posture (ship early and iterate in public vs polish behind the fence).
