# Legacy archive: what actually serves https://koios.news

Captured 2026-07-17 from the VPS `red-cedar-gate` (`45.76.19.133`, SSH alias
`red-cedar-gate` / `koios.news` in `~/.ssh/config`), read-only, via `rsync`.
Nothing on the VPS was modified to make this archive.

This is a frozen snapshot, not a live mirror and not a runnable checkout.
Per the root `CLAUDE.md`: archive does not mean dead — this is prior art to
consult, not a place to build on directly. The **live development copy**
remains `../../../sites/koios.news` (this settlement's own git submodule,
`github.com:emsenn/koios-news.git`). Consult *that* for anything you intend
to change; consult *this* to see what is actually running in production and
to recover code that has no other home in this monorepo (see below).

## Why this exists, not just the git submodule

`../../../sites/koios.news`'s tracked source (`src/`, `package.json`, etc.)
was, at capture time, already byte-identical to the VPS at commit
`74d43393dc9d3c907f5af617d9353c88358625da` (2026-06-20) — same for its
`content` submodule (`9e9cca4fdcbaba52b72a542449b69a13ee5a471a`,
`github.com:emsenn/koios-news-content.git`) and `data` submodule
(`b89c3ba7e8e7dfb90ab41e6733a67b5607b4788f`,
`github.com:emsenn/koios-news-data.git`). So this archive is *not* the
answer to "what changed in koios.news's own source" — the submodule is.

What only exists on the VPS, and is now only here:

- **The 19 packages koios.news actually imports at runtime**, resolved by
  walking every `node_modules/@emsenn/*` workspace symlink transitively from
  `sites/koios.news`'s own `package.json`. All but one (`lib/relating`) are
  plain directories inside the VPS's `~/561-group` monorepo — a different,
  older monorepo than this one (`~/info`) — with no independent git remote
  and no seat anywhere in this repo. If this archive didn't capture them,
  they would have no copy outside that one VPS.
- **`dist/`** under `sites/koios.news/` — the actual compiled output the
  three live processes run (see below), gitignored everywhere so the
  submodule checkout never carries it.

## How it is actually served (as observed on the VPS, 2026-07-17)

Caddy (`~/.config/caddy/Caddyfile`) terminates TLS and reverse-proxies by
domain to three Node processes, all long-running (`pm2`/systemd are not
used — plain backgrounded `node --run serve`), all with cwd
`~/561-group/sites/koios.news`:

| Domain                | Port  | Process               |
|------------------------|-------|------------------------|
| `koios.news`           | 18802 | `node dist/server.mjs` |
| `newsroom.koios.news`  | 18803 | `node dist/newsroom-server.mjs` |
| `filum.561.group`      | 18804 | `node dist/cable-server.mjs` (the newscable koios.news reads) |

All three are entrypoints of the *same* `@emsenn/koios.news` package — there
is no separate "cable" or "newsroom" site directory; `filum.561.group` and
`newsroom.koios.news` are just other domains pointed at other `dist/*.mjs`
files this one package builds.

## Layout of this archive

Mirrors the VPS's own path layout under `561-group/`, so the relative
symlink targets recorded below still make sense to a reader:

```
561-group/
  sites/koios.news/          the site itself (incl. dist/, content/, data/, store/)
  lib/<name>/                16 of the 19 dependent packages
  services/http-server/      the 19th
```

Full dependency list (`sites/koios.news` → transitive `@emsenn/*` workspace closure):
`lib/animating`, `lib/communicating`, `lib/communicating-in-english`,
`lib/computing`, `lib/computing-with-http`, `lib/computing-with-the-web`,
`lib/content`, `lib/content-production`, `lib/gaming`, `lib/knowing`,
`lib/organizing`, `lib/organizing-a-content-farm`,
`lib/organizing-a-knowledge-vault`, `lib/playing`, `lib/producing-content`,
`lib/relating`, `lib/relating-experimental`, `lib/socializing`,
`services/http-server`.

Of these, only `lib/relating` is itself a proper git submodule on the VPS
(`github.com:emsenn/relating.git` at `6875fca15eb6b915ae00d6ff0e983efaf7f1db1b`);
the other 18 are plain directories with no independent git history.

## What was excluded, and why

- **`node_modules/` and `.git/`**, everywhere. `node_modules` here is
  almost entirely `workspace:*` symlinks back into this same package set
  (already captured as real directories) plus a couple of small pnpm-linked
  externals (`typescript`, `citeproc`) — regenerable, not archived.
  `.git/` was dropped rather than nested, since a `.git` directory inside a
  path already tracked by this repo's own git would be misread as a
  submodule boundary. Provenance for the pieces that do have their own git
  history is recorded above instead.
- **Secrets**: none were found (`.env*`, `*secret*`, `*credential*`,
  `*.pem`, `*_key*` were searched for across every copied path before
  syncing; the only hits were article titles containing the word
  "secret").

## Scope note

"All its dependents" was resolved as the full transitive closure of
`@emsenn/*` workspace packages koios.news's compiled output actually
imports — not every site Caddy happens to route on this VPS (`561.group`,
`aagaard.561.group`, etc. are unrelated properties and are not part of this
archive).
