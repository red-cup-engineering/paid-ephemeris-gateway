---
title: Games Census
description: "A census of every distinct game, engine, prototype, and design across the 561 Group estate: one row per distinct thing, deduped, with dead ends recorded so they aren't re-hunted."
date: 2026-08-19
keywords: ["gaming", "enterprises", "census", "inventory", "estate", "games"]
---

# Games Census

This note reconciles against
[the built-asset and planned-game inventory](2026-08-19-note-on-built-asset-and-planned-game-inventory.md)
and [the gaming estate map](2026-08-19-note-on-gaming-estate-map.md); where a path in either
no longer resolves on disk, the corrected path is used here.

**Note on this section.** `561-group-gaming-enterprises-services-section` (the directory this
note lives in) is a **symlink** to
`public-services-section/.../public-computer-games-services-section` — not a separate or
missing location. This note sits alongside the inventory note,
`2026-08-19-note-on-the-suite-and-the-studio.md`, and the `planned/` stub notes it cross-references.

**Shelf key** (`2026-08-19-note-on-the-suite-and-the-studio.md` §3): Card Table (casino/probability) · Puzzle Den
(match-3/puzzle) · Study (board/edutainment) · Deep (MUD/roguelike) · Stars (Okaga-set, later) ·
substrate (cross-game engines/infra, not a game itself) · unshelved.

---

## Landed — shipped, with tests passing

