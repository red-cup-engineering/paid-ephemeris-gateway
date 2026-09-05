# Ruinfold Daily

A seeded-daily single-player roguelike run engine. Every player who plays on a given UTC day
faces the same dungeon, generated deterministically from the date. A run is submitted to the
server as an ordered log of moves; the server replays that log against the same seed to compute
the score itself, so nothing about scoring or the leaderboard trusts a client-reported result.
The engine has zero external dependencies and runs as plain `.mts` (TypeScript type-stripped
natively by Node).

Core mechanics:

- **Deterministic daily dungeon** — the UTC date hashes to a 32-bit seed; the same seed always
  produces the same floors, monsters, boss, relic, and hazard placement.
- **Move-log replay as anti-cheat** — clients submit `{tick, seq, intent}` moves, not a claimed
  score. The server rebuilds the dungeon from the seed and replays the log itself.
- **Five-way bilattice death model** — a run can end mortal, undead (a relic lets you rise instead
  of ending), construct (a void hazard un-makes the attempt entirely), cursed, or named (boss
  kill). See `src/engine/death.mts` and `src/engine/bilattice.mts`.
- **Leaderboard, weekly boons, and a daily-winner reward stub** — `src/server/leaderboard.mts`
  ranks scored runs; `src/server/rollover.mts` finalizes completed days/weeks;
  `src/server/reward-hook.mts` computes a "would-pay" ledger intent for the daily's top scorer
  (no payment provider is wired up — it only records the intent).

## Install / run

Requires Node 24+ (for native `.mts` type-stripping). No dependencies to install.

```
node src/server.mts
```

The server listens on `PORT` (default `8787`; `RUINFOLD_PORT` also works, `PORT` wins if both
are set) and binds `0.0.0.0` by default (override with `RUINFOLD_HOST`).

Storage backend is selected by environment:

- `RUINFOLD_BUCKET` unset — local JSONL files under `data/` (created next to `src/`).
- `RUINFOLD_BUCKET` set — Google Cloud Storage, using ambient service-account credentials from
  the GCE/Cloud Run metadata server (no key file needed). See `src/server/bucket-store.mts`.

A `Dockerfile` is included for deploying as-is to Cloud Run (or any container host): it copies
the tree and runs `node src/server.mts`, reading `PORT`/`RUINFOLD_BUCKET` from the environment.

The browser client lives in `web/` and is served by the same process (see Routes below).

## API

- `GET /daily[?date=YYYY-MM-DD]` — today's (or an earlier practice date's) seed and dungeon
  metadata. Only today's date is `"scored"`; any earlier date is `"practice"`.
- `POST /runs` — submit a run: `{ player, date?, seed?, mode?, moves }` (`moves` is the ordered
  `{tick, seq, intent}` log; `intentLog` is also accepted as an alias). The server replays the log
  server-side and returns the verified score. Today's date is always scored; only one scored
  submission per player per day is accepted.
- `GET /leaderboard/:date` — that date's scored runs, ranked by score, then tick, then submission
  time.
- `GET /replay/:runId` — the stored move-log for a run, for client-side spectating.
- `GET /boons/:player` — the active weekly boon for a player, if any.
- `GET /health` — liveness check plus today's UTC date.
- `GET /`, `/play`, `/watch`, `/web/*` — the browser client (static files from `web/`).
- `GET /engine/:file.mts` — the same engine source the server runs, type-stripped for the browser
  at request time, so the client simulates with the identical engine code.

## Tests

```
npm test
```

Runs the `node:test` suite in `src/tests/` (engine determinism, death rules, scoring, replay
tampering/fuzzing, leaderboard ranking, rollover/boons, the bucket-store against a fake GCS
backend, and the HTTP server end to end).
