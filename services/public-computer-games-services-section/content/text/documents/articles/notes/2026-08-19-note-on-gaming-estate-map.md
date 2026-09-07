---
title: Gaming Estate Map
description: "The single legible map of the entire 561 gaming estate: every built game/engine asset with its real location, status, and test count; every planned-but-unbuilt game with its stub; the shared substrate (cartridge, energy-bank, math, storefront, ActivityPub) and where each lives. Pointers everywhere — no tree moves."
date: 2026-08-19
keywords: ["gaming", "enterprises", "index", "estate", "red-cup-engineering"]
---

# Computer Gaming Systems Services Section

This is Red Cup Engineering's answer to "what game stuff do we have, and where is it." It is an
**orchestrator section**: a map and thin stubs for what's genuinely unbuilt. It moves nothing.
Every built asset named below stays exactly where it already lives; every path in this
document is a pointer, not a copy.

Sibling to `computer-code-engineering-services-section`, `computer-data-engineering-services-section`,
`computer-networking-engineering-services-section`, and `computer-systems-services-section` under
`computer-services-section`.

The full detail this map is drawn from — complete tables, per-asset test runs, proof-file
checks — lives in
[the built-asset and planned-game inventory](2026-08-19-note-on-built-asset-and-planned-game-inventory.md).
This is the summary and the map; that note has the detail.

## 0. How to read this map

- **Paths are relative to `561-group/services/`** unless given in full, to keep the tables
  legible. The inventory note gives fuller relative paths; use `find` from the repo root if a
  short path is ambiguous.
- **Status vocabulary**, used consistently: `landed` (shipped, tests passing), `in-build` (real
  code + tests on disk, actively being built, often by a workflow this document does not
  touch), `mid-build (read-only)` (real code on disk, inventoried but not executed), `dormant`
  (a section that exists but holds no code, only content/notes), `built (legacy archive,
  recovery candidate)` (real working code once existed, now sits in a `lib/legacy/` or
  `_archive/` snapshot, not wired into anything live), and `planned — no code exists` (named in
  the design corpus, nothing built).
- **Every test count is either "verified" (run directly against the tree) or "claimed"
  (copied from a README inside a read-only tree, not independently executed).** Never read a
  bare number in this document as verified unless it says so.

## 1. Shelves within the shelf

The owner's own framing for the whole estate (`2026-08-19-note-on-the-suite-and-the-studio.md` §3): not a genre-tag
catalog but named shelves, each reincarnating a specific CD-suite disc from memory.

| Shelf | Games | The CD it reincarnates |
|---|---|---|
| The Card Table | solitaire, gambling/probability series | Hoyle Casino |
| The Puzzle Den | TileSlots (onestone), Crucible, flickering-delve | Entertainment Pack / puzzle discs |
| The Study | weiqi + Learn, Lantern, Equivo | Chessmaster / edutainment discs |
| The Deep | ruinfold daily, later the undersea MUD and the Commons | the MUD/BBS door-games lineage |
| The Stars (later) | Okaga-set games; credits-as-warp | the space-sim disc |

Everything below is organized by build status first, shelf noted per row, because "is it real yet"
is the more load-bearing question for an orchestrator map than genre.

## 2. Now — landed and playable

| Shelf | Game | Real location | Tests | Docs |
|---|---|---|---|---|
| Puzzle Den | flickering-delve | `public-services-section/.../public-computer-games-services-section/services/flickering-delve-service` | **63/63** verified | README, ARCHITECTURE.md, DESIGN.md, ROADMAP.md |
| Puzzle Den | TileSlots (onestone) | `.../public-computer-games-services-section/services/onestone-service` | **249/249** verified | README, ARCHITECTURE.md, DESIGN.md, ROADMAP.md, TILESLOTS-DESIGN.md |
| Study | Lantern | `.../public-computer-games-services-section/services/lantern-service` | **74/74** src + **10/10** web, verified | DESIGN.md, web/README.md |
| Card Table | Solitaire | `.../public-computer-games-services-section/services/solitaire-service` | **59/59** verified | README.md, DESIGN.md |
| Study | Weiqi kernel + Learn | `science-services-section/.../board-games-services-section/services/weiqi-services-section` (`apps/weiqi-kernel`, `services/weiqi-platform/apps/weiqi-learn`) | kernel **71/71 claimed** (read-only, not independently run); Learn runs only via local `npm run serve`, not deployed to a subdomain | README.md, weiqi-kernel-constitution.md, weiqi-platform-constitution.md |

