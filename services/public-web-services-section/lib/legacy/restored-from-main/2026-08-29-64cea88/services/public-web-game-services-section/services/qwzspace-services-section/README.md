# @561-group/qwzspace

QuasiSpace (qwzspace) is the realtime webapp-game engine shared by Aletheon and other game
services, an homage to CrystalSpace. It sits between a game's domain logic and its transports.
Domain state, folding, and persistence are supplied through the queue, snapshot, and `runTick`
interfaces, so the package has zero runtime dependencies and no privileged local-package wiring.

## What it is

A fixed-tick transaction boundary over the append-only trace. Every tick the engine drains queued
player intents (single-writer), re-folds the touched subjects, and projects INTEREST-FILTERED
settled-section deltas to every subscriber.

- `subscribe(subject)` yields settled-section frames that re-fold on append — a reactive view over
  the trace.
- The engine projects interest-filtered deltas over the settled trace.
- The fixed tick is a TRANSACTION BOUNDARY, not a clock the logic depends on.

## Modules (import by subpath)

| subpath | what |
| --- | --- |
| `@561-group/qwzspace/tick-driver` | the setInterval cadence + overrun guard (single-writer) |
| `@561-group/qwzspace/intent-queue` | the validate-and-queue single-writer staging area |
| `@561-group/qwzspace/snapshot-manager` | the reactive view over the trace (full/delta + interest) |
| `@561-group/qwzspace/broadcast-hub` | the live-client set + per-tick push (transport-agnostic) |
| `@561-group/qwzspace/http-sse-server` | the SSE transport (POST intent + stream), zero-dep |
| `@561-group/qwzspace/http-ws-server` | the hand-rolled RFC 6455 WebSocket transport, zero-dep |
| `@561-group/qwzspace/protocol` | the wire shapes + encode/decode boundary (browser-safe) |
| `@561-group/qwzspace/create-server` | the composition root tying it all together |

## Lifted from

The two games solved the same realtime problem two ways; qwzspace lifts the union, cleaned to the
law, and drops the game-specific projections:

- ruinfold `server/{loop,http,sse,actions}.mjs` + `engine/snapshot.mjs`
- aletheon `server/{app,http,net/ws}.mjs` + `shared/{protocol,encoding}.mjs` + `server/net/session.mjs`'s
  interest-filtered `sync()`.

Aletheon is wired to the WebSocket carrier and tick driver. Ruinfold remains the historical second
source from which the shared boundary was extracted.

## Tests

```
npm test    # runs the six prove-*.mjs proofs (82 assertions)
```
