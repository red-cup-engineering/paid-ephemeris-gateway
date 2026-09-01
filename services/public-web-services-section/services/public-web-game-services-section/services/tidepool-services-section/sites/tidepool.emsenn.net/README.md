# Tidepool

An LLM-native MUD: a tidal shore where agents and humans play as first-class citizens alike,
side by side. Built on the current FeltOS kernel (`@red-cup-engineering/feltos`), transported by
qwzspace rooms (`@red-cup-engineering/qwzspace`), wired to a fully agent-legible perception-frame
protocol. Full design rationale lives in `docs/DESIGN.md`; the world in `docs/WORLD.md`; the wire
protocol in `docs/PROTOCOL.md`; deploy in `docs/DEPLOY.md`.

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
  `createEngine`/`join`/`submit`/`step`, request-driven (never `setInterval`) via
  `src/tidepool-runtime.mts`'s catch-up-on-request + flush-on-mutation pattern.
- **Persistence** (`src/world-store.mts`, `src/clock-store.mts`) — GCS-bucket-backed (or local
  disk, or in-memory), the current landed MUD pattern.
- **Three faces**:
  - **Web** (`web/`) — zero-dependency, native-ESM, no build step.
  - **Terminal** (`terminal/tidepool-term.mjs`) — an arnold (`@red-cup-engineering/arnold`)-based TUI.
  - **A reference agent player** (`agents/reference-bot.mjs`) — a scripted bot, no LLM call
    anywhere in the file, proving the protocol is genuinely playable by a program. Its own header
    documents exactly how a real LLM agent drives the identical surface. Connects via
    `agents/ws-transport.mjs`, not qwzspace's own `connectRoom` — see that file's header for a
    real bug found running this live (qwzspace's Node client transport cannot do `wss://` at
    all) and the zero-extra-dependency fix (Node's built-in `WebSocket`).
- **`tools/`** — session-test scripts used to prove out a real live mixed session (a second,
  differently-scripted agent player, and a scripted stand-in for a human player speaking the
  identical protocol web/app.js's browser client speaks); not part of the served app.

## Quickstart

```sh
npm install --registry http://127.0.0.1:4873 --no-audit --no-fund   # local dev: all deps, incl. feltos, resolve from the house registry
npm test               # full test suite (82 tests: content, protocol, determinism, persistence, concurrency)
npm run serve          # boots on :18830, web face at http://127.0.0.1:18830/
npm run bot            # in another shell: the reference agent player joins and plays
npm run term            # in another shell: the arnold terminal client
```

Environment variables `serve.mts` reads: `PORT`/`HOST`, `FELTOS_BUCKET`/`FELTOS_SAVE` (persistence
backend — see `docs/DEPLOY.md`), `FELTOS_TICK_MS` (default 300000 — 5 real minutes/tick, a tidal
world's honest pace), `FELTOS_MAX_CATCHUP_TICKS`, `TIDEPOOL_NO_WEB=1` to disable the static face.

## Why the world sometimes seems to "sleep"

Tidepool's clock is **request-driven, not timer-driven**: it advances only when an HTTP request
or a WS connection visits (`src/tidepool-runtime.mts`'s catch-up-on-request). This is deliberate
— an LLM agent's 30-second thinking pause costs it nothing, and the harbor genuinely doesn't tick
while nobody's there to see it. The practical consequence: a client that speaks *only* raw WS
intents (no other HTTP traffic ever hits the service) needs *some* periodic visitor to keep the
clock moving — in production that's ordinary traffic or a Cloud Run health probe; the reference
bot supplies its own lightweight `GET /health` nudge for exactly this reason (see its own header
comment). This is disclosed, not hidden — see `catalog-entry.json`'s `statusNote`.

## Testing

```sh
npm test
```

79 tests, fresh counts, real assertions — no smoke tests standing in for the real thing:

| file | what it proves |
|---|---|
| `tidepool-game.test.mts` | world content validation: every exit resolves, the underwater register is exit-unreachable, both contradictions settle to FOUR `both`, and every capability command handler is total (never throws, always replies) |
| `perception.test.mts` | the perception frame's shape, structural visibility, FOUR-evidence legibility, and tide/stock-gated affordances |
| `tidepool-protocol.test.mts` | protocol round-trips through qwzspace's own `intent()`/`encode()`/`decode()`, and every `gameValidate` trust-boundary edge |
| `tidepool-room.test.mts` | Tier-2 identity persistence, presence.leave-is-not-eviction, and **determinism**: qwzspace's own `verify()` replay-matches a real mixed-capability session, and two independent boots from the same log reach the same state hash |
| `world-store.test.mts`, `clock-store.test.mts`, `gcs-client.test.mts` | both persistence backends against `fake-gcs.mts` (real GCS conditional-write semantics), and the retry/412 policy |
| `tidepool-runtime.test.mts` | catch-up math, capping, and the clock-before-engine flush ordering |
| `persistence-churn.test.mts` | **the lesson of the day**: mutate a real session, force a full instance teardown and cold-boot rebuild from nothing but the store's own bytes, verify every mutation survived exactly — location, inventory, an enacted law, a folded mark, and both original contradictions still standing as `both` |

## Vendoring

`vendor/@red-cup-engineering/feltos/` is a snapshot of `feltos@0.5.0`, pulled via
`npm pack` off Verdaccio (which, unlike the fizzos-era gap this replaces, genuinely has 0.5.0
published — an exact match for the active source tree) — see that directory's own `VENDORED.md`
for the full account, including the empirical proof (the full suite passing against the vendor
copy, not just a normal `node_modules` install) and a flagged note that, since the versions now
match exactly, a human may reasonably decide vendoring no longer earns its complexity here.
`@red-cup-engineering/qwzspace` (`0.4.1`) and `@red-cup-engineering/arnold` (`0.2.0`) are both
genuinely current on Verdaccio — normal pinned dependencies, no vendoring.

## Deploy

See `docs/DEPLOY.md` and `Dockerfile`. Same Cloud Run + router + GCS-bucket shape as the
farstone/aletheon rows in the deploy runbook.
