# @561-group/farstone

Farstone is a small New-England harbor **MUD**, built on the `tab` EAVT world-engine (`@561-group/tab`) and the **FizzOS** MUD driver (`@561-group/fizzos`) — a first-class game on the engine, the way `ruinfold` is.
The world IS its append-only EAVT trace, folded (*settled*) every tick; negative evidence is the converse predication, never a polarity field, so a fact asserted both ways settles to **⊤** — a contradiction the world holds as a *situation*.
Building Permit #23 ages under its own clock past its decision window and goes ⊤ on its own; nobody coded "permits go bad," the bilattice fold produced it.

`tab` is the general ontology / existential engine and ships **no** game content.
Farstone is that content — extracted here so the engine stays engine-only.

## Run it

```sh
npm start                       # build the harbour world + serve it over HTTP/SSE on :18793
node <red-cup-engineering/public-computer-services-section>/services/public-web-services-section/lib/legacy/restored-from-main/2026-09-18-5cc6364/services/public-web-game-services-section/services/farstone-services-section/lib/legacy/2026-08-17-windows-561-group-apps-games-farstone/scripts/farstone.mjs [dir] [--http 18793] [--host 127.0.0.1] [--start newcomer-landing]
```

Open `http://localhost:18793` in a browser to play; or watch the world-event firehose: `curl -N http://localhost:18793/events?topics=market,combat,chat`.
The world dir defaults to `./world` (gitignored runtime state) and is rebuilt only when absent, so player traces accrue across restarts — remove the dir to reset.

## The worlds

Four authored worlds ship here; each is a deterministic builder (every `t` is a counter — no `Date.now` / `Math.random`, so replay is byte-for-byte):

| world | what it is |
|---|---|
| `farstone/`         | the **seed island** — Mt Farstone over one watershed, the Farr River to Farston Harbor, a tidal marsh, a ferry to the mainland. Grounded, municipal, salt-worn. Built by `farstone/build-farstone.mjs`. |
| `farstone-harbor/`  | **"quarrel on the quay"** — a dense ~30-room hand-authored world: a tutorial cove, a working off-season waterfront with a named cast to talk to / trade with / fight, a chapel, a guild, a lighthouse, a quarry and marsh. The world the `bin` serves. |
| `farstone-tale/`    | **"the off-season"** — a designed, lint-clean DSL world with a premise, a named cast with goals, and a central tension `tab`'s systems (needs / mood / scarcity / the tick / `intends`) turn into stories without scripting. |
| `farstone-wild/`    | a **generated** world — 40 areas across 5 biome-regions, 16 NPCs, 20 resources, 20 items, produced deterministically by `tab`'s `worldgen` (seed 1). |

## Test

```sh
npm test    # prove-farstone (the seed island builds, ticks to ⊤, the harbour world builds) +
            # prove-demo-world (the designed tale is connected, peopled, tense, and live)
```

## Depends on

- `@561-group/tab` — the EAVT engine: `being` / `doing` / `changing` / `observing` / `ticking`, the on-disk substrate, the web/SSE transport, and the authoring DSL (consumed by name).
- `@561-group/fizzos` — the FizzOS MUD driver over tab (practicing / fighting / saying / …).
- `@561-group/computer` — the voidmath computer the engine and driver ride.
