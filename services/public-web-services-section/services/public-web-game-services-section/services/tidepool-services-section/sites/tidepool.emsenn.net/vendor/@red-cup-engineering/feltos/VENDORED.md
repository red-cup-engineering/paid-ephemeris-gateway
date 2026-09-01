# Vendored: @red-cup-engineering/feltos 0.5.0

**Vendored 2026-08-27**, replacing the prior `@red-cup-engineering/fizzos@0.2.1` vendor copy as
part of migrating Tidepool from FizzOS (old engine name) to FeltOS (current engine name) —
FeltOS is FizzOS renamed plus new features (`./director`, `./factions`); the public API surface
Tidepool actually uses (`createEngine`/`join`/`submit`/`step`, `perceive`, the world model) is
unchanged in shape. Same house pattern as the original fizzos vendoring
(farstone precedent, recorded in this file's own prior revision — see git history for the full
fizzos-era account), same reasoning, same shape, updated facts below.

## Why this exists (unchanged reasoning, restated for feltos)

Tidepool's `package.json` pins `@red-cup-engineering/feltos@0.5.0`. Local dev resolves that
dependency the normal way — `npm install --registry http://127.0.0.1:4873`, a genuine,
non-symlinked directory under `node_modules/@red-cup-engineering/feltos`, exactly like
`qwzspace` and `arnold` already do.

`gcloud run deploy --source` tars the build context and Cloud Build has no access to the house
Verdaccio registry (127.0.0.1:4873, local-only) at build time — so whatever ships in the image
has to already be present in the tree at `COPY . .` time, not fetched by `npm install` during
the build. That's true regardless of whether `node_modules/@red-cup-engineering/feltos` is a
live symlink (the old fizzos-era problem, when the active source tree ran ahead of what
Verdaccio had published) or a normal Verdaccio-resolved copy.

