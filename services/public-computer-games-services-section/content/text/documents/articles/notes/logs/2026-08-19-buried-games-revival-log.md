---
title: Buried Games Revival Log
description: Recovery, repair, and deploy status for QwzSpace, Aletheon, and the active (third-generation) Farstone build.
date: 2026-08-19
keywords: ["gaming", "enterprises", "aletheon", "farstone", "qwzspace", "deploy"]
---

# Buried Games Revival Log

Three real trees under `gaming-services-section` — QwzSpace, Aletheon, and the active,
third-generation Farstone build — were found, run, repaired where needed, and played.

## QwzSpace

A zero-dependency realtime game-server toolkit (intent queue, snapshot/interest manager,
broadcast hub, fixed-tick driver, SSE + WebSocket transports) — the substrate Aletheon's
server is built on, not a game itself. No repair was needed. `npm test`: 82/82 assertions
pass across six `prove-*.mjs` suites. A live WebSocket exercise confirmed the tick loop,
delta frames, and chat events fire correctly. It has no persistence layer by design —
games own their own state, QwzSpace only moves it. Only Aletheon currently wires it as a
consumer; the SSE transport is tested but has no consumer in this estate. QwzSpace is a
library, not a service — it has nothing of its own to deploy.

## Aletheon

A browser 3D fantasy MMORPG with a four-valued-bilattice world-truth model (unknown /
alive / slain / contradiction-held), a from-scratch WebGL2 client, and a hand-rolled RFC
6455 WebSocket server running a 15Hz tick loop (combat, claims/altars, illocutionary
speech acts, marks, powers, economy). No repair was needed to run it — dependencies were
already resolved against Verdaccio. A live play session confirmed combat, altar evidence
accumulation, and chat broadcast all work.

Deployed and live at `https://aletheon.561.group/`. A 30/30 test suite was written before
deploy (none existed before). Persistence is GCS-bucket-backed
(`ALETHEON_BUCKET=five-six-one-aletheon`), running pinned to one always-on instance since
world state is in-memory. A live redeploy churn found a real bug still open: unbounded log
growth causes an OOM crash-loop within roughly 20 minutes of ordinary traffic against the
256Mi memory limit — not yet fixed.

## Farstone (active build, third generation)

A text MUD — a walkable New England harbor town on `@red-cup-engineering/fizzos`, with no
legacy adapter (player commands enter the ordered FizzOS engine directly). Distinct from
both the tab/old-fizzos legacy MUD Farstone and the pyfars governance-polity Farstone that
share its name and setting. No repair was needed; its one dependency is a live symlink
into the current fizzos tree. `npm test`: 7/7 pass, including a replay-exactness test
("eight Farstone years remain replay-exact with a bounded active trace"). A live REST play
session confirmed movement, exact-display-name item handling, speech, and unattended
autonomous world-clock/Director activity (tick and world-assertion counts climb with zero
player input).

Deployed and live at `https://farstone.561.group/` (no HTML frontdoor — `/health` is the
liveness check; `/connect`, `/command`, `/events` are the real play surface). Persistence
is GCS-bucket-backed (`FIZZOS_BUCKET=five-six-one-farstone`) rather than a pinned
always-on instance. A live redeploy churn found a real gap beyond the local-disk-only
caveat this note originally raised: Cloud Run's default per-request CPU throttling means
the autosave timer may not run at all during an idle stretch, so a redeploy during idle
traffic can lose more than one save interval of state — not yet fixed. Command syntax
remains genuinely unforgiving for a first-time player (bare direction words fail; `take`
needs the exact display name including its article) — a real UX gap, not a bug.

Full deploy evidence and commands for both live churns are in the
[deploy runbook](../2026-08-19-note-on-deploy-runbook.md).
