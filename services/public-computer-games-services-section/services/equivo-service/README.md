# education-platform-service

The shared self-education platform: a theme-neutral kernel (corpus compiler, deterministic
FSRS-lite SRS, pluggable `Checker<Spec,Answer>` exercise gates, mastery synthesis, local-first
player-state persistence through `browser-local-state-service`, and earn-only rails hooks) plus
course themes. **Equivo** remains its current app. The `iyappy` theme compiles a course with 3
rooms and 12 checks. On 2026-09-02, the public iYappy course used VICTOR 0.1.7, TUFTE 0.8.2, and
education-platform-service 0.2.2, deployed in Worker `41dd3c9f-b017-4425-b37f-1f346fc33b38`.

The browser surface exports `mountEducationApp({ root, adapter })`. Equivo is now a thin adapter
and bootstrap over the shared controller, state, and review surface; iYappy is a configured
projector over the same surface. Public websites use
`createEducationProjector({ mountPath, course, brand })` from `./projector` and the `iyappy`
preset from `./themes/iyappy`; course policy and configuration remain with the consuming site.

See `DESIGN.md` for the architecture and the decisions made building it, `ROADMAP.md` for what's
deliberately not in v1. The full design rationale for the platform and for Equivo specifically
lives in the source design docs this build implements:
`public-web-game-services-section/content/text/documents/articles/notes/self-education-platform-design.md`
and `.../equivo-design.md` (same tree, `zbd-micropayment-rails.md` for the earn-only stubs).

## Run it

```
npm install                # local Verdaccio registry, see .npmrc
npm run check && npm test              # check-mts + node --test: kernel and course-theme tests
npm run build:web && npm run test:web  # build the web face, then its own test suite
npm run build:web           # compile the configured course + vendor browser modules
npm run serve                # http://127.0.0.1:8080/  (env: PORT, HOST)
```

`npm run build:web` must run at least once (or via `verify:web`) before `serve`; it produces the
compiled course and browser modules the selected app imports.

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
themes/iyappy/       iYappy's course preset, finite Lakota exercise registry, compiler, browser adapter,
                     and content tests.
web/                 Equivo's development face and generated browser artifacts; public sites compose the
                     shared browser app through `createEducationProjector()`.
data/world-equivo.json   engine-side compiled-world fixture (generated, mirrors web/data/).
```
