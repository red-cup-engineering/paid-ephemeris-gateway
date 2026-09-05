# VaultMaze — architecture

Companion to `DESIGN.md` (design rationale) and `web/README.md` (the browser face's file map).

## 1. Introduction

Lantern is "digital garden + knowledge vault + spaced repetition, gamified" — a wing of
frontmattered markdown compiles into a walkable concept map; a room stays lit while its cards are
remembered, and fogs (never deletes) when they're forgotten. Structurally it is the fleet's odd
member: it has no server-held player state, no payments, and no ledger — the usual "one stateful
scene module" pattern doesn't apply, because there is nothing here for a scene module to hold
(§2).

## 2. Constraints

- **Determinism.** `srs.mts`, `lightcone.mts`, and `kata.mts` never call `Date.now()` — every
  function that needs "now" takes it as an injected epoch-day parameter. The one place a clock is
  read at all is `compile.mts`'s CLI entry point, which is I/O bookkeeping (reading a corpus
  directory, writing a JSON file), not domain logic.
- **Zero runtime dependencies.** `package.json` has no `dependencies` key beyond
  `@red-cup-engineering/vault-compiler`, used only by `scripts/vaultmaze.mjs`. Node builtins otherwise
  (`node:fs`, `node:path`, `node:url`, `node:http`).
- **No stateful scene module.** Every other fleet service isolates mutable state behind one
  `scene.mts`; Lantern has none because it has no server-held player state at all. The compiler
  (`compile.mts::compileWing`) is a deterministic function of a directory's contents, run once or
  on demand to a JSON snapshot; every downstream module is a pure reader of that snapshot plus
  caller-supplied player-card state. The one piece of mutable state in the whole service — a
  player's SRS progress — lives entirely in the browser (`web/js/state.js`'s `localStorage`);
  `web/server.mjs` has no route that accepts or persists anything, only `GET`/`HEAD` static-file
  serving.
- **Vendor, not import.** `stability.mts`'s `pebbleIndependent`/`lamanCount`/`meanCoordination`/
  `loadBearing` are vendored verbatim from `onestone-service/src/validate.mts`, byte-identical
  bodies and comments, with `connectedComponents`/`hallStability` as the new code layered on top.

## 3. Context