| Name | What it is | Canonical path(s) | Shelf |
|---|---|---|---|
| **Flickering Delve** | Idle-roguelike cave-delver on the FizzOS kernel; players write a Lisp standing-order program that plays the descent | `services/public-services-section/services/public-computer-services-section/services/public-web-services-section/services/public-computer-games-services-section/services/flickering-delve-service` | Puzzle Den |
| **TileSlots** (package name `onestone`) | Match-3 on a tiling-agnostic graph engine (square→hex→Penrose), Laman-rigidity-backed mechanics | `.../public-computer-games-services-section/services/onestone-service` | Puzzle Den |
| **Lantern** | Digital-garden + spaced-repetition knowledge vault, gamified map compiled from markdown; the chassis Equivo/weiqi-Learn are meant to generalize | `.../public-computer-games-services-section/services/lantern-service` | Study |
| **Solitaire** | Klondike/FreeCell/Spider on one declarative rules engine, solver-certified deals | `.../public-computer-games-services-section/services/solitaire-service` | Card Table |
| **Weiqi kernel + Learn** | Dependency-free Go rules kernel (position/rulesets/scoring/SGF) + a client-side "glossary-linked play" Learn app | `services/science-services-section/services/agent-services-section/services/play-services-section/services/game-science-services-section/services/board-games-services-section/services/weiqi-services-section/apps/{weiqi-kernel,weiqi-web}`, `.../services/weiqi-platform/apps/weiqi-learn` | Study |
| **play.561.group** (the Shelf/Storefront) | Static, zero-dep catalog reader rendering the game catalog from cartridge manifests; reframed mid-2026-08-19 as "the CD-suite reborn" | `services/public-services-section/services/public-computer-services-section/services/public-computer-games-services-section/sites/play.561.group` | substrate |
| **Lenticule Science (gambling-services-section)** | Formal advantage-play theory engine: Kelly staking, odds, structure/confluence detection — analysis only, no accounts | `services/science-services-section/services/agent-services-section/services/play-services-section/services/game-science-services-section/services/gambling-services-section` | Card Table (substrate) |
| **@lenticule-science/metrologic (math-core)** | Bilattice predication floor + hyperdoctrine + Chu spaces + obstruction/spectral/number/verdier modules — imported by nearly every 561-group game (Crucible's move-cost, Equivo's checker, onestone's rigidity, stoke's prestige eigenvalue) | `services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/apps/metrologic` | substrate |
| **FizzOS (current)** | Deterministic event-sourced MUD/world kernel for inhabitable multi-user worlds; ~41 public subpaths (persistence, economy, ecology, federation, HTTP, lisp automation, NPC agency) | `services/engineering-services-section/services/computer-services-section/services/computer-systems-services-section/services/computer-mud-services-section/apps/fizzos` | Deep (substrate) |
| **QwzSpace** (package `@red-cup-engineering/qwzspace`) | Zero-dependency realtime webapp-game engine shared by Aletheon and Ruinfold: fixed-tick transaction boundary, intent queue, snapshot/broadcast, SSE+WS transports, plus rooms/intent-log/resume/replay/client-SDK/renderer surface. **276/276 assertions pass** (`npm test`, 21 `prove-*.mjs` files under `node --test`), plus a live play session (a real WebSocket handshake, driven ticks, and a `delta`/`chat` frame received). Renamed from `@561-group/qwzspace@0.1.0` per the house namespace migration and refiled from the web-games home to the systems home per the owner's "engines are not games" ruling — see [the buried-games revival log](logs/2026-08-19-buried-games-revival-log.md) | `computer-game-system-services-section/services/qwzspace-services-section` (the old `.../gaming-services-section/services/qwzspace-services-section` path is now removed; earlier snapshot at `561-group/lib/legacy/2026-08-17-vps-561-group/services/qwzspace-server`; triage copy at `computer-game-system-services-section/lib/legacy/2026-08-17-triage-dev-qwzspace-server`) | substrate |
| **Farstone (active build)** | "A data-defined world and capability runtime built on current FizzOS" — real `sites/farstone.emsenn.net` deployable site. **7/7 tests pass** (`npm test`: 5 unit suites + a full deterministic-simulation test + an 8-year replay-exactness test), `npm run check` clean, and a real REST session plays cleanly against a live `node src/serve.mts` (connect, look, move between rooms, take/drop an item by exact display name, speak) with autonomous Director/world-clock activity confirmed via `/metrics`. Still a "gather-only consolidation point" per its own README; distinct from the pyfars legacy governance-polity Farstone and from the tab/FizzOS legacy MUD Farstone (see legacy row). See [the buried-games revival log](logs/2026-08-19-buried-games-revival-log.md) | `.../gaming-services-section/services/farstone-services-section` (site at `.../sites/farstone.emsenn.net`) | Deep |
| **Stoke — the kind-incremental idle game** | Implements the kind-incremental idle-game design (prestige priced as a Perron–Frobenius eigenvalue): `eigen.mts`/`prestige.mts`/`kind-design.test.mts` plus a full cartridge-wrapped src+web tree. The inventory's vision item for this design listed it as unbuilt; this is the built implementation. **103/103 tests pass** (98 baseline + 5 regression tests added deploying it, see the 2026-08-20 deploy log entry: a same-URL front-door rewrite bug and a `node:crypto`-in-browser bug were both found and fixed first). Moved here from In-build 2026-08-20: first-time Cloud Run deploy, live at `stoke.561.group`, front door walked clean (19 URLs, 0 MISS, 0 BADMIME) | `.../public-computer-games-services-section/services/stoke-service` | Puzzle Den/Card Table (idle) |
| **Parlor** | Five games, one service, one `@red-cup-engineering/parlor-kernel`-backed rules-as-data core: Pig, Farkle, Yacht (dice trio, each daily-seeded, Pig/Farkle carrying a bot opponent that plays the published math), Chutes & Ladders (board-as-graph race with a live exact finish-turn distribution), and Fair Spin (a practice slot machine disclosing computed RTP/hit-odds/expected-loss permanently, never behind a click). Earn-only, no wagering. **92/92 tests pass.** Added here 2026-08-20 — this row was entirely absent from this census before that (a real gap the deploy pass's own halt report found, not merely an update): first-time Cloud Run deploy, live at `parlor.561.group`, front door walked clean (3 URLs — the shelf page's own graph; the five game pages are separate, independently-verified front doors — 0 MISS, 0 BADMIME) | `.../public-computer-games-services-section/services/parlor-service` | Card Table |

