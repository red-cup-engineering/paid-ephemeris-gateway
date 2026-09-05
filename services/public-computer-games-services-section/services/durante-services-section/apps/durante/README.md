# @red-cup-engineering/durante

A **QUAKE-like first-person shooter**, playable in a **browser**, on
[`@red-cup-engineering/abrash`](https://github.com) (the pixel/3D software raycaster engine). You walk a
level, strafe, and shoot a demon — the "first-playable proof" the legacy archive's README described,
ported from a terminal-only kitty/sixel demo to a `<canvas>` face with fully keyboard-complete controls
(no mouse, no pointer lock required).

```sh
npm install --registry http://127.0.0.1:4873/
npm test           # node --test src/*.test.mts src/server/*.test.mts agents/*.test.mts — real, run
                    # fresh before every claim below (see "Real test counts" for the current total)
npm start          # serves the browser client (and the daily tournament routes) at http://localhost:8788/
npm run terminal   # play (or watch --headless, or --daily) durante from a terminal, no browser at all
npm run agent      # run the reference AI entrant against a live server (see "The daily tournament")
```

## The three twists — THE LAW, played as mechanics

durante does not decorate a normal shooter with paraconsistent flavor. Each of its three core systems
**is** a reading of the bilattice the substrate holds — ⊤ is a designed mechanic here, never a debug dump.

### 1. The arena is a MERGE OF TRACES (`arena`)

A deathmatch level is not authored once. It **settles from the federated union ∥** of every player's
wall-trace. Two peers who lay the **same** wall agree — it settles **t**. Two peers who **disagree** —
alpha builds a wall, beta carves it open — leave that cell **⊤**: a **contested wall** that **shivers**
(abrash's pixel readout) AND is a **PHASE GATE** you can walk through, precisely because nobody agrees it
is solid (`passContested`, on by default here).

### 2. The enemy is HELD ⊤ (`demon`)

A demon's **vitality is the FOLD** of its `alive` cell. Its spawn **affirms** `alive`; each wound
**denies** it. So between first blood and the kill the demon is **alive-AND-dead** — a held contradiction
**⊤**, the monster you cannot trust, still hunting but failing. It **settles to f (dead)** only when the
deny-evidence reaches the demon's `toughness`. **The kill is a SETTLE, not a subtraction.**

### 3. A weapon's effect is EVIDENCE you fold (`combat`)

The gun is **hitscan** — one ray down the crosshair. A landing shot does **not** subtract a hit-point; it
**appends `deny(demon, 'alive')`** — negative evidence on the demon's vitality. A wall **occludes** the
shot. You cannot wound a corpse. Every shot that lands is a witness the LAW keeps **linearly**.

## Play it in a browser

```sh
npm start
# open http://localhost:8788/
```

**Controls (fully keyboard-complete — no mouse required):**

| Key | Action |
|---|---|
| `W` / `↑` | move forward |
| `S` / `↓` | move backward |
| `A` / `←` | turn left |
| `D` / `→` | turn right |
| `Q` / `E` | strafe left / right |
| `Space` | fire (hitscan, edge-triggered — holding it down does not auto-fire) |

Movement is **held-key continuous** (every `requestAnimationFrame`), matching how a browser FPS is
expected to feel — a deliberate divergence from the legacy terminal bin's one-shot-per-keypress scheme.
See `DESIGN.md` for the full account of every change made porting to the browser, including two honestly
disclosed additions that are **browser-face-only, not part of the deterministic core**: the ammo counter
and the health readout. Neither is invented inside the pure `game.mjs`/`combat.mjs` modules; both are
computed in `web/main.mjs` over values the ported engine already produces.

## Deterministic core

`src/cartridge.mjs` binds the game into the house's `@561-group/cartridge` contract
(`createEngine`/`applyIntent`/`replay`/`serialize`/`deserialize`) and its own `verify(seed, configId,
intentLog)` proves: **the same seed plus the same intent log always replays to an identical world
state** (a stable `stateHash`, hashed over the world's actual content — see `cartridge.mjs`'s header for
why the raw `Map`-shaped state can't be hashed directly, and how `serialize()` fixes that). The intent
log is the house shape — `@561-group/cartridge/intent-log`'s `{ seq, intent }[]` envelope, built via
`appendEntry`, validated via `validateIntentLog` — see `game.test.mts`'s `DETERMINISM` tests, which this
port added (the legacy suite had no cartridge dependency to build one from).

`src/cartridge.mjs` also exports `createDailyEngine(date)` alongside the original `createEngine(seed,
configId)` — the fixed-arena constructor above is untouched, every existing determinism test above
still runs against the exact same `BLOOD_MERGE_ROWS` world. `src/manifest.mjs` is the open item the
port digest flagged ("`cartridge.mjs` exists but unwired... zero callers"): a real
`@561-group/cartridge/manifest`-validated `CartridgeManifest`, `seedPolicy: {kind: "daily-utc"}`, and a
`replayVerifier` built on `createDailyEngine` — `src/manifest.test.mts` proves it validates clean and
actually replays a daily deterministically.

## The daily tournament — AI and humans as peers

Per `gaming-enterprises-vision.md`'s §5c framing ("daily QUAKE tournaments that AI play when their
owners aren't looking"): one seeded arena per UTC day, entered through the SAME intent-log submission
route whether a human's browser/terminal client or an AI's headless client is playing.

- **`src/daily.mjs`** — `dailySeed(date)`: one deterministic seed per UTC date, forever. A documented
  port of `apps/ruinfold/src/engine/daily.mts`'s own function, `durante-daily:`-namespaced so the two
  games' seeds never collide, and adapted to read its SHA-256 digest as hex (rather than a raw Buffer)
  so the exact same function runs unmodified in the browser too, via `web/node-crypto-shim.mjs`.
- **`src/daily-arena.mjs`** — `dailyArena(seed)`: a seeded recursive-backtracker maze (a spanning tree
  by construction — every carved cell is reachable from every other one, no isolated pockets possible),
  federated with a small seed-derived variant sketch through `arena.mjs`'s own `mergeArena` (the SAME
  federated-merge mechanic the shipped fixed arena hand-authored, now regenerated fresh per day), then
  demons placed only on BFS-proven-reachable cells. `src/daily-arena.test.mts` independently
  re-verifies solvability across 366 dates (a full leap year) plus 20 raw stress seeds, reading the
  REAL merged abrash world (not the generator's own internal arrays) — the generator may never emit an
  unwinnable daily, checked two independent ways, matching `apps/ruinfold`'s own `dungeon.mts` +
  `dungeon.test.mts` discipline.
- **`src/run.mjs`** — `replayRun(date, runLog)`: the ONE function that turns a submitted intent log
  into a score. Structural validation of the WHOLE log first (tolerance policy: none — a malformed or
  out-of-order log rejects wholesale, no partial credit), then drives the REAL engine
  (`cartridge.mjs`'s `createDailyEngine` + `applyIntent`) tick-by-tick, stopping at the first terminal
  condition: `cleared` (every demon settled DEAD) or the `DAILY_TICK_CAP`=3000 tick-cap — durante's
  pure core has no player-death mechanic (see below), so those are the only two real endings.
- **`src/score.mjs`** — a cleared run scores `100000 + swift + survival` (swift dominates among clears —
  the "victory ticks" axis); a tick-cap run scores from landed wounds (`combat.mjs`'s own linear
  evidence) tie-broken down by grasp-time. Every clear outranks every non-clear, by construction.
- **`src/server/{dates,guard,leaderboard,store,bucket-store,store-factory}.mjs`** — vendored, with
  provenance headers, from `apps/ruinfold/src/server/*.mts`: pure UTC date arithmetic, the
  body-size/move-count/path-injection guards, the domain-agnostic ranking function, and the
  append-only JSONL persistence (local file-store or, via `DURANTE_BUCKET`, a GCS bucket-store with
  the same atomic conditional-write correctness ruinfold's live-proven store already has).
  `rankLeaderboard` is vendored **unmodified** — durante's own `ScoreRecord` satisfies its
  domain-agnostic `ScoreLike` shape verbatim.
- **`agents/reference-entrant.mjs`** — THE PROOF, not a fixture: a headless bot that fetches today's
  seed from the live `GET /daily`, plays it locally through the real engine with a BFS-pathfinding +
  line-of-sight-aiming heuristic that genuinely tries to win (`chooseMove`/`playDaily`, also imported
  directly by `src/run.test.mts`'s own "clears every demon" test — one bot, not two diverging
  implementations), and submits its run through the exact same `POST /runs` route a human's client
  uses, self-declaring `entrantKind: "agent"`. Run it against a live server with `npm run agent`.

**The honest label:** every submitted run carries a REQUIRED, self-declared `entrantKind: "human" |
"agent"` field (spec's own disclosed-not-hidden trust model — the same posture ruinfold already gives
its own `actor` string). The leaderboard shows both kinds distinctly, never conflated. Binding a
declared identity to a real, verified ActivityPub actor (`durante@ap.561.group`) is a QUEUED item for
whichever session owns the game-actors lane — out of scope here; nothing on this leaderboard needs to
change to accept a verified identity later.

**Queued note for the game-actors lane (2026-08-20), specifics:** when `durante@ap.561.group` is
built, its daily-results post should read from the live `GET /leaderboard/:date` route (this app's
own JSON, already deployed at `https://durante.561.group/leaderboard/<YYYY-MM-DD>` — see the deploy
runbook's "durante daily tournament" section for a live example) and link each entry's `runId` to a
human-viewable replay page via `GET /replay/:runId`. That replay page does not exist yet: it is
`replay-spectacle`'s job (see `computer-game-system-services-section/services/replay-spectacle`,
whose `adapters/` directory already has one file per game — `ruinfold.mjs`, `crucible.mjs`), and the
concrete follow-up this note is naming (not building here) is a new `adapters/durante.mjs` that turns
a `GET /replay/:runId` response into the same kind of self-contained page those two adapters already
produce.

**A disclosed performance characteristic, not a bug:** durante's world is an append-only trace (THE
LAW — evidence linear, nothing overwritten), and every demon chase step admits a fresh position row
rather than mutating one, so a fold's cost grows with the trace's own history. A multi-hundred-tick
replay is measurably slow (empirically: low tens of seconds by tick ~400 in this sandbox). This is a
real property of `game.mjs`'s own admit-per-tick shape (central to the demon's held-⊤ mechanic), not a
bug the "abrash is read-only unless a bug blocks determinism" carve-out would justify touching — see
`src/run.test.mts`'s own header for the measurement this claim is based on.

## Play it in a terminal

```sh
npm run terminal              # interactive: kitty/sixel if the terminal speaks it, ASCII if not
npm run terminal -- --headless   # a fixed scripted walk, ASCII frames printed, no keyboard needed
npm run terminal -- --pixel      # force the pixel path even over a plain pipe (demo/audit)
```

```sh
npm run terminal -- --daily      # play TODAY'S daily tournament arena; submits on quit/clear via the
                                  # same public POST /runs route the browser face and the reference
                                  # entrant both use; prints the leaderboard after submitting
npm run terminal -- --daily --base http://localhost:8788 --actor my-name   # override server/actor
```

`scripts/durante-terminal.mjs` drives the SAME `game()`/`tick()` loop the browser face calls, over
`@red-cup-engineering/daleske` instead of a `<canvas>`: daleske's own `probe()` capability-detects
kitty vs. sixel vs. neither, raw-mode keyboard input comes from daleske's `Keyboard` (arrows/WASD
move+turn, `Q`/`E` strafe — `q` is repurposed for QUIT on the terminal face, matching the legacy
abrash terminal bin's own convention, so strafe-left moves to `z` here), and a bare/non-TTY terminal
falls all the way back to `src/terminal-ascii.mjs`'s ASCII downsample — the graceful fallback the
legacy README described, ported forward. `src/terminal-ascii.mjs` is the pure core (the ASCII
downsample + a byte-copy adapter from abrash's headless `Framebuffer` into a real daleske one, the
shape daleske's tile-diffed blit actually needs); `src/terminal-ascii.test.mts` proves it headlessly —
a scripted, deterministic intent log walked through twice renders byte-identical ASCII frames, and the
frames actually change as the player moves (not a frozen loop).

## Real test counts (run fresh)

`npm test` (= `node --test src/*.test.mts src/server/*.test.mts agents/*.test.mts`) —
**166 real, passing assertions** across 20 files:

| File | Tests | | File | Tests |
|---|---|---|---|---|
| `src/arena.test.mts` | 10 | | `src/run-recorder.test.mts` | 7 |
| `src/demon.test.mts` | 12 | | `src/daily-routes.test.mts` | 19 |
| `src/combat.test.mts` | 9 | | `src/server/dates.test.mts` | 6 |
| `src/game.test.mts` | 16 (incl. 5 determinism) | | `src/server/guard.test.mts` | 4 |
| `src/seed-rows.test.mts` | 3 | | `src/server/leaderboard.test.mts` | 6 |
| `src/server.test.mts` | 20 | | `src/server/store.test.mts` | 6 |
| `src/terminal-ascii.test.mts` | 6 | | `src/server/bucket-store.test.mts` | 5 |
| `src/daily-arena.test.mts` | 4 (incl. the 366-date + 20-seed solvability sweep) | | `src/server/store-factory.test.mts` | 2 |
| `src/score.test.mts` | 8 | | `agents/reference-entrant.test.mts` | 5 |
| `src/manifest.test.mts` | 6 | | `src/run.test.mts` | 12 |

Not the same 62 the legacy README claimed for the original six ported files: the legacy
`tests/{arena,combat,demon,game}.test.mjs` files it pointed at **never existed** — `tests/` held only a
shared `_harness.mjs` utility consumed by nothing. These are new, run-for-real tests covering the same
three twists the legacy README described, plus every surface this port and the daily-tournament work
added: `server.mjs`'s routing (static + the four daily routes), `cartridge.mjs`'s determinism/replay
binding and its new `createDailyEngine`, `seed-rows.mjs`'s parity with the on-disk seed, the terminal
face, the daily arena generator's solvability discipline, the replay/scoring engine, the vendored
server layer, and the reference AI entrant.

## Built on

[`@red-cup-engineering/abrash`](../../../../../../../../../engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-interface-system-services-section/services/graphical-computer-interface-system-services-sections/apps/abrash)
(the software-3D engine: federated voxel world, raycaster, grid collision, tick loop — published to
Verdaccio, pinned `0.1.0`), [`@561-group/cartridge`](http://127.0.0.1:4873/) (the seed → intent-log →
replay contract, pinned `0.1.0`), and — for the terminal face only —
[`@red-cup-engineering/daleske`](http://127.0.0.1:4873/@red-cup-engineering/daleske) (kitty/sixel
pixel blit + raw-mode keyboard, pinned `0.1.0`). The deterministic core (`src/game.mjs`,
`src/arena.mjs`, `src/demon.mjs`, `src/combat.mjs`, `src/cartridge.mjs`) and the browser face
(`web/`) still have **no** `daleske` dependency and touch no terminal code — the browser reaches
abrash's RGBA framebuffer directly via one `putImageData` call; only `scripts/durante-terminal.mjs` and
`src/terminal-ascii.mjs` know daleske exists.

The daily-tournament server layer (`src/server/*.mjs`) is vendored, with provenance headers, from
`apps/ruinfold/src/server/*.mts` — a live-proven Cloud Run pattern (daily seeding, whole-log replay
rejection, atomic-lock one-scored-attempt persistence, domain-agnostic leaderboard ranking), not
reinvented. `src/run.mjs`'s control-flow shape (structural-validate-then-replay-then-stop-at-terminal-
condition) is likewise a documented port of `apps/ruinfold/src/engine/run.mts`'s own shape, adapted to
`cartridge.mjs`'s specific `applyIntent`/`createDailyEngine` rather than a generic replay harness.