Consumes one external corpus today: the weiqi glossary/lesson corpus under
`weiqi-services-section` ("wing one"). The wing abstraction (`WingConfig`) admits a second wing
(a player's own vault) with zero special-casing — unbuilt, see `ROADMAP.md`.

## 4. Solution strategy

The compiler is theory-neutral by shape, not by special-casing: every door-extraction,
attribute-collection, and card-generation rule reads the *shape* of a frontmatter value (does it
look like a `.md` link? is it a flat list?) rather than a hard-coded field name —
`extractHardDoors`/`extractSoftDoors` in `compile.mts` and `fca.mts`'s `computeHalls` contain no
reference to `"weiqi"` anywhere. This is what makes "wing two: a player's own vault" a real
extension point rather than a roadmap aspiration.

## 5. Building block view

| Module | Responsibility |
|---|---|
| `types.mts` | `Room`/`Door`/`Hall`/`ReviewCard`/`Kata`/`WingConfig`/`World` — the shared data model |
| `frontmatter.mts` | hand-rolled YAML-subset parser: scalars + flat string lists; nested maps recognized and skipped |
| `fca.mts` | genuine FCA: intersection-closure to a fixpoint over the object-attribute family; capped-greedy fallback past `ATTRIBUTE_CEILING = 500` |
| `stability.mts` | vendored pebble-game rigidity check + `connectedComponents`/`hallStability`/`STABLE_HALL_BONUS` |
| `srs.mts` | FSRS-lite forgetting curve and review-update rule; `STAGE_CUTS` |
| `lightcone.mts` | `revealedTerritory` (monotonic), `rootRooms`, `roomLightStates`, `computeLightCone` (fixpoint BFS over full/embers-gated doors) |
| `cards.mts` | five priority-ordered gate-card generation rules |
| `kata.mts` | `autoKataPath` (deterministic DFS linearization, cycle-tolerant), `scoreCard`/`kataRatio`/belts, `ratioToGrade` |
| `compile.mts` | `compileWing(root, config) -> World`; directory walk, room construction, link resolution/promotion, hall/card orchestration; a CLI entry point |
| `web/server.mjs` | zero-dep static file server, security headers, path-traversal guard |
| `web/build/build-layout.mts` | deterministic force-directed layout + baked auto-hall kata paths → `web/data/*.json` |
| `web/js/*.js` | browser UI; `js/engine/{srs,lightcone,kata}.js` are browser ports of the `.mts` modules, kept honest by `web/test/parity.test.mts`'s bit-identical check |

`compile.mts` is the only module mixing pure orchestration with file-I/O: `compileWing` itself
calls `walkMarkdownFiles`/`buildRoom`, which read the filesystem. It is not pure in the no-I/O
sense — it is a deterministic function of a directory's contents on disk, which is the property
`DESIGN.md` §7 actually claims.

## 6. Runtime view

**Compiling a wing.** `node src/compile.mts <rootDir> weiqi data/world-weiqi.json` calls
`compileWing(root, {id: 'weiqi'})`: `walkMarkdownFiles` recursively lists every `*.md` under root
(skipping `node_modules`/`.git`); each file becomes a `Room` via `buildRoom`, which parses
frontmatter, skips archival files (a `provenance:` field present), and derives
`title`/`aliases`/`kind`/`description`. Every room's frontmatter and body links are resolved into
hard and soft `Door`s (shape-based, §4), then `applyPromotion` promotes a room's soft doors to
hard when it has zero hard doors of its own — the mechanism that turns a glossary term's
`## Related terms` links into real gates with zero special-casing for that section header.
`buildHalls` calls `fca.mts::computeHalls` over the declared attribute fields, then
`stability.mts::withStability` computes each Hall's `stable` flag. Every room's dependency doors
feed `cards.mts::generateCardsForRoom`, and the whole `World` is serialized to a JSON file.

**A review, and the light cone recomputing from it.** A player answers a gate-review card in the
browser; the browser port of `srs.mts::reviewCard(cardState, grade, now)` runs — for a brand-new
card this seeds `stability`/`difficulty` from the grade's `S0`/`D0` table (the gate-pass *is* the
first SRS review); for a reviewed card it computes `R = recallProbability(t, S)` at the
pre-review stability, then applies the lapse rule (`grade === 1`) or the growth rule
(`S' = S * (1 + 1.2*(1-R)*G)`) and clips difficulty to `[1,10]`. The result is written to
`localStorage`. The next time the map renders, `lightcone.mts::computeLightCone` recomputes the
whole reachable frontier fresh from every card's `(stability, lastReviewedAt)` at the current
`now` — a fixpoint BFS from `rootRooms` following only doors whose source room is currently
`full` or `embers` — so there is no stored "due" field to drift out of sync and no batch job to
run.

**A Hall's stability bonus.** `roomLightStates` looks up each room's Hall-bonus via
`hallBonusByRoom` (`STABLE_HALL_BONUS = 1.25` when the room sits in a currently-stable Hall,
computed fresh at every read) and multiplies it into the *effective* stability used only for that
one `recallProbability` computation — the raw stored `S` on the card is never touched. Edit the
corpus so a cross-link disappears and a Hall loses stability: the bonus reverts on the next
light-cone computation, with nothing to migrate.

## 7. Deployment view

`node web/server.mjs` (env `PORT`/`HOST`, defaults `8080`/`127.0.0.1`) serves the self-contained
`web/` directory — the compiled world JSON is copied into `web/data/` at build time specifically
so the server never needs to reach outside its own root. There is no `DEPLOY.md` for this
service (§11) — a real gap, though low-stakes relative to the payment-bearing sibling services,
since there is no payment credential or durable-state risk a deploy doc would need to protect
against here. The actual operational risk a missing `DEPLOY.md` carries: where the corpus that
`compile:weiqi` reads lives in production, and who re-runs the build when it changes.

## 8. Crosscutting concepts

- **Replay.** No seed, no adversarial win claim to verify a client isn't lying about. What exists
  is real: a compiled `World` is a deterministic function of a corpus's on-disk contents, and
  every scheduling function is a deterministic function of `(cardState, grade, now)` — a sequence
  of reviews replays identically given the same inputs, exercised directly by
  `web/test/smoke.test.mts`'s 30-day simulation.
- **No LLM-generated content.** `cards.mts`'s five generation rules are all rule-based text
  extraction/manipulation over the corpus's own strings; the module has no dependency capable of
  a generative call even if it wanted one, per §2's zero-deps constraint.