---

## In-build — real code and tests on disk, actively growing

| Name | What it is | Canonical path(s) | Shelf |
|---|---|---|---|
| **Crucible** ("Hinterland") | Daily obstruction-theory settling puzzle; move cost = measured `@lenticule-science/metrologic` cohomology; waidan/scifi-chemistry theming | `.../public-computer-games-services-section/services/crucible-service` | Puzzle Den |
| **Kelly's Wager** (package `gambling-trainer`) | Daily-seeded practice-bankroll trainer for EV/variance/Kelly-criterion sizing, novice/sharp tracks, rides the Lenticule Science engine | `.../public-computer-games-services-section/services/gambling-trainer-service` | Card Table |
| **Ruinfold** (`@561-group/ruinfold-daily`) | Seeded-daily single-player roguelike run engine: move-log replay, five-way bilattice death model, integer scoring; engine modules exist, `src/tests/` empty, no server/client wired yet | `services/public-services-section/services/public-computer-services-section/services/public-computer-games-services-section/services/ruinfold-services-section/apps/ruinfold` (+3 legacy snapshots at `.../ruinfold-services-section/lib/legacy/{2026-06-15-ruinfold, 2026-08-17-windows-561-group-apps-games-ruinfold, corpus-normalization}`) | Deep |
| **Aletheon** | Browser 3D fantasy MMORPG, world-truth is voidmath; from-scratch WebGL2 renderer, hand-rolled RFC-6455 WebSocket server, 15Hz tick simulation with combat/claims/disputes/marks/powers/NPC AI. Live client/server/shared trees, `CONSOLIDATION.md` mid-refactor, `deploy/README.md` names a live reverse-proxy target — this is the active, current-generation build; a separate, older, broken-test legacy snapshot also exists and is not the same thing. Confirmed live-running and played for real, combat/codex/altar/chat all firing — see [the buried-games revival log](logs/2026-08-19-buried-games-revival-log.md). `npm test` errors "Missing script: test"; zero test files exist anywhere in the tree. Stays In-build, not Landed, since this table's own bar is tests run and passing | `services/public-services-section/services/public-computer-services-section/services/public-web-services-section/services/web-services-section/services/gaming-services-section/services/aletheon-services-section` (legacy predecessor mirrored at its own `lib/legacy/2026-08-17-windows-561-group-apps-games-aletheon`, and separately in the `_archive` tree — see Durante-class row below) | Deep |
| **@561-group/cartridge** | Shared manifest/intent-log/replay contract every 561 Group game is meant to implement; real source+tests; not yet wired into any shipped game (`play.561.group/catalog.json`: every entry `cartridgeWrapped: false`). Real home is `computer-game-system-services-section/services/cartridge` | `services/engineering-services-section/services/computer-services-section/services/computer-systems-services-section/services/computer-game-system-services-section/services/cartridge` | substrate |
| **@561-group/energy-bank** | Shared double-entry ENERGY ledger, accounts, pooling, pluggable settlement backend; same path correction as cartridge applies | `.../computer-game-system-services-section/services/energy-bank` | substrate |

---

## Built-legacy-recovery-candidate — real, once-working code, no longer wired into anything live

