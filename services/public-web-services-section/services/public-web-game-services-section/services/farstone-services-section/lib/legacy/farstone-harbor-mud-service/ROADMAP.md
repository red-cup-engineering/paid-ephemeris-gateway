# farstone.561.group — Roadmap

The playable world and the live site.
Read alongside `DESIGN.md`, the world canon in `world/`, and the transport in `src/transport.ts`.

## What it IS

Farstone is **the harbor MUD that proves the stack works** — the walkable face of `@emsenn/fizzos` (and below it `@emsenn/computing` / `@emsenn/gaming` / `@emsenn/relationality`).
It is a small granite island in the Farr Archipelago: a working New England harbor town after the summer trade has gone, where the most interesting things that happen are tides, fog, ferry schedules held up by weather, water-quality disputes, and permits aging past their decision windows.
Deliberately not a fantasy place.
Its heart is that it **holds its contradictions** — a disputed hydrant, a contested permit, a feud under scarcity — rather than resolving them away, which is exactly what a charge-valued world is *for*.

The **durable world canon lives in `world/`** as **data, not code** — written to survive every future engine rewrite.
The site itself is *only transport*: it serves the web by streaming whatever pipes out of the package scripts.
The world logic lives in the packages; the site never models it.

## BUILT

- **The world bible** (`world/*.md`) — the version-controlled canon:
  - `README.md` — the index and the canon/non-canon split (governance reading vs.
    the playable MUD reading; one geography, one ecology).
  - `geography.md` — every named place, its description, and the connection map.
  - `biome.md` — bedrock, soils, vegetation, watershed, climate, tides, weather,
    wildlife, and the renewable resources actors draw on.
  - `inhabitants.md` — the citizens, municipal government, factions, and the
    harbor cast, every NPC read as a ludics design with traits, needs, stakes.
  - `lore.md` — history, themes, and above all the tone and voice to preserve.
  - `things.md` — items, wares, currency, the forge's materials and recipes, and
    the predicate-richness economy.

- **`world/harbor.json`** — the first structured slice of the playable world: engine-neutral plain JSON of rooms (with exits), items, and NPCs (with locations and tags).
  The MUD reading's seed; any engine can load it.
  Player starts at `harbor-quay` with 250 pennies.

- **`DESIGN.md`** — the canonical engine design: the thesis (a MUD is the theory wearing a walkable face), the Curry–Howard–Lambek-along-CGS spine, the architecture stack, the turn loop, the mechanics, and the build order.
  Read it before the code — the code is large and the dream is simple.

- **The pipe-transport site** (`src/transport.ts`) — the whole web layer.
  A `Script` is `params → pipe of bytes`; `transportApp` turns a table of named scripts into an `@emsenn/web` `App` where each route *streams* its script's stdout straight to the HTTP body with no materialization.
  Weirdly ancient (CGI / inetd / the Unix pipe: the program IS the endpoint) and super modern (streaming `AsyncIterable<Uint8Array>` all the way down).
  `src/index.ts` wires a landing page plus the transported routes; `src/server.ts` is a tiny bootstrap on `@emsenn/web`.

- **The playable layer** (plain ESM, runs with no build step) — proven this
  session by a real playthrough and a green smoke test:
  - `src/world-load.mjs` — `loadHarbor(bible)` → `{ world, content }`: pure; every
    place/containment in `harbor.json` becomes a `@emsenn/fizzos` `located-in`
    fact, every exit an `exit` fact (direction kept in `content`), the player
    dropped at `meta.playerStart`. World = the engine's settled truth; content =
    the prose the engine has no opinion about.
  - `src/play.mjs` — the command loop on the engine's verbs: `look` / `go`
    (perception + movement), `take` / `drop` / `give` (the linear `located-in`
    retraction — conservation is the engine's, not re-implemented here),
    `examine`, `inventory`, `exits`, `say`, `help`, `quit`. `step(state, input) →
    { state, output, quit }` is pure; natural phrasing resolves to ids.
  - `scripts/play.mjs` — the terminal: one game loop, three drivers (interactive
    REPL on a TTY, scripted transcript from argv, or from piped stdin).
  - `scripts/look.mjs` — pipes one room of the **real** harbor (loaded through the
    engine) as JSON; `node scripts/look.mjs the-boatyard` works.
  - `src/play.test.mjs` — **one** smoke test (7 assertions, `node --test`, green):
    a real playthrough asserting the mechanics on the engine (start on the quay,
    movement walks the real exit graph and rejects walls, `take`/`give` are the
    linear retraction/transfer, fixtures can't be taken, examine reads the fiber).

- **Live routes** (`src/index.ts`) — `/play?do=look;west;take rope` streams a fresh game's transcript; `/look?room=the-boatyard` streams a room as JSON.
  Each is just a row in the transport table piping a script — no response object plumbed through the server.

## NEXT

- **Stateful play over the web.** `/play` runs a fresh game per request today (stateless transcript — honest about what it is).
  Next: a session (serialized world keyed by a token) for browser continuity, and stream turns as they happen rather than a batch transcript — including a genuinely contested cell surfaced as held, per the engine's sole-writer tick.

- **The economy and shop verbs.** The bible prices wares and gives npcs purses and the player starting coin; add `buy` / `sell` / `list` as a linear transfer of coin against goods, both conserved by the engine.

- **Crafting at the boatyard.** Iron and oak are `linear-consumable`, hammer and saw `reusable`; `craft` is the linear tensor `A ⊗ B ⊸ C` — consume the stock, keep the tools, produce the blade.
  First place the `!
  `/linear distinction from `@emsenn/computing` earns its keep in play.

- **Grow verbs and NPCs from the world bible.** Drive new verbs and NPC behavior straight from `world/*.md` and `harbor.json`: the chandlery's wares, the boatyard forge's recipes, the ferry routes, and the named cast (Dax Pell, Sergeant Mara Quill, the marsh-witch) as ludics designs — growing the playable world by adding canon and a script, never by plumbing a new response object through the server.
