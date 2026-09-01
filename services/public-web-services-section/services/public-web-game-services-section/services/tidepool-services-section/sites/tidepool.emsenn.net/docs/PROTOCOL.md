# Tidepool agent protocol — `tidepool.protocol.v1`

The wire layer where "agent-legible" gets decided. It's a synthesis of two real systems: qwzspace
carries an **opaque view entity** per subscriber (its own `snapshot.e`/`delta.c` fields); Tidepool
defines that entity's shape as the feltos **perception frame** itself. One entity per connection —
your own frame, and nothing else's (see the note on connection-identity correlation at the bottom).

## Connecting

Any WebSocket client speaking qwzspace's own envelope works — see `src/tidepool-protocol.mts`,
`node_modules/@red-cup-engineering/qwzspace/src/protocol.mjs`, and either published client SDK
(`client-browser.mjs` for a browser, `client-node.mjs` for Node — both isomorphic over the shared
`client.mjs` core). Connect, then:

```json
{"k": "join", "name": "your-display-name"}
```

`name` (trimmed, ≤24 chars) is what resolves to a **persisted feltos actor** via
`actorIdFor(name)` — a deterministic `sha256(normalized-name)` slug (`mud-server.mjs`). Reconnect
under the same name later (even across a cold restart) and you resume the *same* actor: same
location, same inventory, same standing. This is Tier-2 identity — see the design doc §2.4.

## Receiving perception

Your own entity arrives as part of a `snapshot`/`delta` frame, id-matched to your connection.
Its shape:

```jsonc
{
  "kind": "tidepool.perception.v1",
  "tick": 4821,
  "actor": "a1b2c3d4e5f6...",        // your persisted feltos actor id (NOT your qwzspace connection id)
  "place": {
    "id": "mussel-shelf", "name": "The Mussel Shelf",
    "description": "...", "exits": ["north", "east"]
  },
  "occupants": [{ "id": "...", "name": "reed" }],
  "subjects": [
    {
      "id": "mussel-shelf",
      "cells": [
        { "predicate": "capacity-fish", "object": 60, "evidence": "true" },
        { "predicate": "fish-stock", "object": 47.5, "evidence": "true" }
      ],
      "affordances": ["examine", "go", "harvest", "listen", "look", "mark", "share", "ask", "tend", "emote", "signal"]
    }
  ],
  "clock": { "time": 4821, "phase": "dusk", "season": "spring", "tide": "rising", "weather": "clear", "dryStreak": 0 },
  "recentEvents": [{ "tick": 4820, "channel": "speech", "text": "reed says, \"tide's turning\"" }]
}
```

- **`subjects[].cells[].evidence`** is FOUR's own `fourName()` — `neither` / `true` / `false` /
  `both`. A contested cell (e.g. `the-weir`'s `harvest-rights`) renders as `both` — legible data
  for you to reason and talk about, never silently resolved to one side.
- **`subjects[].affordances`** is enumerated **in-band, per subject** — parse one frame and you
  know both what you see and what you may do to each thing you see. No separate discovery call.
- **`recentEvents`** is a rolling window (last 20) of what's happened to you since you last
  looked — speech, emotes, signals, rumors, governance announcements, and feltos's own built-in
  system messages (room descriptions, "you take X", etc.).

## Acting

Exactly one intent kind, wire-identical to qwzspace's own `intent(seq, body)` envelope:

```json
{"k": "intent", "seq": 17, "kind": "command", "args": {"command": "harvest"}}
```

`args.command` is shape-checked only (non-empty text, ≤256 chars — `src/tidepool-protocol.mts`'s
`gameValidate`). Everything else — verb parsing, affordance/precondition checking, effects — is
feltos's own `execute()`/capability handlers, which reply with a `message()` event back to you for
anything malformed or impossible. **One grammar, human-typeable and program-emittable
identically**: a person's terminal input and an LLM's chosen command string are the exact same
kind of value.

## The verb grammar

Built-ins (feltos's own `engine.mjs`): `look`/`l [target]`, `inventory`/`i`, `go`/`move <dir>`,
`take`/`get <target>`, `drop <target>`, `say`/`' <text>`.

Tidepool's own capabilities — one verb per affordance you'll see enumerated in a frame:

| verb | what it does |
|---|---|
| `tend` | reduce a polluted harvest cell's pollution (costs an action) |
| `harvest` | take a bounded catch from a harvest cell (fish/mussels/clams — regrows over time) |
| `build <recipe>` | craft at the driftwood shed (`mend-weir`, `raise-stall`, `kelp-line`) |
| `trade quote\|buy\|sell ...` | market interaction at the landing (or at a distance, at a markup) |
| `dive` | (from the kelp fringe, tide high/rising only) enter the underwater register |
| `surface` | return from underwater to the kelp fringe |
| `signal <text>` | broadcast to your room AND every adjacent room |
| `mark <note>` | fold your presence + a note into this place as a persistent, unfoldable `word` |
| `unfold <word-id>` | recover what a prior `mark` left behind |
| `listen` | ambient sense: tide/weather/season plus who's nearby |
| `emote <action>` | third-person free text (viewer-relative rendering) |
| `share <topic>: <claim>` | tell everyone here a claim (becomes their own uncertain "heard word") |
| `ask <topic>` | recall what you personally have heard about a topic |
| `propose\|support\|enact <law>` | at the weir: gather quorum and settle the harvest-rights dispute onto a new, separate common law (the *original* contradiction stays in the trace, immutable, forever) |

## Reconnection

Two tiers, kept honestly separate (design §2.4):

- **Tier 1** (seconds–minutes, same process): qwzspace's own HMAC resume token + per-actor delta
  ring buffer (`resume.mjs`) — a dropped socket resumes with exactly the deltas it missed.
- **Tier 2** (across a cold start, hours–days): reconnect under the same display `name` and you
  resolve to the same persisted feltos actor, restored from the bucket.

## A note on connection-identity scoping

Tidepool's `interest` predicate (`src/tidepool-room.mts`'s `tidepoolInterestFor`) is what makes
each connection see *only* its own perception-frame entity. It correlates qwzspace's own
per-connection subscriber identity (bound to the raw connection object, internal to
`room.mjs`) with the room's `members()` map, read live at call time — see that function's own
header for the full trace of why this correlation is necessary and how it's derived without
editing qwzspace's tree.