**Notable difference from the fizzos-era vendoring, flagged for a human decision**:
`npm view @red-cup-engineering/feltos version --registry http://127.0.0.1:4873` returns
**0.5.0** — an exact match with the active source tree's own `package.json`
(`.../multi-agent-computer-platform-engineering-services-section/apps/feltos/package.json`),
confirmed by reading both directly. Unlike the fizzos situation this vendoring is replacing
(Verdaccio was one patch behind, at `0.2.0`, forcing a choice between vendoring and silently
downgrading), there is currently **no version gap** — a plain `npm install` genuinely resolves
the same bytes this vendor copy holds. Vendoring here is therefore a **provenance/pinning
choice, not a forced one**: it guarantees the Cloud Run image always ships the exact audited
snapshot below regardless of what Verdaccio happens to hold at some future `npm install` time,
matching house doctrine ("vendor with provenance, don't silently depend on rolling registry
state") and keeping this deploy's shape identical to the fizzos-era precedent it replaces. If a
human reviewing this migration would rather drop vendoring now that the versions genuinely
match (treating feltos exactly like qwzspace/arnold — a normal pinned dependency, real
node_modules copy, no vendor/ directory, no Dockerfile swap step), that is a legitimate
simplification this file did not make unilaterally; see the migration report for this note.

## What was copied, and what was deliberately left out

Source: **`npm pack @red-cup-engineering/feltos@0.5.0 --registry http://127.0.0.1:4873`**,
extracted read-only, then diffed byte-for-byte against the active source tree's own `src/` to
confirm the tarball and the tree agree (they do — no drift, consistent with the version match
above). Copied:

- `package.json` — reused the real published `package.json`'s `exports` map verbatim (every
  subpath Tidepool's own source imports — `/game`, `/four`, `/engine`, `/capabilities`,
  `/world`, `/world-clock`, `/ecology`, `/market`, `/crafting`, `/predication`, `/progression`,
  `/fields`, `/communicating`, `/knowing`, `/soul`, `/mud-server`, `/persistence` — resolves
  unchanged), trimmed to drop `./examples/garden` and `./examples/teraum` (same exclusion as the
  fizzos-era copy; per that copy's own standing rule, nothing in this repository is permitted to
  touch anything named `teraum`) and the `bin` scripts (`feltos`, `feltos-serve`, `feltos-world`,
  `feltos-tell`, `feltos-look`, `feltos-tick` — Tidepool's server never shells out to them), and
  to a `files` list matching what's actually here. `dependencies` is trimmed to the ONE package
  this vendor copy's `src/` actually needs at runtime for the surfaces Tidepool imports — see
  below — rather than reproduced verbatim from the real feltos `package.json` (which now lists
  nine).
- `src/` — the complete FeltOS kernel source, unmodified, byte-for-byte from the tarball (41
  `.mjs` files — this tree has grown by two files since the fizzos-era copy: `director.mjs` and
  `factions.mjs`, feltos's own new emergent-quest-demand and faction-tension modules, exported at
  `./director`/`./factions`. Tidepool does not import either — this migration does not adopt
  them — but per the same "copy `src/` whole, don't singling out files" discipline the fizzos-era
  copy used, they're included unmodified rather than surgically excluded).
- `deps/@lenticule-science/metrologic@0.1.0` — copied from feltos's own `node_modules`
  (already a real installed directory there, resolved from Verdaccio, not a symlink; zero
  dependencies of its own). This is feltos's renamed successor to the fizzos-era
  `@561-group/math` dependency — same math package, new home, confirmed by reading `four.mjs`
  in both trees: fizzos's imported `joinKnowledge` from `@561-group/math/bilattice/charge`;
  feltos's imports the identical function from `@lenticule-science/metrologic/bilattice/charge`.
  **Not** placed at `node_modules/@lenticule-science/metrologic` inside this vendor tree, for the
  identical reason the fizzos-era copy recorded: `gcloud run deploy --source` derives its upload
  ignore-list from `.gitignore` when no `.gcloudignore` exists, and an unanchored `node_modules/`
  pattern matches at any depth — living at `deps/` instead sidesteps that ignore rule entirely;
  the `Dockerfile` moves it into the real
  `node_modules/@red-cup-engineering/feltos/node_modules/@lenticule-science/metrologic` position
  inside the image, after `COPY`, alongside the parallel fix for the top-level feltos directory.

**Deliberately excluded from `dependencies`, and never wired into this vendor copy's runtime**:
the real feltos 0.5.0 `package.json` lists eight more scoped dependencies —
`@red-cup-engineering/animating`, `communicating`, `computing`, `gaming`, `knowing`,
`organizing`, `playing`, `socializing` — all of them imported by exactly one file,
`src/faculties.mjs` (confirmed by grepping every `.mjs` file in `src/` for a non-relative,
non-`node:` import — `faculties.mjs` is the only file that has one, besides `four.mjs`'s own
`@lenticule-science/metrologic` import). `faculties.mjs` is reachable only through feltos's own
root `"."` export (`index.mjs`) and its own `./faculties`/`./faculty-cover` subpaths — Tidepool
imports neither (confirmed by grepping this repository's own `src/*.mts` for every
`@red-cup-engineering/feltos` import: every one names a specific subpath — `/engine`, `/world`,
`/capabilities`, `/ecology`, `/market`, `/crafting`, `/predication`, `/progression`, `/fields`,
`/communicating` [feltos's OWN `communicating.mjs`, not the external package of the same name],
`/knowing` [likewise feltos's own `knowing.mjs`], `/world-clock`, `/soul`, `/mud-server`,
`/persistence`, `/four`, `/game` — never the bare `"."` specifier). So none of those eight
packages are ever actually required for anything this vendor copy's runtime does, and they are
not installed anywhere this tree's `node_modules` can see. Validated directly, not just argued:
with `node_modules/@red-cup-engineering/feltos` repointed to this vendor copy (its declared
`dependencies` containing only `@lenticule-science/metrologic`, nothing else present in
`node_modules/@red-cup-engineering/`), Tidepool's full `npm run verify` passed unchanged (see the
migration report for the exact count) — the vendor copy is a working substitute for everything
Tidepool actually touches, not merely a plausible-looking one.

**Also deliberately excluded, unchanged from the fizzos-era policy, and never
read/copied by any command this session**: `examples/` (includes `examples/teraum.mjs` — see
above), `scripts/` (the `feltos-*` CLI binaries), `content/` (docs/reports, not imported by
`src/`), `test/` (feltos's own test suite — Tidepool's own suite, run directly against this
vendor copy as described above, is what proves it actually works).

## Keeping it current

This is a snapshot, not a live mirror. If the active feltos source tree changes in a way
Tidepool depends on, this vendor directory needs a fresh copy (repeat the same `src/` +
`package.json` + nested `deps/@lenticule-science/metrologic` copy, re-run Tidepool's full
`npm run verify`). Local dev is unaffected either way — it resolves
`@red-cup-engineering/feltos` the normal way, via `npm install` against Verdaccio, never this
directory.

**Standing follow-up, carried over from the fizzos-era note but now genuinely open** (see the
"Notable difference" callout above): now that Verdaccio's published `feltos` and the active
source tree agree exactly, a human may reasonably decide vendoring no longer earns its
complexity for this package and drop `vendor/` + the Dockerfile swap step entirely, treating
`feltos` exactly like `qwzspace`/`arnold`. This file does not make that call; it only vendors,
as the fizzos precedent did, because that is what was asked for this migration.

## qwzspace and arnold: NOT vendored, and why that's still correct

`@red-cup-engineering/qwzspace@0.4.1` and `@red-cup-engineering/arnold@0.2.0` are both genuinely
current on Verdaccio (checked directly against the published tarballs, not assumed from any
source tree). Both are normal, pinned `dependencies`/`optionalDependencies` in `package.json` —
no vendoring, no symlink, nothing this file needs to track. (qwzspace moved from `0.3.0` to
`0.4.1` as part of this same migration — see the migration report for the API-compatibility
check across that range; nothing in it required a vendor copy or a code change to Tidepool's own
qwzspace seam.)
