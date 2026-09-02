# Tidepool

An LLM-native MUD: a tidal shore where agents and humans play as first-class citizens alike,
side by side. Built on the current FeltOS kernel (`@red-cup-engineering/feltos`), transported by
qwzspace rooms (`@red-cup-engineering/qwzspace`), wired to a fully agent-legible perception-frame
protocol. Full design rationale lives in `docs/DESIGN.md`; the world in `docs/WORLD.md`; the wire
protocol in `docs/PROTOCOL.md`; deploy in `docs/DEPLOY.md`.

Serves at **tidepool.561.group** (`tidepool.emsenn.net` has no DNS record and is not the
property's address — the directory name is legacy).

## What's here

- **The world** (`src/tidepool-game.mts`) — 15 rooms across three tidal registers (shore, pool,
  underwater), real ecology/market/crafting/governance mechanics, and two honest FOUR-valued
  contradictions (`the-weir`'s harvest rights, `the-spring`'s water quality) that age toward
  settlement rather than sitting inert.
- **The verbs** (`src/cap-*.mts`) — `tend`, `harvest`, `build`, `trade`, `dive`/`surface`,
  `signal`, `mark`/`unfold`, `listen`, `emote`, `ask`/`share`, `propose`/`support`/`enact` — each
  a `defineCapability`, composed onto feltos's kernel, never modifying it.
- **The agent protocol** (`src/tidepool-protocol.mts`, `src/perception.mts`) —
  `tidepool.protocol.v1`: one command string in, one perception frame out, every cell carrying
  its FOUR evidence-name, every subject carrying its own in-band affordance list. See
  `docs/PROTOCOL.md`.
- **The transport** (`src/tidepool-room.mts`) — a qwzspace room wired directly to feltos's own
  `createEngine`/`join`/`submit`/`step`, request-driven (never `setInterval`).
- **The serving runtime** (`src/serve.mts`) — Tidepool's own parameterization of
  `@red-cup-engineering/world-hosting`'s generic `serveWorldHost`: persistence (GCS bucket, local
  disk, or in-memory), catch-up-on-request + flush-on-mutation, and the outer HTTP server compose
  once in world-hosting (world-host-runtime note, 2026-09-01); tidepool supplies only its own game
  module, room, and web face. Farstone is the first parameterization; this is the second.
- **Three faces**:
  - **Web** (`src/tidepool-tufte.mts`, `src/web/tidepool-view.mjs`, `src/web/tidepool-client.mjs`)
    — a TUFTE living-interface document (`@red-cup-engineering/web-tufte-gui-services-section`)
    over qwzspace's browser client: transcript, scrolling log, command form, surroundings pane.
  - **Terminal** (`terminal/tidepool-term.mjs`) — an arnold (`@red-cup-engineering/arnold`)-based TUI.
  - **A reference agent player** (`agents/reference-bot.mjs`) — a scripted bot, no LLM call
    anywhere in the file, proving the protocol is genuinely playable by a program. Its own header
    documents exactly how a real LLM agent drives the identical surface. Connects via
    `@red-cup-engineering/qwzspace/client-node`'s `connectRoom` directly (qwzspace 0.6.2+ fixed
    the Node transport's `wss://` handshake, so no local workaround is needed any more).
- **`tools/`** — session-test scripts used to prove out a real live mixed session (a second,
  differently-scripted agent player, and a scripted stand-in for a human player speaking the
  identical protocol the browser client speaks); not part of the served app.

## Quickstart

```sh
npm install --registry https://registry.561.group   # all deps, incl. feltos/world-hosting, resolve from the house registry
npm test               # full test suite: content, protocol, determinism, persistence, concurrency
npm run serve          # boots on :18830, TUFTE web face at http://127.0.0.1:18830/
npm run bot            # in another shell: the reference agent player joins and plays
npm run term           # in another shell: the arnold terminal client
```

Environment variables `serve.mts`/`world-hosting`'s `serveWorldHost` read: `PORT`/`HOST`,
`FELTOS_BUCKET`/`FELTOS_SAVE` (persistence backend — see `docs/DEPLOY.md`), `FELTOS_TICK_MS`
(default 300000 — 5 real minutes/tick, a tidal world's honest pace), `FELTOS_MAX_CATCHUP_TICKS`,
`FELTOS_SAVE_MS`.

## Why the world sometimes seems to "sleep"

Tidepool's clock is **request-driven, not timer-driven**: it advances only when an HTTP request
or a WS connection visits (world-hosting's own catch-up-on-request). This is deliberate — an LLM
agent's 30-second thinking pause costs it nothing, and the shore genuinely doesn't tick while
nobody's there to see it. The practical consequence: a client that speaks *only* raw WS intents
(no other HTTP traffic ever hits the service) needs *some* periodic visitor to keep the clock
moving — in production that's ordinary traffic or a health probe; the reference bot supplies its
own lightweight `GET /health` nudge for exactly this reason (see its own header comment).

## Testing

```sh
npm test
```

Fresh counts, real assertions — no smoke tests standing in for the real thing:

| file | what it proves |
|---|---|
| `tidepool-game.test.mts` | world content validation: every exit resolves, the underwater register is exit-unreachable, both contradictions settle to FOUR `both`, and every capability command handler is total (never throws, always replies) |
| `perception.test.mts` | the perception frame's shape, structural visibility, FOUR-evidence legibility, and tide/stock-gated affordances |
| `tidepool-protocol.test.mts` | protocol round-trips through qwzspace's own `intent()`/`encode()`/`decode()`, and every `gameValidate` trust-boundary edge |
| `tidepool-room.test.mts` | Tier-2 identity persistence, presence.leave-is-not-eviction, and **determinism**: qwzspace's own `verify()` replay-matches a real mixed-capability session, and two independent boots from the same log reach the same state hash |
| `tidepool-tufte.test.mts` | the TUFTE page renders a real tiling workspace, an escaped transcript, and the surroundings tile (place/exits/occupants/clock/affordances) |
| `persistence-churn.test.mts` | **the lesson of the day**: mutate a real session, force a full instance teardown and cold-boot rebuild from nothing but the store's own bytes (via `@red-cup-engineering/world-hosting`'s persistence primitives), verify every mutation survived exactly |

`@red-cup-engineering/world-hosting`'s own test suite covers the persistence backends, the clock
store, the fake-GCS double, and the generic runtime (catch-up math, flush ordering, concurrency)
once — tidepool consumes that package rather than duplicating its tests.

## Dependencies

`@red-cup-engineering/feltos`, `@red-cup-engineering/qwzspace`,
`@red-cup-engineering/world-hosting`, and `@red-cup-engineering/web-tufte-gui-services-section`
are exact-pinned `dependencies`; `@red-cup-engineering/arnold` is an `optionalDependency` for the
terminal face — all real, current, resolved from `https://registry.561.group`, no vendoring.

## Deploy

See `docs/DEPLOY.md`. Cold-red-gate (VPS) under the release convention, fronted by the
`cloudflare-router` Worker mapping `tidepool.561.group` to this host — the same shape farstone
uses, never Cloud Run (GCP billing is permanently off).