Weiqi's **Play** face (real-time/competitive) is declared in `weiqi-platform-constitution.md` but
not admitted or coded — this is a face of an already-active, already-mapped section, not a
standalone unbuilt game, so it is **not stubbed here**; the pointer above is the whole story.

## 3. Next — in-build, pointer only (no stub — the real tree is the answer)

These are actively being built, in most cases by a lane this map does not touch. An in-build
or landed-elsewhere game is never stubbed — a stub next to a real, growing tree would be a
stale lie the day after it's written.

| Shelf | Item | Real location | State |
|---|---|---|---|
| Puzzle Den | Crucible ("Hinterland") | `.../public-computer-games-services-section/services/crucible-service` | In-build; DESIGN.md, README.md, src/, web/ confirmed on disk. Tree not read further (concurrently-building lane) |
| Deep | Ruinfold (daily roguelike) | `public-computer-games-services-section/services/ruinfold-services-section/apps/ruinfold` | Specification-and-skeleton: engine modules exist (`src/engine/*`), `src/tests/` empty, no server/client wired |
| — | Cartridge (`@561-group/cartridge`) | `public-services-section/services/public-computer-services-section/services/public-computer-games-services-section/services/cartridge` | In-build; real `.mjs`/`.d.ts`/`.test.mts` on disk. Not yet wired into any game (`catalog.json`: every entry `cartridgeWrapped: false`) |
| — | Energy Bank (`@561-group/energy-bank`) | `public-services-section/services/public-computer-services-section/services/public-computer-games-services-section/services/energy-bank` | In-build; real source+tests on disk. No fleet service posts a payout entry to it yet |
| — | semiotic-exchange-chain family | `.../computer-systems-services-section/services/semiotic-computer-system-services-section/services/semiotic-exchange-chain-services-section` (+ `modeled-union-dimension`, `sovereign-membrane-admission-service`) | Landed spec + 3 packages, **30/31** verified across the family (the 1 fail is a documented, expected `ERR_MODULE_NOT_FOUND` for an unwritten package) |
| — | FeltOS MUD kernel | `.../computer-systems-services-section/services/computer-mud-services-section/apps/fizzos` | Landed, **59/60** verified (1 SIGTERM-handling test fails, possibly sandbox-specific) |
| — | ActivityPub server | `.../computer-networking-engineering-services-section/services/activitypub-services-section` | Landed, **50/50** verified. No public deploy target — see the inventory note §17 and §9 below |

## 4. Now/Next — the shared substrate

The load-bearing packages and infrastructure every game above rides or is meant to ride.