- **Accessibility.** Every room is a focusable `role="button"` SVG element; arrow keys move focus
  to the nearest room in that screen direction; one shared `aria-live="polite"` announcer covers
  room-state and review-result changes; `prefers-reduced-motion` (or an in-app override) is
  decided in exactly one place and gates the flicker/pulse CSS animations.

## 9. Decisions

- **No stateful scene module, by design.** `web/server.mjs`'s complete route surface is read-only
  static serving; the only place player state is ever written is `web/js/state.js`'s
  `localStorage` call. The only `writeFileSync`/persistence call anywhere in `src/` or
  `web/server.mjs` is `compile.mts`'s own build-time write of the compiled `World`, not player
  state.
- **`compileWing`'s "purity" is scoped to "deterministic given disk contents," not no-I/O
  purity** — see §5.
- **The archival-file skip (`isArchival`, a `provenance:` frontmatter field) is a v1 compiler
  extension beyond `DESIGN.md`'s literal text**, applying the same shape-not-name discipline the
  rest of the compiler uses, per the corpus's own `provenance-policy.md` convention ("nothing
  outside `recovered-research/` gets a `provenance:` field").
- **Kata linearization uses DFS-postorder because Hall subgraphs are not guaranteed acyclic.**
  This corpus's `## Related terms` cross-links form genuine cycles; DFS-postorder-reversed is a
  strictly weaker, always-terminating guarantee (a deterministic linearization, every room
  visited exactly once) chosen over a plain topological sort, which is undefined on a cyclic
  graph.

## 10. Quality

`npm test` runs 76 tests in `src/` (1 skipped unless `$WEIQI_ROOT` points at a real corpus);
`npm run test:web` runs 10 in `web/`. `fca.test.mts` includes a worked example against the real
weiqi corpus's own `cites` field; `stability.test.mts`'s cases (bare chain, disconnected,
over-braced redundant cross-link, door-and-reverse deduplicated as one edge) are structural
tests, not single fixed examples. `web/test/parity.test.mts` asserts a hand-ported browser copy
of a `.mts` module hasn't drifted via bit-identical assertions across a grid of inputs.

## 11. Risks and technical debt

1. **No `DEPLOY.md`.** Named in §7 — low-stakes relative to the payment-bearing services, but real.
2. **No accounts/ledger/payments layer.** Blocked on the fleet's shared-identity decision (see
   `ROADMAP.md`); `DESIGN.md` §7 names the intended seam (player-state export/import).
3. **`compile.mts`'s CLI is manually invoked** (`npm run compile:weiqi`, requiring `WEIQI_ROOT`) —
   nothing re-compiles `data/world-weiqi.json` automatically when the source corpus changes, and
   `web/data/` goes stale if `build:web` isn't re-run afterward.
4. **No `@561-group/cartridge` adoption yet** — see `ROADMAP.md`.
5. **`compile.mts` mixes a large pure orchestration function with file-I/O helpers in one file**
   (the largest module) — a future split (a pure `compileFromFiles` core plus a thin
   `walkAndRead` I/O shell) would make the "deterministic given disk contents" property testable
   without a real filesystem.

## 12. Glossary

**Wing** — any directory of frontmattered markdown with link-shaped fields; the compiler's one
unit of input. **Room** — one markdown file. **Door** — a directed prerequisite→dependent edge,
hard (frontmatter-derived) or soft (body-link-derived, promotable to hard). **Hall** — a genuine
FCA closed concept: a maximal set of rooms sharing an exact attribute set. **Light cone** — the
currently-walkable frontier, recomputed fresh on every read. **Territory** — every room whose
gate has ever been passed; permanent, monotonic.

## 13. Ludics

- **Core loop.** Review a due card → SRS updates → the light cone recomputes → repeat, or run a
  kata, or take a daily lantern-walk. There is no "win," only sustained remembering — forgetting
  is not a failure state, it's a fog that lifts the moment you look again.
- **Skill expression.** The core skill is a player's own memory and study discipline, mediated by
  an honestly-simplified but real spaced-repetition schedule. Kata mode adds a timed-recall axis
  (`Tfast`, self-relative, never a global reflex gate) on top.
- **Kind-design constraints.** No energy/lives gate on reviewing, no rewarded ads, no leaderboard
  pressure, no streak-loss shaming copy, no LLM-generated cards. Players never write to the
  shared corpus — a deliberate boundary, see `ROADMAP.md`.
