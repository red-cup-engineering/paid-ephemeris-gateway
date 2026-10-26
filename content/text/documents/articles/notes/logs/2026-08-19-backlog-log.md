---
title: Backlog Log
description: Open items across the game fleet with their completion conditions, and work that was discussed but never started.
date: 2026-08-19
keywords: ["gaming", "enterprises", "backlog"]
---

# Backlog Log

## Open items

| Item | Completion condition | State |
|---|---|---|
| qwzspace old-path compatibility symlink (former gaming-services-section location) | Remove after the MUD-hardening lane lands aletheon/ruinfold repoints and the game-homes move lands, then sweep references | Open |
| cold-red-gate deeper reclaim (6 old kernels + apt autoremove, ~1-2GB) | Owner has authorized broad cleanup but not package-removal | Awaiting owner |
| Owner follow of instance@ap.561.group completing | Their instance's retry arrives post-Follow/Accept fix; check the followers collection | Awaiting retry |
| Second VPS (Oracle console / Hetzner chat.561.group key) | Owner checks console or supplies key | Awaiting owner |
| NotebookLM steps 2-4 | Owner browser-login cookie | Awaiting owner |
| Stoke pacing rebalance | Owner playtest judgment (numbers in its DESIGN.md) | Awaiting owner |
| ruinfold qwzspace repoint | N/A — ruinfold carries no qwzspace dependency; it was never a consumer (footing's daily-tournament rails, not qwzspace, are its shared surface) | Closed, n/a |
| aletheon qwzspace repoint | Done 2026-08-20: `@561-group/qwzspace@0.0.2` → `@red-cup-engineering/qwzspace@0.4.1` in `server/app.mjs` (the ws-server/tick-driver surface — `attach`/`staticHandler`/`startTickDriver` — kept identical signatures across the version gap, confirmed against real source, not assumed); 49/51 local suite (the 2 ws-session failures reproduce identically against 0.0.2 under repeated runs — a pre-existing client-side flake, not this repoint); live on `aletheon-00010-muk`, 100% traffic, frontdoor-walked clean (21 URLs, 0 MISS/BADMIME), public-domain WS session round-trip confirmed | Done |

## Stopped, ready to resume

Two lanes were stopped at the owner's request with their build scripts persisted:

1. **Tidepool** — the LLM-native MUD (the owner's day-one ask; never otherwise started).
2. **Equivo build** — design complete and verified; zero code exists.

## Discussed, never started

- **Today page + cast v1** — suite front door with every daily seed in one place; 3 named
  agent players with authored personas playing real dailies via engine APIs, play-graph
  logged from day one (see 2026-08-19-note-on-the-suite-and-the-studio.md §5 and wilder-conceptions-01 §3).
- **SHRIMP proved-strand build** — shrimp-ecology-brief-v2 §3 build order (network-sheaf
  consensus, witness journal, GAME fixed-point layer, holonomy-repair verb).
- **Weiqi Phase 2** — the market teardown is a ready spec (parity vs Android Go apps: SGF
  library play, problem sets + SRS into Learn, bot ladder).
- **Real ZBD settlement provider** — zbd-micropayment-rails.md is the spec; energy-bank
  0.1.1 ships only the interface + stub adapter.
- **Durante/abrash recovery** — the legacy Quake-like and its raycaster engine as a
  browser/terminal revival lane.
- **Aletheon tests + README** — runnable since the kernel consolidation; still untested.
- **Flickering-delve content deepening** — engine solid; content volume never addressed.
- **Okaga as an actual game** — setting + legacy game dir exist; no design note yet.
- **Lantern pebble-verdict exposure** — queued in Lantern's ROADMAP.md; not built.
- **Energy-tiling shared board** — deliberately staged behind Crucible's economy pilot.
- **On-chain "regional servers," deployment, NotebookLM steps 2-4** — parked behind
  owner input (NotebookLM needs the owner's browser cookie).