| Substrate piece | Real location | State |
|---|---|---|
| **@561-group/cartridge** — manifest/intent-log/replay contract | `public-services-section/services/public-computer-services-section/services/public-computer-games-services-section/services/cartridge` | In-build, 74/74 own tests verified |
| **@561-group/energy-bank** — double-entry ENERGY ledger, pluggable settlement | `public-services-section/services/public-computer-services-section/services/public-computer-games-services-section/services/energy-bank` | In-build, 79/79 own tests verified |
| **@lenticule-science/metrologic** — bilattice/obstruction/spectral/Chu-space core every game's mechanics cite | `engineering-services-section/.../science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/apps/metrologic` | Landed, 64/64 verified |
| **play.561.group** — the Shelf/Storefront, catalog reader | `public-services-section/services/public-computer-services-section/services/public-computer-games-services-section/sites/play.561.group` | Landed, 6/6 verified. Reframed as "the CD-suite reborn" (`2026-08-19-note-on-the-suite-and-the-studio.md`); named-shelf reorg, a shared "Today" page, and cast v1 are directives, not yet built |
| **ActivityPub federation** — the substrate the gamified-Fediverse-client vision would run on | `.../computer-networking-engineering-services-section/services/activitypub-services-section` | Landed, 50/50 verified, no reachable public deploy yet |
| **Self-Education Platform** — corpus-compiler/FSRS/Checker chassis under Lantern, Equivo, weiqi-Learn | not a separate service — "what `lantern-service/src/` already substantially is, generalized in place" | Specified (`self-education-platform-design.md`); the pluggable `Checker` interface has no code yet |
| **ZBD micropayment rails** — Lightning payout adapter, ads-fund-payouts ledger policy | not built | Specification only (`zbd-micropayment-rails.md`); no fleet service posts a `liabilities:*`/`expenses:payout:*` entry yet |
| **The cast** — recurring agent players sharing the intent-log API | not built | Named directive (`2026-08-19-note-on-the-suite-and-the-studio.md` §5); no code |
| **The Today page** — one page, every daily game's puzzle | not built | Named directive; gated on two-or-more daily games shipping (only ruinfold is daily-seeded, and it isn't shipped) |
| **Cross-cutting math proposals** — computed `regime` field on `CartridgeManifest`; Carrier Audit discipline; isostatic org-chart check | Carrier Audit is partially shipped as text in `2026-08-19-note-on-house-specification-standard.md` §8; the other two are parked design items | See the inventory note, "Cross-cutting math/design proposals" |

## 5. Planned — no code exists (stubs created in this section)

Every one of these got a thin `services/<name>-service/NOTE.md` stub in this section: honest
status, the faithful concept paragraph, source citations, staircase tier, smallest first step.

| Stub | Concept | Staircase |
|---|---|---|
| [`services/the-commons-service`](services/the-commons-service/NOTE.md) | The owner's eventual massively-cooperative persistent shared world | Later |
| [`services/energy-tiling-service`](services/energy-tiling-service/NOTE.md) | "r/place but bejeweled" — one shared board, energy-costed tiling, the windy hinterlands | Later, piloted at Next-tier scale via Crucible |
| [`services/undersea-mud-service`](services/undersea-mud-service/NOTE.md) | The SHRIMP-ecology cooperative wuxia MUD | Later |
| [`services/gamified-fediverse-client-service`](services/gamified-fediverse-client-service/NOTE.md) | An ActivityPub client that turns the public Fediverse into an MMORPG | Later, hard-blocked on a public deploy |
| [`services/kind-incremental-idle-service`](services/kind-incremental-idle-service/NOTE.md) | Kind-incremental idle game; prestige priced as a real spectral eigenvalue | Next (research spike) / Later (shipped game) |
| [`services/gambling-series-service`](services/gambling-series-service/NOTE.md) | The gambling/probability series, plus the "Terminal Bets" spend-typing directive | Next |
| [`services/equivo-service`](services/equivo-service/NOTE.md) | "Duolingo for mathematics" — real obstruction-theory checker, no lesson corpus yet | Later |

`farstone-service` also sits in this section's `services/` directory, **reserved for another
effort and left untouched by this map** — see §9.

## 6. Built (legacy archive, recovery candidates) — stubs created in this section

The owner's corrections, honored directly: **shooters are not unbuilt** — durante is a
first-playable Quake-like. **Voxel is not unbuilt** — abrash casts rays over a federated voxel
world. Both are real, tested-at-the-time code sitting in an archive, not absent concepts.

