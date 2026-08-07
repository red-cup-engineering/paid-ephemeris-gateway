# koios-news

**Koios.
News** — a collapse-aware news publication at **koios.news**, and an autonomous content mill.
This one repo is three things: the deployable **site** (a served 561-group workspace package), the **mill** that writes it, and the editorial **workshop** around both.

```
koios-news  (this repo)
├─ package.json  @emsenn/koios.news — the served workspace package
├─ content-production.config.json  content-farm instance configuration
├─ src/          site app, theme, content store read, view counter, the mill
├─ AGENTS.md     "You are Nik Koios" — identity, Koios Thought, voice
├─ working/      the job, as gerunds (each a skill + its tools)
│   ├─ researching/  · writing/  · editing/
├─ memory/       what is true now, across sessions
├─ dev/docs/     dev journal
├─ content/  → koios-news-content   the content store (posts/, authors/, rejected/)
└─ data/     → koios-news-data       logs/ (jsonl traces) + records/ (json)
```

## The served site (`src/`)

`@emsenn/koios.news` is a workspace package on the 561.group serving pattern (web-server app, port 18802).
It reads the content store — markdown posts with front matter in `content/posts/` — through the front-matter codec, projects each post into a news claim set with witnessed provenance, and serves the full newswire surface set:

- item pages with **NewsArticle JSON-LD** and h-entry microformats, at `/posts/<slug>`
- a summary **homepage** and `/about`
- **RSS** (`/feed.xml`), **Atom** (`/feed.atom`), **JSON Feed** (`/feed.json`), h-feed
- web and Google News **sitemaps**, `robots.txt`, ninjs artifacts
- the public **gate audit** (`/newswire-audit.json`) — every post's editorial evidence
- **ad slots** (render only when `KOIOS_NEWS_AD_CLIENT` is configured) and a **privacy-light view counter**: a `POST /hit` beacon (path + referrer host only — no IPs, no cookies, no identifiers) appending to an append-only trace, folded at `/views.json`

```sh
pnpm --filter @emsenn/koios.news run serve   # http://127.0.0.1:18802
pnpm --filter @emsenn/koios.news run verify  # typecheck
pnpm --filter @emsenn/koios.news run deploy:probe  # wait for public/newsroom readiness after restart
```

Env: `KOIOS_NEWS_HOST` / `KOIOS_NEWS_PORT`, `KOIOS_NEWS_AD_CLIENT` (AdSense publisher id), `KOIOS_NEWS_DATA` (view-trace and mill-trace directory).

## The mill (`content-production.config.json`)

One cycle is one invocation; recurrence is cron's job:

```sh
pnpm --filter @emsenn/koios.news run mill
```

The cycle is the shared `@emsenn/content-production/content-farm` engine, with Koios declared as an instance config: seed terms, beat sources, Search Console property, front-matter namespace, voice, model, gates, content store, and data store.
Demand folds seed terms, earned views, Search Console material from `data/records/search-console.json` when present, and coverage decay.
Runs append to `data/logs/mill-runs.jsonl`; records live under `data/records/`.

## The workshop

An agent launched in this repo *is* Nik Koios (the editor).
`AGENTS.md` is the identity; the skills under `working/` are the job for sessions where Nik works a story by hand; `memory/` and `dev/docs/journal/` carry durable state and the narrative record.

## Cloning everything

```sh
git clone --recurse-submodules git@github.com:emsenn/koios-news.git
```