| Name | What it is | Canonical path(s) | Shelf |
|---|---|---|---|
| **Durante** | Quake-like FPS on abrash — "walk a level, strafe, shoot a demon," first-playable. Active dir holds only two broken legacy copies (test scripts reference proof files absent from both) | `.../public-computer-games-services-section/services/durante-services-section/lib/legacy/{2026-06-17-durante, 2026-08-17-windows-561-group-apps-games-durante}`; origin in `561-group/lib/legacy/2026-08-17-vps-561-group/_archive/from-content-source/apps/games/durante` | Puzzle Den (arcade) |
| **Abrash** | Software-3D voxel-raycaster game engine over a paraconsistent (bilattice) world; WASD, kitty/sixel rendering, headless CI mode — confirmed real and playable (`bin/abrash.mjs`). This is the asset the owner meant by "still not finding abrash" | `services/engineering-services-section/services/computer-services-section/services/computer-systems-services-section/services/computer-interface-system-services-section/lib/legacy/abrash` (byte-identical mirror at `561-group/lib/legacy/2026-08-17-vps-561-group/_archive/from-content-source/apps/tools/abrash`) | substrate |
| **Arnold** | Pure-Node cell-based TUI framework; the render-substrate floor under daleske/tsander/abrash/wheatstone | `.../computer-interface-system-services-section/lib/legacy/arnold` (mirror: `_archive/.../apps/tools/arnold`) | substrate |
| **Daleske** | Pixel terminal framework (kitty/sixel), raster analogue of arnold | `.../computer-interface-system-services-section/lib/legacy/daleske` (mirror: `_archive/.../apps/tools/daleske`) | substrate |
| **Tsander** | Wireframe-3D game engine over arnold; own README states "Tsander is the engine; Okaga is the game that will ride it" | `.../computer-interface-system-services-section/lib/legacy/tsander` (mirror: `_archive/.../apps/tools/tsander`) | substrate |
| **Okaga** | Elite-like space-flight game on tsander — "a GAME, not just a setting." Legacy-only; its active-tree container holds only a 31-file legacy dump, no active src | `_archive/from-content-source/apps/games/okaga`; active container `services/public-services-section/services/public-social-services-section/services/public-media-services-section/services/media-services-section/services/paracosm-service-section/services/okaga-paracosm-services-section/services/okaga-games-services-section/services/okaga-computer-games-services-section/lib/legacy/{2026-06-17-okaga, 2026-08-17-windows-561-group-apps-games-okaga}` | Stars |
| **Wheatstone** | MUD client: telnet/GMCP/MSDP/MXP over arnold, 116 assertions/7 proofs present; README: `wheatstone --farstone` spawns a local tab/Farstone server and connects | `561-group/lib/legacy/2026-08-17-vps-561-group/_archive/from-content-source/apps/tools/wheatstone` (**no copy exists under `computer-mud-services-section/lib/legacy/` — checked, does not exist; do not re-search there**) | substrate |
| **Tab** | EAVT ("Things with Attributes and Behaviours") world-engine underlying the legacy fizzos/ruinfold/Farstone generation; best-attested asset in the archive (36 `prove-*.mjs` + spine-test suite) | `_archive/from-content-source/apps/tools/tab` | substrate |
| **Fizzos (legacy copy)** | Earlier MUD driver over tab, "homage to FluffOS" — distinct predecessor of the current, actively-tested `apps/fizzos` (landed row above); no tests, no README | `_archive/from-content-source/apps/tools/fizzos` | substrate |
| **Farstone (legacy, tab/FizzOS generation)** | New-England harbor MUD on tab+fizzos, paraconsistent EAVT world; distinct from both the active Farstone build (in-build, above) and the pyfars governance polity | `_archive/from-content-source/apps/games/farstone` | Deep |
| **Ruinfold (legacy generation)** | Browser 3D hack-and-slash MMORPG on tab+voidmath, superseded by the active `apps/ruinfold` rebuild above | `_archive/from-content-source/apps/games/ruinfold` | Deep |
| **Aletheon (legacy generation)** | Earlier WebGL2 fantasy-MMORPG build; test directory entirely empty despite README naming three test files; superseded by the active build above | `_archive/from-content-source/apps/games/aletheon`; also mirrored inside the active build's own `.../aletheon-services-section/lib/legacy/2026-08-17-windows-561-group-apps-games-aletheon` | Deep |
| **@emsenn/gaming and @emsenn/playing** | Ludics/concurrent-game-systems algebra libraries (Girard's designs/loci/orthogonality/behaviours; Player/Opponent polarity); `playing` also carries an RPG-flavored layer (persona/dramaturgy/affect/skill/discipline/genre/caillois); `gaming` lifts it to multi-agent arenas with an `admit-game` CLI. Theoretical/runtime floor the concrete games are meant to sit on, not games themselves | `561-group/lib/legacy/2026-08-17-vps-561-group/lib/{gaming,playing}` | substrate |
| **Storystream** | Racket TCP socket server streaming paced text narratives to telnet-style clients (each line carries a numeric delay) — a small, self-contained interactive-fiction engine | `services/engineering-services-section/services/computer-services-section/services/computer-systems-services-section/services/computer-game-system-services-section/services/interactive-fiction-services-section/lib/legacy/2026-06-17-storystream`; origin at `services/561-group-services-section/lib/legacy/2026-03-11-windows-archive-superrepo/library/storystream` | Deep |
| **dg** ("emsenn's digital garden") | Fennel MUD engine: `server.fnl`, `engine.fnl`, `map.fnl`, `areas.fnl`, `talker.fnl`, `users.fnl`, `objects/` | `services/561-group-services-section/lib/legacy/2026-03-11-windows-archive-superrepo/library/dg` | Deep |
| **Crown of Idbol Bark** | Standalone tabletop RPG one-shot ("arrest an upstart king," 2–4 hrs), rules PDF + media, "ready to use, but isn't finalized." Distinct from *Brave Old World* | `services/561-group-services-section/lib/legacy/2026-03-11-windows-archive-superrepo/library/crown-of-idbol-bark` | unshelved (tabletop) |

---

## Design-only — real design/spec text, zero game code

| Name | What it is | Canonical path(s) | Shelf |
|---|---|---|---|
| **Seasons Builder** ("Seasonal Round," proposed) | Flagship city builder: Impressions-style finite scenarios × Dawn of Man material/seasonal resource management; first campaign Lakota. Full design brief written | `services/public-services-section/services/public-computer-services-section/services/public-computer-games-services-section/content/text/documents/articles/notes/{planned/2026-08-19-note-on-seasons-builder.md, 2026-08-19-note-on-seasons-builder-design.md}` | Study |
| **Obsidian Lineage** | Obsidian-lineage AI Myst-like — a slow, first-person puzzle game where the house's own obstruction/settling math and four-valued logic *are* the puzzle content, no reskin. Full chassis design written | `.../content/text/documents/articles/notes/planned/2026-08-19-note-on-obsidian-lineage.md` | Puzzle Den |
| **Mystery Adventure** | Owner-named Colonel's Bequest/Laura Bow-lineage point-and-click whodunit, chassis-designed on the live fizzos substrate: world-clock-derived suspect schedules, append-only evidence, accusation as a settle-check | `.../content/text/documents/articles/notes/planned/2026-08-19-note-on-mystery-adventure.md` | Deep |
| **Extraction Crawler** | Anvil-of-Dawn-lineage browser extraction crawler — blockstep grid movement, tempo-controlled combat, no-XP skill-by-use, ported (not literally revived) from the abrash/durante substrate | `.../content/text/documents/articles/notes/planned/2026-08-19-note-on-extraction-crawler.md` | Puzzle Den |
| **Equivo** | "Duolingo for mathematics" — four-stage descent against real `@lenticule-science/metrologic` bilattice/obstruction code; checker math runs, no lesson corpus or service exists | `.../content/text/documents/articles/notes/{planned/2026-08-19-note-on-equivo.md, equivo-design.md}` | Study |
| **Weiqi LSP** | Language Server Protocol implementation for weiqi; spec only (`SPEC.md`), no implementation | `services/science-services-section/services/agent-services-section/services/play-services-section/services/game-science-services-section/services/board-games-services-section/services/weiqi-services-section/apps/weiqi-lsp` | Study |
| **The Commons** | The owner's eventual massively-cooperative persistent shared-world MMORPG; "too wild to express" as of 2026-08-19; every other game is framed as groundwork toward it | `.../content/text/documents/articles/notes/planned/2026-08-19-note-on-the-commons.md` | Deep |
| **Undersea MUD (SHRIMP ecology)** | Cooperative wuxia MUD, ecological world (grass grows/gets picked/composts); depends on a separately-authored SHRIMP ecology brief (Lorentzian causal-set light cones, 4-way settling-regime taxonomy) | `.../content/text/documents/articles/notes/planned/2026-08-19-note-on-undersea-mud.md`; brief at `services/engineering-services-section/services/computer-services-section/services/computer-systems-services-section/services/semiotic-computer-system-services-section/content/text/documents/articles/notes/2026/08/19/shrimp-ecology-brief-v2.md` | Deep |
| **Gamified Fediverse Client** | An ActivityPub client turning the public Fediverse into an MMORPG from one instance's view. The one real piece underneath it — a standards-conformant ActivityPub server — is landed but has no public deploy target | `.../content/text/documents/articles/notes/planned/2026-08-19-note-on-gamified-fediverse-client.md` (server at `services/engineering-services-section/services/computer-services-section/services/computer-systems-services-section/services/web-services-section/services/web-protocol-services-section/services/activitypub-services-section`) | Deep |
| **Gambling Series / "Terminal Bets"** | A series of gambling-adjacent games teaching kind-economy principles, riding the existing Lenticule Science odds/Kelly library; no specific game named yet | `.../content/text/documents/articles/notes/planned/2026-08-19-note-on-gambling-series.md` | Card Table |
| **Energy Tiling** ("r/place but bejeweled," the windy hinterlands) | Shared-board game, energy-costed tiling/transforming; Crucible is the confirmed solo-scale precursor validating its cost mechanic | `.../content/text/documents/articles/notes/planned/2026-08-19-note-on-energy-tiling.md` | Puzzle Den → later Stars-adjacent |

---

## Mentioned-only — real, game-adjacent, not itself a game

| Name | What it is | Canonical path(s) |
|---|---|---|
| **EVE Assist** | Decision-support/companion web app for the third-party game EVE Online (market, map, chat, dashboard); deployed via a Cloudflare Worker for eve-assist.561.group | `services/engineering-services-section/services/computer-services-section/services/computer-systems-services-section/services/web-services-section/services/web-game-services-section/services/eve-online-services-section` |
| **Aagaard** | ~60 automation scripts (Splinterlands/dCity/dCrops/Hashkings/Terracore/Holozing) trading/farming assets in third-party Hive-blockchain games, plus Lean proofs; bot/finance tooling, not a built game | `services/public-services-section/services/public-computer-services-section/services/public-web-services-section/services/web-services-section/services/web3-services-section/hive-services-section/services/aagaard` |
| **Dreamfield** | A single-file LLM system-prompt defining a recursive interactive-fiction/paracosm bedtime-storyteller persona — game-adjacent generative-narrative artifact, not a playable build | `services/561-group-services-section/lib/legacy/2026-03-11-windows-archive-superrepo/library/dreamfield/dreamfield.md` |

---

## Confirmed not games (flagged so future passes don't mistake them for one)

- **`swarm`** and **`farolfi`** — `_archive/from-content-source/apps/tools/{swarm,farolfi}`. Swarm is a "Semiotic Workers Articulating Relational Models" agent-orchestration substrate (1 proof file); farolfi's directory is completely empty, a placeholder only.
- **`waggle`** — `_archive/from-content-source/apps/interface/waggle`. Zero-dependency Node↔Hive blockchain wallet/client. Not a game despite living in a games-adjacent archive.
- **Divination (tarot/spread/deck) services** — a "sign-reading as settling" internal-market labor service that happens to use tarot-deck content; not a game.
- **Card/Dice/Poker/Blackjack/Gambling-games sub-sections** under `agent-services-section/services/play-services-section/services/game-science-services-section/services/gambling-services-section` — content/notes only, no `src`, no engine.
- **Hevî Mala** — `services/public-services-section/.../paracosm-service-section/services/hevi-mala-paracosm-services-section/texts/{worlding-guide.md, triage-synthesis.md}`. A finished worldbuilding-doctrine text, explicitly carrying no game math; a fiction world, not a game.
- **MetroPlat** — a media-publishing/advertising concept (koios-news archive essay), not a game.
- **The Cast**, **The Today page**, **Self-Education Platform** — real named directives in `2026-08-19-note-on-the-suite-and-the-studio.md` and the [built-asset and planned-game inventory](2026-08-19-note-on-built-asset-and-planned-game-inventory.md), but cross-cutting features/chassis concepts, not standalone games; not given rows here.
- **ActivityPub server** and **semiotic-exchange-chain family** (`modeled-union-dimension`, `sovereign-membrane-admission-service`) — landed, tested infrastructure, but general federation/ledger substrate rather than game engines; noted under Gamified Fediverse Client above rather than as standalone rows.
- **`561-group-gaming-enterprises-services-section`** — see "Note on this section" above: it is a symlink, not a missing directory. One prior sweep's dead-end claim about this path is itself incorrect.

## Excluded

- **Teraum** — owner's personal fiction, excluded per standing instruction. Named only as encountered (e.g. inside `fizzos/examples/teraum.mjs`, a test-suite fixture name, and one `.ink` file path under a `teraum/` directory); contents never entered, never read.

## Confirmed dead ends (searched, not found — do not re-hunt)

- `okaga.emsenn.net`, `mud.emsenn.net`, `qtmud.emsenn.net`, `mepach.emsenn.net` — all trace only to a single dead 2019-era personal-website archive dump, not current builds.
- `metroplat.emsenn.net` — traces to a media/advertising essay, not a game deploy.
- A copy of **wheatstone** under `computer-mud-services-section/lib/legacy/` — does not exist (checked directly); the only copy is in the `_archive` tree (row above).
- Active (non-legacy) source trees for **abrash, arnold, daleske, tsander, okaga** beyond the `computer-interface-system-services-section/lib/legacy` mirrors and the `_archive` originals — none exist.
- Game code anywhere in the tree for any of the seven "Later"-stage vision items (Undersea MUD, The Commons, Gamified Fediverse Client, Gambling Series, Energy Tiling) beyond their design notes and cited math dependencies — none exists.
- "LLM-native MUD on FizzOS," "shooters via the render ladder," and "voxel games" as *named* corpus items — not found under those names anywhere (the real answers are the active Farstone build / current fizzos, Durante, and Abrash respectively — see rows above).
- No `Caddyfile`, `wrangler.toml`, or `nginx.conf` exists anywhere in the active tree outside one unrelated legacy `gsu-ccs` corpus duplicate.

---

## Totals

**46 distinct games/engines/prototypes/designs**, plus 3 mentioned-only game-adjacent items.
**Landed: 13** · **In-build: 6** · **Built-legacy-recovery-candidate: 16** · **Design-only:
11** · **Mentioned-only: 3** (49 rows total across all tables). Updated 2026-08-20: Stoke moved
Landed←In-build (first-time Cloud Run deploy); Parlor added to Landed (it had no row in this
census at all before this pass — a real gap, not an update, found by the deploy pass's own halt
report). The real home for
**cartridge** and **energy-bank** is `computer-game-system-services-section/services/{cartridge,energy-bank}`,
used throughout this census — the `public-computer-games-services-section/services/{cartridge,energy-bank}`
path some other documents give does not resolve on disk.
