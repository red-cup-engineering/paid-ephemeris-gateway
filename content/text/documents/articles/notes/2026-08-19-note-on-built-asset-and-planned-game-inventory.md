---
title: Built Asset and Planned Game Inventory
description: "The inventory behind the gaming estate map: a built-asset audit (every game/engine package, real location, status, and test count — verified by running the suite, or marked claimed where a tree is read-only) plus a planned-game inventory (every named-but-uncoded game/system, its sources, and its staircase tier)."
date: 2026-08-19
keywords: ["gaming", "enterprises", "inventory", "estate"]
---

# Built Asset and Planned Game Inventory

This is the inventory behind [the gaming estate map](2026-08-19-note-on-gaming-estate-map.md):
a **built-asset audit** of the active tree (test counts are either verified by running the
suite directly, or marked "claimed" where a tree is read-only) and a **planned-inventory
audit** of every game or system named across the design-note corpus but not yet built.

---

## Part 1 — Built asset inventory (active tree)

Verified on disk: `ls` + README/package.json read on every asset; `npm test` actually run (not
merely read) on every non-read-only-flagged package, with pass/fail counts pasted directly from
the run. Read-only trees (weiqi, the `TileSlots` design layer inside onestone, `ruinfold-services-section/apps/ruinfold`,
and the entire `2026-08-17-vps-561-group/_archive` family) were inventoried without executing
anything inside them, per instruction — their counts are marked "claimed" from README text, and
additionally checked for whether the claimed proof files physically exist (several do not —
flagged explicitly below).

### 1. Public web games

| asset | path | what it is | status | tests (verified/claimed) | key docs |
|---|---|---|---|---|---|
| flickering-delve | `public-computer-games-services-section/services/flickering-delve-service` | Idle-roguelike cave-delver on the FizzOS kernel, micropayment economy | landed | **63/63 pass** (verified) | README, ARCHITECTURE.md, DESIGN.md, ROADMAP.md |
| onestone (design doc calls it "TileSlots") | `public-computer-games-services-section/services/onestone-service` | Match-3 on a tiling-agnostic graph engine (square→hex→Penrose etc.) with real math-backed mechanics | landed | **249/249 pass** (verified) | README, ARCHITECTURE.md, DESIGN.md, ROADMAP.md, TILESLOTS-DESIGN.md (forward juice/rendering spec on top of the shipped engine — mid-build by another workflow, not written to) |
| lantern | `public-computer-games-services-section/services/lantern-service` | Digital-garden + spaced-repetition knowledge vault, gamified map compiled from markdown | landed | **74/74 pass** (verified) | DESIGN.md, web/README.md |
| solitaire | `public-computer-games-services-section/services/solitaire-service` | Klondike/FreeCell/Spider on one declarative rules engine, solver-certified deals | landed | **59/59 pass** (verified) | README.md, DESIGN.md |
| crucible | `public-computer-games-services-section/services/crucible-service` | Daily obstruction-theory puzzle; move cost = measured `@lenticule-science/metrologic` cohomology | landed | **103/103 pass** (verified) | README.md, DESIGN.md |

### 2. Gaming-enterprises packages + storefront

| asset | path | what it is | status | tests | key docs |
|---|---|---|---|---|---|
| @561-group/cartridge | `public-services-section/services/public-computer-services-section/services/public-computer-games-services-section/services/cartridge` | Shared manifest/intent-log/replay contract every 561 Group game implements | landed | **74/74 pass** (verified) | README.md |
| @561-group/energy-bank | `public-services-section/services/public-computer-services-section/services/public-computer-games-services-section/services/energy-bank` | Shared double-entry ENERGY ledger, accounts, pooling, pluggable settlement backend | landed | **79/79 pass** (verified) | README.md |
| play.561.group | `public-services-section/services/public-computer-services-section/services/public-computer-games-services-section/sites/play.561.group` | Static, zero-dep storefront rendering the game catalog from cartridge manifests | landed | **6/6 pass** (verified) | README.md |

### 3. Weiqi — mid-build, read-only, not run

