# Vendored: @red-cup-engineering/fizzos 0.2.1

**Vendored 2026-08-19** by claude-fable-5, as part of shipping Farstone gen-3 to Cloud Run.

## Why this exists

Farstone's `package.json` pins `@red-cup-engineering/fizzos@0.2.1`. Local dev resolved
that dependency via a live symlink at `node_modules/@red-cup-engineering/fizzos` pointing
at the active source tree:

```
.../engineering-services-section/services/computer-services-section/services/computer-systems-services-section/services/computer-mud-services-section/apps/fizzos
```

That symlink is correct and current for local dev (kept, untouched, as the house
convenience path) but does not survive a container build: `gcloud run deploy --source`
tars the build context, and a symlink pointing outside that context either breaks or
resolves to nothing inside the image.

Checked whether the fix could simply be "install the real dependency instead": `npm view
@red-cup-engineering/fizzos --registry http://127.0.0.1:4873` shows only **0.2.0**
published to the house Verdaccio registry, one patch behind the 0.2.1 the active source
tree and Farstone's own `package-lock.json` are actually on. So the deployable resolution
is to vendor the active 0.2.1 tree directly into Farstone's own source, per house doctrine
(vendor with provenance, don't silently downgrade to what happens to be published).

## What was copied, and what was deliberately left out

Source: the live tree above, read-only, as it stood 2026-08-19. Copied:

- `package.json` — trimmed to only the `exports` entries this vendor tree actually
  contains (dropped `./examples/garden`, `./examples/teraum`, and the `bin` scripts —
  see below), and to a `files` list matching what's actually here. Everything Farstone's
  own source imports (`/engine`, `/http`, `/mud-server`, `/persistence`, `/capabilities`,
  `/world`, `/world-clock`, `/game`, `/progression`) is still exported unchanged.
- `src/` — the complete FizzOS kernel source, unmodified, byte-for-byte from the active
  tree (188K, 35 `.mjs` files). Confirmed via source read that nothing under `src/` does
  a runtime filesystem read of `content/`, `examples/`, or `scripts/` — those directories
  are dev/CLI/doc surface, not part of the running kernel, so none of them were vendored.
- `deps/@561-group/math@0.1.0` — fizzos's own sole runtime dependency, copied from
  fizzos's own `node_modules` (already a real installed directory there, resolved from
  Verdaccio, not a symlink). **Not** placed at `node_modules/@561-group/math` inside this
  vendor tree: `gcloud run deploy --source` derives its upload ignore-list from
  `.gitignore` when no `.gcloudignore` exists, and this tree's `.gitignore` has
  `node_modules/` — an unanchored pattern that matches a directory with that name at ANY
  depth, confirmed live (2026-08-19, second build failure) to silently drop a nested
  `vendor/.../node_modules/@561-group/math` from the build context even though the rest of
  `vendor/` made it through. Living at `deps/` instead sidesteps that ignore rule entirely;
  the `Dockerfile` moves it into the real `node_modules/@561-group/math` position inside
  the image, after `COPY`, alongside the parallel fix for the top-level fizzos symlink.
  `@561-group/math` itself declares zero dependencies.

**Deliberately excluded, and never read/copied by any command this session**:
`examples/` (includes `examples/teraum.mjs` — nothing under this repository is permitted
to touch anything named `teraum`; excluding the whole `examples/` directory keeps that
guarantee structural rather than relying on a careful copy), `scripts/` (the `fizzos-*`
CLI binaries — Farstone's server never shells out to them), `content/` (docs/reports, not
imported by `src/`), `test/` (fizzos's own test suite — irrelevant to a vendored runtime
copy; farstone's own suite is what proves this vendored copy actually works, see
`../../src/*.test.mts` and `../../src/world-store.test.mts`).

## Keeping it current

This is a snapshot, not a live mirror. If the active fizzos source tree changes in a way
Farstone depends on, this vendor directory needs a fresh copy (repeat the same
`src/` + `package.json` + nested `@561-group/math` copy, re-trim `package.json` the same
way, re-run Farstone's full test suite). Local dev is unaffected either way — it keeps
using the live symlink, never this directory.

## How the container gets it

`node_modules/@red-cup-engineering/fizzos` in this tree is still the live dev symlink.
Farstone's `Dockerfile` replaces it after `COPY . .`: builds
`node_modules/@red-cup-engineering/` fresh, copies this `vendor/@red-cup-engineering/fizzos/`
directory into place as `node_modules/@red-cup-engineering/fizzos`, then moves
`deps/@561-group/math` from inside that copy to its real
`node_modules/@red-cup-engineering/fizzos/node_modules/@561-group/math` position — so the
built image never depends on the symlink resolving, and never depends on anything named
`node_modules` having survived the source upload unmodified.