| Stub | What was actually built | Legacy path(s) | Recovery against the active tree |
|---|---|---|---|
| [`services/durante-service`](services/durante-service/NOTE.md) | First-playable Quake-like FPS: walk a level, strafe, shoot a demon | `_archive/from-content-source/apps/games/durante` (62 assertions/4 proofs claimed, proof files absent); plus two *further* broken snapshot copies in the active tree at `public-computer-games-services-section/services/durante-services-section/lib/legacy/*` | Rides abrash, which rides daleske. Recovery requires the whole render-substrate stack first |
| [`services/render-substrate-service`](services/render-substrate-service/NOTE.md) | arnold (TUI base) + daleske (raster over arnold) + tsander (wireframe-3D over arnold) + abrash (raycaster GAME ENGINE, federated voxel world, over daleske) | `_archive/from-content-source/apps/tools/{arnold,daleske,tsander,abrash}` | The dependency floor under durante and okaga; recovering either game means recovering this stack first |
| [`services/wheatstone-service`](services/wheatstone-service/NOTE.md) | MUD client: telnet/GMCP/MSDP/MXP | `_archive/from-content-source/apps/tools/wheatstone` (116 assertions/7 proofs, files present) | Targets the active feltos (`computer-mud-services-section/apps/fizzos`) or the active farstone build (see §9) as a client |
| [`services/okaga-service`](services/okaga-service/NOTE.md) | Elite-like space-flight game on tsander — "a GAME, not just a setting" | `_archive/from-content-source/apps/games/okaga` (proof files absent) | Rides tsander, part of the render-substrate stack |
| [`services/fyreside-service`](services/fyreside-service/NOTE.md) | A single orphaned Python `Card` base class, no game loop — flagged as a discrepancy, see §10 | active tree at `public-computer-games-services-section/services/fyreside-services-section/lib/legacy/cards.py` | Not comparable to the other four; there is no working build to recover, only a fragment to build from |

## 7. Full legacy archive inventory (read-only; not everything above got a stub)

The archive (`561-group/lib/legacy/2026-08-17-vps-561-group/_archive/from-content-source/apps/`)
holds more than the five game-shaped assets stubbed above. Listed here for map-completeness, per
this document's job of being the *single* legible map — none of the rows below got a stub, because
stubs are scoped to game-shaped assets, not the whole tools/interface archive.