| asset | path | what it is | status | tests | key docs |
|---|---|---|---|---|---|
| weiqi-kernel | `weiqi-services-section/apps/weiqi-kernel` | Pure dependency-free weiqi rules kernel (position/rulesets/scoring/SGF/semantic events) | mid-build (read-only) | claimed **71 tests, 0 failures** (README text; not executed) — 8 test files + helpers present on disk | README.md, weiqi-kernel-constitution.md, rulesets.md, regression-positions.md |
| weiqi-web | `weiqi-services-section/apps/weiqi-web` | Static education-first MVP: Play/Learn/Read faces over the kernel | mid-build (read-only) | not executed; test dir present | README.md |
| weiqi-platform (section) | `weiqi-services-section/services/weiqi-platform` | Cover section for Learn (admitted, `apps/weiqi-learn`) and Play (declared, not yet admitted) | mid-build (read-only) | weiqi-learn has a `test/` dir, not executed | README.md, weiqi-platform-constitution.md, weiqi-learn-constitution.md |

### 4. Gambling / dice / card sections

| asset | path | what it is | status | tests | key docs |
|---|---|---|---|---|---|
| gambling-services-section (Lenticule Science) | `agent-services-section/services/play-services-section/services/game-science-services-section/services/gambling-services-section` | Formal advantage-play theory: Kelly staking, odds, structure/confluence detection — analysis only, no accounts/execution | landed | **18/18 pass** (verified) | README.md |
| ↳ poker-services-section | `.../gambling-services-section/services/poker-services-section` | Content/notes only, no code | dormant | none (no src) | README.md |
| ↳ blackjack-services-section | `.../gambling-services-section/services/blackjack-services-section` | Content/notes only, no code | dormant | none (no src) | README.md |
| ↳ gambling-games-services-section | `.../gambling-services-section/services/gambling-games-services-section` | Content/notes only, no code | dormant | none (no src) | README.md |
| dice-games-services-section | `agent-services-section/services/play-services-section/services/game-science-services-section/services/dice-games-services-section` | Content/notes only, no code | dormant | none | README.md |
| card-games-services-section | `agent-services-section/services/play-services-section/services/game-science-services-section/services/card-games-services-section` | Content/notes only, no code | dormant | none | README.md |

### 5. Math, ActivityPub, semiotic exchange chain

