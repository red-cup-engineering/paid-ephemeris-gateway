# education-platform-service

The self-education platform: a theme-neutral kernel (corpus-compiler, deterministic FSRS-lite
SRS, a pluggable `Checker<Spec,Answer>` exercise-gate interface, a mastery synthesis, local-first
player-state persistence, earn-only rails hooks stubbed to the flickering-delve
`PaymentProvider` shape) plus **Equivo**, theme #1: a Duolingo-style course that teaches
equivalence by measuring obstruction, over real bilattice descent and cohomology computed by
`@lenticule-science/metrologic` -- an equivalence judgment the player makes IS a computation the math package
verifies, at both content-build time and play time.

See `DESIGN.md` for the architecture and the decisions made building it, `ROADMAP.md` for what's
deliberately not in v1. The full design rationale for the platform and for Equivo specifically
lives in the source design docs this build implements:
`public-web-game-services-section/content/text/documents/articles/notes/self-education-platform-design.md`
and `.../equivo-design.md` (same tree, `zbd-micropayment-rails.md` for the earn-only stubs).

## Run it

```
npm install                # local Verdaccio registry, see .npmrc
npm run check && npm test              # check-mts + node --test: kernel + Equivo unit tests (163 tests)
npm run build:web && npm run test:web  # build the web face, then its own test suite (43 tests)
npm run build:web           # compile the Equivo corpus + vendor browser modules
npm run serve                # http://127.0.0.1:8080/  (env: PORT, HOST)
```

`npm run build:web` must run at least once (or via `verify:web`) before `serve` -- the served
`web/` directory needs `web/data/equivo-world.json` (the compiled course) and `web/js/vendor/**`
(mechanically stripped browser copies of the kernel/theme `.mts` modules the app imports, plus a
byte-identical copy of the `@lenticule-science/metrologic` sources the checkers call) to exist on disk.

No accounts, no server-held player state -- everything a player does lives in their own browser's
`localStorage`, exportable/importable as JSON from the header controls.

## Deploy

Equivo is its own Cloudflare Worker (`wrangler.jsonc` in this directory), serving `web/` straight
off disk via a Workers static-assets binding -- no Cloud Run origin, no proxy through the shared
`cloudflare-router` (per the 2026-08-31 GCP exit ruling: GCP billing is permanently off, and the
Cloud Run game fleet is migration inventory, not outage). `web/.assetsignore` excludes
`server.mjs`, `build/`, and `test/` from the deployed asset set.

```
npm run deploy    # build:web, then wrangler deploy
npm run dev       # build:web, then wrangler dev -- local preview of the deployed shape
```

`custom_domain: true` in `wrangler.jsonc` attaches `equivo.561.group` and provisions its DNS
record. `npm run serve` (`web/server.mjs`) remains a thin `node:http` + `sirv` dev/test
convenience only; it is never what production serves.

## Layout

```
src/                platform kernel: frontmatter parser, FCA (halls), SRS, hall-stability
                     (pebble game), light-cone-style gate/mastery types, the Checker interface,
                     mastery synthesis, session engine (deterministic seeded ordering),
                     localStorage-shaped persistence. One *.test.mts per module.
themes/equivo/       Equivo's six-type checker registry (real @lenticule-science/metrologic calls), four
                     presentation-register lenses (three populated, one honestly absent), the
                     corpus (Unit 1: The Descent, 7 rooms / 30 exercises), the extraction rule
                     that compiles fenced ```equivo-exercise``` JSON blocks into exercises, and
                     the content-validation suite that independently re-derives every exercise's
                     correct answer from real math before asserting the checker agrees.
web/                 the served face: server.mjs (thin development static server), index.html
                     + css + a small vanilla-JS app, web/js/vendor/** (generated, see below),
                     web/data/equivo-world.json (generated), web/test/** (server smoke tests +
                     a vendor-vs-real checker parity suite).
data/world-equivo.json   engine-side compiled-world fixture (generated, mirrors web/data/).
```