- **tools/**: `farolfi` (empty placeholder, not a built asset), `swarm` (agent-orchestration
  substrate, 1 proof file), `tab` (EAVT world-engine underlying fizzos/ruinfold/farstone, 36 proof
  files present — the best-attested asset in the whole archive), `feltos` (legacy MUD-driver copy
  over tab, no tests, no README).
- **games/**: `farstone` (excluded from this map — §9), `ruinfold` (superseded by the active
  `apps/ruinfold` rebuild, §3), `aletheon` (browser 3D fantasy MMORPG, WebGL2 + WebSocket net layer
  over voidmath, test directory completely empty despite a README naming three specific test
  files).
- **interface/**: `waggle` (Node↔Hive blockchain client, the most fleshed-out interface app —
  SECURITY.md, AGENTS.md, man pages, 4 test files), `claude-code` (harness binding a session into
  SWARM as a "Layer 7 carrier"), `shell` (the first userspace interface app, a "settling
  shell/REPL").
- **language/**: completely empty — not a built asset.

## 8. Dormant — content-only sections (not stubbed; nothing to recover, nothing planned)

These hold notes, not code, and are not "planned games" in the stub-worthy sense — they're
established content homes with no build attached yet by any design note in the assigned corpus.

- `agent-services-section/services/play-services-section/services/game-science-services-section/services/gambling-services-section/services/poker-services-section`
- `.../gambling-services-section/services/blackjack-services-section`
- `.../gambling-services-section/services/gambling-games-services-section`
- `agent-services-section/services/play-services-section/services/game-science-services-section/services/dice-games-services-section`
- `agent-services-section/services/play-services-section/services/game-science-services-section/services/card-games-services-section`

The gambling/probability series stub (§5) is the one place a future game in this space is
concretely staged.

## 9. Excluded

- **`services/farstone-service`** — reserved by another workflow; left exactly as found (an empty
  directory). This map does not write into it or describe its intended contents.

## 10. Known inconsistencies

1. **A live, current-generation farstone build exists that neither source inventory names.**
   `.../public-web-services-section/services/public-web-game-services-section/sites/farstone.561.group`
   has a real `package.json` — `@red-cup-engineering/farstone-emsenn-net`, described as "a data-defined
   world and capability runtime built on **current** FeltOS," with named test files
   (`depths.test.mts`, `director.test.mts`, `farstone-arcs.test.mts`, `farstone-climate.test.mts`,
   `player-journey.test.mts`, `simulation.test.mts`, `stability.test.mts`) and a `src/serve.mts`.
   Its own README frames it as "a gather-only consolidation point... nothing has been fixed,
   deduplicated, or reconciled yet," pulling together *seven* prior farstone generations into
   `lib/legacy/`. It is out of scope for this map (farstone-service is reserved, above), but it is
   plausibly the real answer to "is there an LLM-native MUD on FeltOS" — flagged for whoever owns
   `farstone-service` and for the owner to reconcile.
2. **A same-named, differently-scoped section already exists.**
   `computer-systems-services-section/services/computer-game-system-services-section/` (note:
   *game*-system, singular, not *gaming*-systems) holds `lib/legacy/` triage copies of farstone,
   feltos, flickering-delve, and qwzspace-server, plus an `interactive-fiction-services-section`
   child, and has no README of its own. This orchestrator section
   (`computer-gaming-systems-services-section`) is a different, new location; the two names are
   close enough to invite confusion. Not merged, not touched — flagged for the owner to decide
   whether `computer-game-system-services-section` should eventually fold into this map.
3. **fyreside's status doesn't match durante/render-substrate/wheatstone/okaga's.** Those four
   share a "built in legacy archive — recovery candidate" label. On disk, fyreside is a single
   orphaned Python `Card` class with no game loop, no package.json, no tests, sitting in the
   *active* tree's own `lib/legacy/`, not the separate `_archive` tree the other four live in.
   Its stub (§6) states this honestly rather than repeating "built" language the evidence doesn't
   support.
4. **The legacy `okaga` game and the vision-stage "Okaga-setting games" concept share a name but
   are different things at different staircase tiers.** The legacy archive's `okaga` (§6) is an
   already-built Elite-like space game. `2026-08-19-note-on-gaming-enterprises-vision.md` §4's "Okaga-setting games"
   is a distinct, later-stage vision for *future, unnamed* games using the Okaga setting's
   credits-as-warp economic conceit — not a request to rebuild the legacy game. Both facts are
   recorded (the legacy game in the `okaga-service` stub, the vision item in the inventory's
   Part 2 §20) as two separate claims rather than merged into one.
5. **"Render ladder" does not match any genre-ladder concept in the corpus.** It names an
   SVG-first *rendering discipline* proposed for Crucible in the vision note, not a progression of
   shooter/voxel games. This document uses "render-substrate" instead (§6) to name the
   arnold→daleske/tsander→abrash dependency stack.

## Sources

`2026-08-19-note-on-gaming-enterprises-vision.md`, `2026-08-19-note-on-the-suite-and-the-studio.md`, `2026-08-19-note-on-wilder-conceptions-01.md`,
`2026-08-19-note-on-semioverse-architecture.md`, `2026-08-19-note-on-cartridge-and-energy-bank-spec.md`,
`2026-08-19-note-on-house-specification-standard.md`, `2026-08-19-fleet-spec-coverage-log.md`, `equivo-design.md`,
`self-education-platform-design.md`, `zbd-micropayment-rails.md`, `tileslots-market-teardown.md`,
`weiqi-platform-plan.md`, `weiqi-market-teardown.md` — all under
`public-services-section/services/public-computer-services-section/services/public-computer-games-services-section/` and the relevant service sections' own
`content/text/documents/articles/notes/`. Full built-asset and planned-inventory detail:
[the built-asset and planned-game inventory](2026-08-19-note-on-built-asset-and-planned-game-inventory.md).