| asset | path | what it is | status | tests | key docs |
|---|---|---|---|---|---|
| @lenticule-science/metrologic | `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/apps/metrologic` | Bilattice predication floor + hyperdoctrine + Chu spaces + obstruction/spectral/number/verdier modules — imported by every 561-group game | landed | **64/64 pass** (verified) | README.md |
| ActivityPub services section | `web-protocol-services-section/services/activitypub-services-section` | ActivityPub federation server carrying CloudEvents/A2A/RMN, ERC-5219 + R2 custody, SQLite + onchain runtimes, Fedify wiring | landed | **50/50 pass** (verified; ~21s, real crypto/SQLite/federation flows) | README.md (implied by package.json's large exports surface) |
| semiotic-exchange-chain-services-section | `semiotic-computer-system-services-section/services/semiotic-exchange-chain-services-section` | Specifies fusion of EAVT/EVM/ActivityPub/A2A/x402/UCAN into one exchange chain; `SemioticExchange.sol` is a live actuator target | landed (spec + 3 packages) | **6/6 pass** (verified) | README.md |
| ↳ modeled-union-dimension | `.../services/modeled-union-dimension` | Live SemioticExchange + observer-relative codebase-territory projections | landed, 1 known gap | **18/19 pass** (verified) — the 1 fail is `ERR_MODULE_NOT_FOUND` for an unwritten package, exactly as the README states | README.md (documents this exact failure) |
| ↳ sovereign-membrane-admission-service | `.../services/sovereign-membrane-admission-service` | Binds a die's Ed25519 signing material + Agent Card; never mints chain custody in-process | landed | **6/6 pass** (verified) | README.md |

Section total: 30/31 passing — matches the README's own claim exactly.

### 6. FizzOS MUD kernel

| asset | path | what it is | status | tests | key docs |
|---|---|---|---|---|---|
| fizzos (current) | `computer-mud-services-section/apps/fizzos` | Deterministic event-sourced world kernel for inhabitable multi-user worlds; 41 public subpaths (persistence, economy, ecology, federation, HTTP, lisp automation, NPC agency, etc.) | landed, 1 failing test | **59/60 pass** (verified). Failure: `test/cli.test.mjs` "fizzos-serve closes its timer and listener on SIGTERM" — asserts exit code `0`, got `null` (may be sandbox-specific, not confirmed against bare metal) | README.md |

### 7. Second games section (`public-computer-games-services-section/services/`)

| asset | path | what it is | status | tests | key docs |
|---|---|---|---|---|---|
| durante-services-section | `.../services/durante-services-section` | Quake-like FPS on `@561-group/abrash`; active dir holds **two legacy snapshot copies only** (`lib/legacy/2026-06-17-durante`, `lib/legacy/2026-08-17-windows-561-group-apps-games-durante`), no live top-level app | built-legacy-recovery-candidate, and **broken as archived**: both copies' `package.json` test script points at `tests/arena.test.mjs`, `combat.test.mjs`, `demon.test.mjs`, `game.test.mjs`, but both copies' `tests/` hold **only `_harness.mjs`**; `npm test` run on both, both fail immediately with `MODULE_NOT_FOUND` | claimed 62 assertions/4 proofs (README) — **unverifiable, proof files absent from both copies** | README.md (per copy) |
| fyreside-services-section | `.../services/fyreside-services-section` | Card-game seed; active dir holds only `lib/legacy/cards.py`, a single Python `Card` base class with no game loop, no package.json, no tests | dormant (source fragment only) | none | none (no README) |
| ruinfold-services-section | `.../services/ruinfold-services-section` | Home of the live ruinfold rebuild | mid-build (read-only) | see below | — |
| ↳ apps/ruinfold | `.../ruinfold-services-section/apps/ruinfold` | `@561-group/ruinfold-daily`: seeded-daily single-player roguelike run engine (move-log replay, 5-way bilattice death, integer scoring) | mid-build (read-only, not run) | 6 test files present under `src/tests/**`, not executed | package.json only, no README |
| ↳ lib/legacy (3 snapshots) | `.../ruinfold-services-section/lib/legacy/{2026-06-15-ruinfold, 2026-08-17-windows-561-group-apps-games-ruinfold, corpus-normalization}` | Prior ruinfold snapshots kept for reference | built-legacy-recovery-candidate (read-only, not opened in depth) | not inventoried in detail | — |

### 8. Legacy terminal-games archive — READ-ONLY, nothing executed

Location: `561-group/lib/legacy/2026-08-17-vps-561-group/_archive/from-content-source/apps/`.
All statuses in this section: **built (legacy archive, read-only, recovery candidate)**. "Claimed"
test counts are copied verbatim from each README; proof-file presence was additionally checked,
since a claim that can't be checked even in principle is a materially different fact than one
resting on present-but-unexecuted files.

**tools/**

| asset | what it is | claimed tests | proof files present? |
|---|---|---|---|
| arnold | Cell TUI framework, pure Node, "settled section" rendering | 122 assertions / 6 proofs | **yes** — 6 `prove-*.mjs` present |
| daleske | Pixel terminal framework (kitty/sixel), raster analogue of arnold | 79 assertions / 5 proofs | **yes** — 5 `prove-*.mjs` present |
| tsander | Wireframe 3D game engine over arnold (Okaga's engine layer) | tests reference math/world/wireframe/horsetail/engine proofs (no explicit count found) | **no** — `tests/` holds only `_harness.mjs`; 5 proof files absent |
| abrash | Software-3D raycaster GAME ENGINE over daleske; federated voxel world | 81 assertions / 5 proofs | **no** — `tests/` holds only `_harness.mjs`; 5 proof files absent |
| wheatstone | MUD client: telnet/GMCP/MSDP/MXP | 116 assertions / 7 proofs | **yes** — 7 files present |
| farolfi | — | no README, **directory is completely empty** | n/a — placeholder, not a built asset |
| swarm | Greenfield "Semiotic Workers Articulating Relational Models" agent-orchestration substrate | no explicit assertion count | 1 proof file present |
| tab | EAVT world-engine ("Things with Attributes and Behaviours") underlying fizzos/ruinfold/farstone | `run-spine-tests.mjs` — 13 checks, "the whole spine, end to end" | **yes** — 36 `prove-*.mjs` plus `run-spine-tests.mjs` and a fixture builder, all present |
| fizzos (legacy copy) | MUD driver over tab, "homage to FluffOS" | none claimed | no `tests/` dir at all; just `index.mjs` + `mud/practicing.mjs`, no README |

**games/**

| asset | what it is | claimed tests | proof files present? |
|---|---|---|---|
| durante | Quake-like FPS on abrash — "walk a level, strafe, shoot a demon," first-playable | 62 assertions / 4 proofs | **no** — `tests/` holds only `_harness.mjs` |
| farstone | New-England harbor MUD on tab+fizzos, paraconsistent EAVT world | tests referenced, no explicit count | **yes** — `prove-demo-world.mjs`, `prove-farstone.mjs` present |
| okaga | Elite-like space-flight game on tsander — "a GAME, not just a setting" | "galaxy + trade + ship + game proofs" | **no** — `tests/` holds only `_harness.mjs` |
| ruinfold | Browser 3D hack-and-slash MMORPG on tab+voidmath; 5 distinct death rules read off the bilattice | tests referenced, no single explicit total | **yes** — 7 `prove-*.mjs` present |
| aletheon | Browser 3D fantasy MMORPG; from-scratch WebGL2 engine + WebSocket net layer over voidmath world-truth | `math.test.mjs`, `world.test.mjs`, `net.test.mjs` named individually in README | **no** — `tests/` directory is completely **empty**, not even a harness |

**interface/ and language/**

| asset | what it is | notes |
|---|---|---|
| interface/waggle | Zero-dependency Node↔Hive blockchain client | Most fleshed-out interface app: SECURITY.md, AGENTS.md, CHANGELOG.md, CONTRIBUTING.md, man pages, shell completions, LICENSE. 4 test files present |
| interface/claude-code | Claude Code harness binding a session into the SWARM substrate as a "Layer 7 carrier" | `tests/` present, not enumerated in depth |
| interface/shell | First userspace interface app — a "settling shell/REPL" | `tests/` present, not enumerated in depth |
| language/ | — | **directory is completely empty** — not a built asset |

### Totals, verified-passing

flickering-delve 63/63 · onestone 249/249 · lantern 74/74 · solitaire 59/59 · crucible 103/103 ·
cartridge 74/74 · energy-bank 79/79 · play.561.group 6/6 · gambling-services-section 18/18 ·
@lenticule-science/metrologic 64/64 · ActivityPub 50/50 · semiotic-exchange-chain 6/6 + modeled-union-dimension
18/19 + sovereign-membrane-admission 6/6 · fizzos 59/60 (1 SIGTERM-handling failure).
**Total: 878 passing, 3 failing**, across everything execution-permitted. In the read-only
legacy archive, abrash, tsander, durante, and okaga all have their proof files stripped to a
bare harness, so their claimed assertion counts are unverifiable from what's on disk;
aletheon's test directory is entirely empty despite its README naming three specific test
files; farolfi and `language/` are empty placeholder directories.

---

## Part 2 — Planned inventory (game/system, unbuilt or partially unbuilt)

Scope of read: `2026-08-19-note-on-gaming-enterprises-vision.md`, `2026-08-19-note-on-the-suite-and-the-studio.md`, `2026-08-19-note-on-wilder-conceptions-01.md`
(including the ringleader response), `2026-08-19-note-on-semioverse-architecture.md`,
`2026-08-19-note-on-cartridge-and-energy-bank-spec.md`, `2026-08-19-note-on-house-specification-standard.md`, `2026-08-19-fleet-spec-coverage-log.md`
(all seven files present under `public-services-section/services/public-computer-services-section/services/public-computer-games-services-section/.../notes/`, the last one in its `logs/` subdirectory); `equivo-design.md`,
`self-education-platform-design.md`, `zbd-micropayment-rails.md`, `tileslots-market-teardown.md`
under `public-web-game-services-section/.../notes/`; `weiqi-platform-plan.md` and
`weiqi-market-teardown.md` under the weiqi section's notes. Current-state claims checked against
`play.561.group/catalog.json` and direct directory listings, not asserted from design notes alone.

**Note on three often-asked-for items:** "LLM-native MUD on FizzOS," "shooters via the render
ladder," and "voxel games" do not appear under those names anywhere in the design-note corpus
(zero hits for "voxel" or "shooter" in any content file; "FizzOS" appears only as the real
package flickering-delve is built on — an idle-roguelike, not a MUD; "render ladder" appears
once, in the vision note's Crucible proposal, naming an SVG-first rendering discipline, not a
shooter genre). Two of the three have real answers under different names: shooters are not
unbuilt (durante, in the legacy archive, is a first-playable Quake-like); voxel is not unbuilt
(abrash, in the legacy archive, casts rays over a federated voxel world) — see Part 1 §8 above
for both. The [gaming estate map](2026-08-19-note-on-gaming-estate-map.md) records one further
finding on the FizzOS-MUD question in its "Known inconsistencies" section.

### Now (shipped/playable, per catalog.json 2026-08-19)

**1. Flickering Delve** — idle-roguelike on the FizzOS kernel; players write a Lisp standing-order
program that plays the descent for them. Sources: `2026-08-19-note-on-gaming-enterprises-vision.md` §6;
`2026-08-19-note-on-cartridge-and-energy-bank-spec.md` §1.2; `zbd-micropayment-rails.md` §11.3; `catalog.json`.
Landed, 63/63 (Part 1 §1). Staircase: Now.

**2. TileSlots (onestone)** — match-3 whose differentiator is a tiling-agnostic graph engine.
Sources: `2026-08-19-note-on-gaming-enterprises-vision.md` §6; `tileslots-market-teardown.md`;
`2026-08-19-fleet-spec-coverage-log.md`; `catalog.json`. Landed, 249/249. Staircase: Now.

**3. Solitaire** — one rules engine, declarative `VariantSpec` data, solver-certified FreeCell
deals. Sources: `2026-08-19-note-on-gaming-enterprises-vision.md` §6; `zbd-micropayment-rails.md` §6, §11.2;
`2026-08-19-note-on-cartridge-and-energy-bank-spec.md` §1.2, §4; `catalog.json`. Landed, 59/59. Staircase: Now.

**4. Lantern** — gamified digital-garden vault; the platform-contract chassis Equivo/weiqi-Learn
ride. Sources: `2026-08-19-note-on-gaming-enterprises-vision.md` §6; `self-education-platform-design.md`;
`2026-08-19-note-on-wilder-conceptions-01.md` item 4; `2026-08-19-note-on-house-specification-standard.md` §0; `catalog.json`. Landed,
74/74 + 10/10. Staircase: Now.

**5. Weiqi (kernel + Learn)** — dependency-free Go rules kernel + client-side Learn app;
"glossary-linked play" differentiator. Sources: `weiqi-platform-plan.md`; `weiqi-market-teardown.md`;
`self-education-platform-design.md` §9; `2026-08-19-note-on-gaming-enterprises-vision.md`; `catalog.json`. Kernel
landed (71/71 claimed), Learn built-not-deployed, Play unbuilt ("declared in the platform
constitution but not admitted or coded," `2026-08-19-fleet-spec-coverage-log.md` roadmap). Staircase: Now
(kernel/Learn) / Next (Play).

### Now/Next — cross-fleet infrastructure

**6. Cartridge** (`@561-group/cartridge`) — shared manifest/intent-log/replay contract. Sources:
`2026-08-19-note-on-cartridge-and-energy-bank-spec.md` §1; `2026-08-19-note-on-gaming-enterprises-vision.md` §7 Proposal 1;
`2026-08-19-fleet-spec-coverage-log.md` (coverage table). In-build; real source+tests on disk, dated 2026-08-19; not
yet wired into any existing game (`catalog.json`: every entry `cartridgeWrapped: false`). Staircase:
Next.

**7. Energy Bank** (`@561-group/energy-bank`) — shared identity + double-entry ledger, pluggable
settlement backends. Sources: `2026-08-19-note-on-cartridge-and-energy-bank-spec.md` §2; `2026-08-19-note-on-gaming-enterprises-vision.md`
§7 Proposal 1, §5; `zbd-micropayment-rails.md`. In-build; real source+tests on disk. No fleet
service posts a payout entry to it yet (`2026-08-19-fleet-spec-coverage-log.md` gap #5). Staircase:
Next.

**8. play.561.group (the Shelf/Storefront)** — catalog site reframed mid-session as "the CD-suite
reborn": named shelves (Card Table, Puzzle Den, Study, Deep, Stars), a persistent cross-game Energy
Bank wallet, a shared "Today" daily-seed page, a recurring agent cast. Sources:
`2026-08-19-note-on-gaming-enterprises-vision.md` §5, §6; `2026-08-19-note-on-the-suite-and-the-studio.md` (whole, esp. §2–§5);
`2026-08-19-fleet-spec-coverage-log.md` (coverage table). Landed as a static catalog reader (4/4 own-README claim,
`cartridgeWrapped: false` on every entry, honestly disclosed). Staircase: Now (storefront exists) /
Next (shelf reframing, Today page, cast v1 — named directives in §5, not yet built).

### Next — in-development or actively specified

**9. Crucible** ("Hinterland") — daily-seeded obstruction-settling puzzle; move cost = real
`@lenticule-science/metrologic` cohomology/obstruction engine. Waidan/scifi-chemistry theming. Sources:
`2026-08-19-note-on-gaming-enterprises-vision.md` §7 Proposal 2; `2026-08-19-note-on-wilder-conceptions-01.md` item 2;
`2026-08-19-fleet-spec-coverage-log.md` (coverage table). In-build, confirmed on disk (DESIGN.md, README.md, src/,
web/) at `crucible-service`. Staircase: Next.

**10. Ruinfold (daily roguelike)** — seeded-daily roguelike, five-way bilattice death model,
leaderboard/payout. Sources: `2026-08-19-note-on-gaming-enterprises-vision.md` §6; `2026-08-19-fleet-spec-coverage-log.md`
(coverage table); `catalog.json`. Specification-and-skeleton stage: engine modules exist under
`apps/ruinfold/src/engine`, `src/tests/` empty, no server/client wired. Staircase: Next.

**11. Equivo** — "Duolingo-for-mathematics"; four-stage descent (articulate → predicate → posit →
settle) against real `@lenticule-science/metrologic` bilattice/obstruction code; six exercise types, four
presentation-register lenses (a Lakotaean lens honestly absent, pending owner-authored source
material). Sources: `equivo-design.md` (whole, three worked examples run against real code in §5);
`self-education-platform-design.md`; `2026-08-19-note-on-wilder-conceptions-01.md` items 1–2, 5. **Specification only,
content-blocked** — no Equivo lesson corpus exists anywhere in the surveyed material; the checker
math is real and runs, but there is no service, no authored curriculum. Staircase: Later.

**12. Self-Education Platform** — the generalized chassis under Lantern/Equivo/weiqi-Learn:
corpus-compiler (FCA), FSRS-lite SRS, a pluggable `Checker` interface, a two-part mastery model, a
theming/register contract. Source: `self-education-platform-design.md` (whole). Specified, not
built separately — "what `lantern-service/src/` already substantially is, generalized in place"
(§9); the `Checker` interface has no code yet. Staircase: Next.

**13. ZBD Micropayment Rails / "Terminal Bets" spend-typing register** — a ZBD Lightning payout
adapter, a double-entry ads-fund-payouts policy engine, a diminishing payout curve as anti-bot
defense, reused proof-of-play. Source: `zbd-micropayment-rails.md` (whole). Specification, not
shipped — no fleet service posts a payout direction yet. The "Terminal Bets" name itself is **not
present anywhere in the assigned corpus**; the nearest match is `2026-08-19-note-on-wilder-conceptions-01.md` item 7
("a gambling shelf whose entire pitch is telling you which spends are permanent"), adopted by the
ringleader as a design directive for the future gambling series (item 19 below), using the
chemistry corpus's carrier-typing language (free/priced/terminal). Staircase: Later.

### Later — named as vision, not yet designed in detail

**14. The Commons (MMORPG)** — the owner's eventual massively-cooperative persistent shared world,
"too wild to express" as of 2026-08-19; every other game is groundwork toward it. Sources:
`2026-08-19-note-on-gaming-enterprises-vision.md` §1; `2026-08-19-note-on-the-suite-and-the-studio.md` §3 ("The Deep" shelf). Unbuilt,
vision-stage only. Staircase: Later.

**15. The energy-tiling shared-board game** ("r/place but bejeweled," the windy hinterlands) — one
shared board where tiling/transforming costs energy scaled by move complexity and skill; new
players start in the "windy hinterlands"; social from the start. Aesthetic: "weird Flatlander meets
weird Zachtronics." Crucible is the piloted solo-scale precursor to its cost mechanic. Sources:
`2026-08-19-note-on-gaming-enterprises-vision.md` §2; `2026-08-19-fleet-spec-coverage-log.md` roadmap "Later" tier.
Unbuilt, vision-stage; open question stated explicitly in the source: how energy accrues at all.
Staircase: Later, piloted at Next-tier scale via Crucible.

**16. Undersea wuxia cooperative MUD (the SHRIMP ecology)** — a giant cooperative MUD, close kin to
the Commons vision; an ecological world (grass grows, gets picked, composts) referenced against
Albion Online's player economy and EVE's daily regeneration. Builds on a separately-authored
"SHRIMP ecology brief v2" (cited repeatedly, not itself in the assigned reading list) for Lorentzian
causal-set light cones, a four-way settling-regime taxonomy (finite/scott/transfinite/aperiodic),
and K₄ gauge-holonomy as a candidate mechanism for cast-member temperament. Sources:
`2026-08-19-note-on-gaming-enterprises-vision.md` §1; `2026-08-19-note-on-the-suite-and-the-studio.md` §3 ("The Deep" shelf);
`2026-08-19-note-on-wilder-conceptions-01.md` items 2, 3, 6. Unbuilt, vision-stage, with a separately-authored math
brief underneath it (not independently read for this audit). Staircase: Later.

**17. The gamified Fediverse client** — an ActivityPub client turning the whole public Fediverse
into an MMORPG from one instance's perspective; named as "the same destination" as the Commons and
the SHRIMP MUD, approached from a third side (agents-as-actors). Sources:
`2026-08-19-note-on-gaming-enterprises-vision.md` §5a; `2026-08-19-note-on-semioverse-architecture.md` (whole);
`2026-08-19-note-on-wilder-conceptions-01.md` item 6. **Recon complete; no game layer exists.** The one real live
piece is a standards-conformant ActivityPub *server* (Part 1 §5, 50/50) with **no deploy target**
beyond a local devbox instance (signed loopback federation proven same-day, per the ringleader's
response, but not a reachable federation). x402 payments conceptually scaffolded, not executed. A
grep found zero rendering/world-model/game-loop code anywhere in the four "Semioverse"-named
sections; three other "Semioverse"-named directories are confirmed unrelated dormant/abandoned
personal-vault tooling. Staircase: Later, hard-blocked on the deploy step.

**18. The kind-incremental idle game** — an idle/incremental game on the "kind incremental, honest
numbers, no dark patterns" instinct; `2026-08-19-note-on-wilder-conceptions-01.md` item 5 proposes pricing the
prestige multiplier as the literal Perron–Frobenius dominant eigenvalue of the player's own
production graph (feasibility verified — `@lenticule-science/metrologic` exports a `./spectral` subpath) rather
than an authored curve. Sources: `2026-08-19-note-on-gaming-enterprises-vision.md` §3; `2026-08-19-note-on-wilder-conceptions-01.md` item
5 (adopted as "phase 1 of the kind-incremental lane when it launches"). **Unbuilt** — no prototype
exists; only the math-dependency check passed, no code written. Staircase: Next (research spike) /
Later (a shipped idle game on top of it).

**19. The gambling/probability series** — a series of gambling-adjacent games teaching kind-economy
principles, starting from the existing tested Kelly-criterion/odds/staking library
(gambling-services-section, Part 1 §4, landed 18/18). See item 13 for the Terminal Bets spend-typing
directive layered onto this series. Sources: `2026-08-19-note-on-gaming-enterprises-vision.md` §3;
`2026-08-19-note-on-the-suite-and-the-studio.md` §3 ("The Card Table" shelf); `2026-08-19-note-on-wilder-conceptions-01.md` item 7.
Unbuilt — no specific game named yet, only the design directive and the underlying odds library.
Staircase: Next.

**20. Okaga-setting games (credits-as-warp)** — games set in Okaga, the owner's interstellar
laser-solar-sail setting, chosen because "the math of Obsmetrologia" fits it; the cross-cutting
conceit (money = energy = time, so purchasing credits enables warp travel or other setting-native
"magic") is meant to skin the one shared Energy Bank ledger per setting. Sources:
`2026-08-19-note-on-gaming-enterprises-vision.md` §4; `2026-08-19-note-on-the-suite-and-the-studio.md` §3 ("The Stars (later)" shelf), §2.
Unbuilt, concept-stage only — no specific *new* Okaga game is named (distinct from the already-built
legacy `okaga` space-flight game inventoried in Part 1 §8, which predates and is not what this
vision item is proposing). Staircase: Later.

**21. The cast** — named recurring agent players with stable personas playing real games via the
same intent-log API as human players; `2026-08-19-note-on-wilder-conceptions-01.md` item 3 speculatively proposes
computing each member's "temperament" as a K₄ gauge-holonomy invariant over cross-game play-history.
Sources: `2026-08-19-note-on-the-suite-and-the-studio.md` §2, §5 directive 3; `2026-08-19-note-on-wilder-conceptions-01.md` item 3.
Unbuilt — "a real backlog item attached to the first multiplayer-shaped surface"; the only concrete
adopted next step is logging cross-member play-history as data once the cast exists. Staircase:
Later.

**22. The Today page** — a single page surfacing every daily-seeded game's puzzle in one place.
Source: `2026-08-19-note-on-the-suite-and-the-studio.md` §2, §5 directive 2, §6. Unbuilt — gated on "two or more daily
games" being live (currently only ruinfold is daily-seeded and it isn't shipped). Staircase: Next.

### Cross-cutting math/design proposals (not separate games)

- **Computed `regime` field** on every `CartridgeManifest` (finite/scott/transfinite/aperiodic) —
  `2026-08-19-note-on-wilder-conceptions-01.md` item 2; adopted as an ADR item, not yet built.
- **Carrier Audit discipline** (every "free"/"not consumed" claim classified structurally-free /
  priced / terminal) — `2026-08-19-note-on-wilder-conceptions-01.md` item 1; partly executed same-day as a correction
  to `2026-08-19-note-on-the-suite-and-the-studio.md` §2, and assigned to `2026-08-19-note-on-house-specification-standard.md` §8 (shipped
  text, confirmed on read).
- **Isostatic org-chart check** (the fleet's own pebble-game rigidity math run against the fleet's
  own vendor-dependency graph) — `2026-08-19-note-on-wilder-conceptions-01.md` item 8; explicitly parked, "not yet a
  graph statistic" at 3–4 documented edges.

### Summary count

5 landed/playable games, 2 cross-fleet infrastructure packages in-build, 6 items in active
next-tier specification or skeleton-build, 9 items at vision/later stage, 1 named directive
(Terminal Bets) attached to an unbuilt series, plus 3 cross-cutting math proposals riding on top of
the above. "LLM-native MUD on FizzOS," "shooters via the render ladder," and "voxel games" were not
found under those names anywhere in the assigned corpus; see Part 1 §8 for the actual shooter/voxel
built assets (durante, abrash) that answer those two, and the README's own Contradictions section
for the one open finding on the FizzOS-MUD question.
