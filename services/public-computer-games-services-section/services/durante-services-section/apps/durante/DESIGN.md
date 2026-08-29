# durante — design notes

This file is the target of `DESIGN.md` citations scattered through `web/main.mjs` (the ammo/health HUD
notes) and this app's own `README.md`. It follows the house convention set by
`public-web-game-services-section/services/gambling-trainer-service/DESIGN.md`: name the honest
weaknesses and deliberate additions plainly, rather than let them go unremarked.

## What changed porting to the browser, and why

### 1. Held-key continuous movement replaces one-shot-per-keypress (a deliberate divergence, not a bug)

The legacy terminal bin (`durante/scripts/durante.mjs`) treated each keypress as a **one-shot** intent,
cleared immediately after one tick (`intent = {}` right after use — see the legacy `scripts/durante.mjs`,
line-for-line: `paint()` reads `intent`, then zeroes it). A terminal reads discrete keypress events; there
is no "held" state to ask about.

A browser FPS needs the opposite: `WASD`/arrows held down should move the player continuously, the way
every first-person shooter since the genre existed has worked. `web/canvas-screen.mjs`'s `createInput`
tracks a `Set` of currently-held key codes (`keydown`/`keyup`) and derives `{forward, strafe, turn}` fresh
from whatever is held **every animation frame**. `fire` stays **edge-triggered** on `keydown` with
`!event.repeat` — matching the legacy "one shot per truthy fire" exactly, so OS key-repeat can never
auto-fire the gun just because Space is held down. This was flagged as the one real behavioral choice
to disclose, not silently do, in the port's own read-report (§4, "Held-key vs. one-shot intent
semantics").

### 2. Strafe (Q/E) is a genuinely new control, not present in the legacy terminal bin

`game.mjs#tick`'s intent shape has always accepted `strafe` (it flows straight into
`@red-cup-engineering/abrash/engine#applyIntent`, which has supported it since the engine's original
legacy source) — but the legacy terminal bin's `onKey` handler never bound a key to it; only `w`/`s`
(forward/back) and `a`/`d` (turn) were wired. The task's PRE explicitly asks for a **keyboard-complete**
browser control scheme (no mouse required), and an FPS that cannot strafe without a mouse to turn-and-walk
around a corner is not really keyboard-complete. `Q`/`E` strafe left/right in the browser face. This is a
UI-layer addition over an already-existing engine capability, not a new engine mechanic.

### 3. Ammo is a browser-face HUD addition, not part of the deterministic core

Grepped the entire legacy `combat.mjs`/`game.mjs`: **nothing tracks a bullet count**. The legacy weapon is
unlimited hitscan, full stop — `shoot()` never checks or decrements anything resembling ammo. The task
asks the browser HUD to show "health/ammo/demon state." Rather than invent a fake ammo mechanic inside the
pure, tested `game.mjs`/`combat.mjs` modules (which would silently diverge the ported engine from its
proven legacy behavior, and would need to be threaded through `tick()`'s state and therefore through
every existing test), `web/main.mjs` tracks a **local, client-side-only** `ammo` counter
(`AMMO_START = 40`, decremented on a landed fire attempt, floor at 0 — firing with 0 ammo is simply
withheld, `fire` never reaches `tick()`). This is a real gameplay constraint for the browser player, but
it is not part of `@red-cup-engineering/durante`'s deterministic core: `createEngine`/`applyIntent`
(`src/cartridge.mjs`) never see it, and a `replay`/`verify` run over a recorded intent log ignores it
entirely (a replayed log can, in principle, "fire" more times than the original browser session's ammo
would have allowed — the intent log records what the player attempted, not what the HUD permitted; this
is honestly a gap between the browser session's playable constraint and what the pure core replays, and
it is disclosed here rather than quietly left implicit).

### 4. Health is a display transform over the real `hurt` counter, not a new mechanic

The legacy engine already counts `player.hurt` — ticks spent in a demon's melee grasp (the contest-the-
player's-tile mechanic in `game.mjs#tick`, step 3). There is no HP pool, no death state, anywhere in the
ported pure engine. The HUD shows `health = max(0, 100 - hurt * 4)` — a cosmetic, client-side-only
transform of the real, already-tested `hurt` value, computed in `web/main.mjs`, not inside `game.mjs`.
When it reaches 0 the browser face shows a "grasped to 0 health" message; the underlying game state is
untouched (no forced game-over is written into the trace — refreshing the page starts a fresh
`createEngine` call).

## The federation gap (inherited from the engine, restated here for the game's own consumers)

`@red-cup-engineering/abrash/federation` (used by `arena.mjs`, `demon.mjs`, `game.mjs`) is **new code**,
not a port — see that module's own header for the full account. In short: the legacy
`@561-group/computer/distribution/federate` subpath this game's engine dependency used to import does
not exist in the published `@561-group/computer@0.0.2` package or anywhere in the legacy archive's
source; `federation.mjs` reconstructs its documented semantics from the real, published, tested
`fold`/`settle`/`section` primitives in `@561-group/computer/posix-holography/eavt-substrate`. Every call
site this game actually uses (`arena.mergeArena`/`contestedWalls`, `demon.vitalityOf`, `game.tick`) was
hand-traced against that reconstruction before this game was built on top of it, and it carries its own
22-assertion test file in the engine package.

## Vendoring / dependency notes

- **`@red-cup-engineering/abrash` is a real, live `npm install` dependency**, published to Verdaccio,
  pinned `0.1.0`. Not vendored — `arena.mjs`/`demon.mjs`/`combat.mjs`/`game.mjs`/`cartridge.mjs` all
  import its subpaths directly, matching exactly how the legacy source imported the unpublished
  `@561-group/abrash` workspace package (only the package name changed).
- **`@561-group/cartridge` is a real, live `npm install` dependency**, pinned `0.1.0`, per the house's
  own `parlor-kernel` precedent (`buildCartridge`/`defaultReplay`/`intent-log` reused, never
  reimplemented). `src/cartridge.mjs`'s header documents the one real wrinkle: cartridge's own
  `hashState`/`defaultReplay` hash the raw `state` object directly via `canonicalStringify`, which
  silently collapses a `Map` (this game's `world` field) to `"{}"` — `Object.keys()` on a bare `Map`
  returns no own enumerable properties. `serialize()`/`deserialize()` convert `world` to/from a plain,
  JSON-safe array first, and this module's own `hashState`/`replay`/`verify` hash the SERIALIZED form,
  never the raw state. `game.test.mts`'s determinism tests prove this actually distinguishes two
  different worlds, not a false "equal" from an empty-object collapse.
- **`daleske` is not a dependency, anywhere.** The whole point of the port: abrash's `Framebuffer` is
  already an `ImageData`-shaped `Uint8ClampedArray` raster, so a `<canvas>` face needs one
  `putImageData` call (`@red-cup-engineering/abrash/framebuffer#paintToCanvas`), not a terminal pixel
  library.
- **The browser's `/vendor/abrash/` route serves the INSTALLED npm package's own files, unmodified.**
  `server.mjs`'s header explains why: abrash ships plain, dependency-free `.mjs` (no bundler, no
  transpile step needed), so the "build step" for the browser is exactly "serve the file that's already
  on disk in `node_modules`." An import map in `web/index.html` maps the bare `@red-cup-engineering/
  abrash/*` specifiers the game's own `arena.mjs`/`demon.mjs`/etc. use to that route.

## The daily tournament — additions and honest gaps

- **`entrantKind` is self-declared, not verified.** A submitted run's `entrantKind: "human"|"agent"`
  is a client-supplied string, exactly the same trust posture `apps/ruinfold` already gives its own
  `actor` field — disclosed, not hidden. Nothing in `src/run.mjs`/`src/server.mjs` cryptographically
  binds a submission to a real identity; a human could self-declare `"agent"` or vice versa. Binding
  this to a real, verified ActivityPub actor (`durante@ap.561.group`) is a QUEUED item for the
  game-actors lane, not built here — see `README.md`'s own note on this.
- **Only two terminal conditions exist, by design, not omission.** `game.mjs` has no player-death
  mechanic anywhere (no HP pool, ever — see §4 above); `src/run.mjs`/`src/score.mjs` therefore only
  ever reach `cleared` or `tick-cap`, unlike `apps/ruinfold`'s four-way `EndReason` (`cleared`/
  `mortal-death`/`voided`/`tick-cap`). A `null`/"voided" score is kept as a reachable TYPE in
  `score.mjs` for forward-compatibility but is unreachable in v1 — documented there, not silently dead
  code.
- **A real, measured performance characteristic of the trace substrate, not a bug.** `game.mjs` admits
  a fresh position row on every demon chase step rather than mutating one (THE LAW — evidence linear),
  so folding a subject's state costs more as its own row history grows. Empirically, replaying several
  hundred ticks takes low tens of seconds in this sandbox (measured directly — see `src/run.test.mts`'s
  header). `DAILY_TICK_CAP=3000` (the spec's own generously-bounded constant, justified against the
  arena's worst-case geometry) is therefore a real cost bound on a full-length `POST /runs` replay, not
  a free operation — worth knowing before assuming the daily route is cheap at production scale. This
  is `game.mjs`'s own admit-per-tick shape, central to the demon's held-⊤ mechanic; the task's "abrash
  is read-only unless a bug blocks determinism" carve-out does not apply (abrash was never touched;
  this is durante's own `game.mjs`, and nothing here is incorrect, only costly at scale).
- **The weekly reward-ledger/boons machinery ruinfold carries (`rollover.mts`/`boons.mts`/
  `reward-hook.mts`) is deliberately NOT ported.** The task asked for a daily leaderboard and
  one-scored-attempt-per-day only, no weekly meta-game — noted here so a future session doesn't
  rediscover this as a silent omission. `leaderboard.mjs`'s `rankLeaderboard` is vendored and ready;
  `weeklyTotals` is not (ruinfold's own version can be vendored later if a weekly durante leaderboard
  is ever wanted).
- **The local file-store (`src/server/store.mjs`) is NOT safe for a multi-instance production
  deploy.** It works correctly for local dev/tests (this app's own default), but the one-scored-
  attempt lock and JSONL appends need the bucket-store's atomic conditional writes to stay correct
  across concurrent Cloud Run instances — see the `Dockerfile`'s own note on setting `DURANTE_BUCKET`
  for a real deploy.
- **The reference entrant's BFS-pathfinding + line-of-sight-aiming heuristic (`agents/reference-
  entrant.mjs#chooseMove`) is competent, not optimal.** It reliably clears the dailies exercised in
  this app's own test suite (`src/run.test.mts`, `agents/reference-entrant.test.mts`), but it is a
  straightforward greedy heuristic (nearest-reachable-demon, steer-and-fire), not a search over
  possible strategies — a stronger bot is plausible future work, not claimed as optimal here.

## Honest weaknesses

- **Ammo and health are browser-only, not replay-verified.** Stated above (§3, §4) — a `verify()` call
  over a recorded intent log checks the WORLD state is reproduced exactly; it says nothing about whether
  a real browser session's ammo/health HUD would have allowed the same sequence of fires. This is a real
  gap between "the deterministic core replays exactly" (true, tested) and "the whole browser experience
  replays exactly" (not claimed).
- **No multiplayer, no real federation across two live peers.** The arena's federated-merge mechanic
  (`mergeArena`) is fully implemented and tested (`arena.test.mts`), but this browser build ships ONE
  static merged world (`world/blood-merge.jsonl`, the same "alpha built a wall, beta carved it" merge the
  legacy demo shipped) rather than two live browser sessions federating their own traces together. The
  mechanic is real and testable; a live multi-peer session is future work, not claimed here.
- **The internal render resolution (240×150) is fixed, not adaptive to display size.** CSS scales the
  `<canvas>` element up with `image-rendering: pixelated`, matching the legacy terminal demo's own small
  raster sizes (e.g. 168×96) rather than rendering at the visitor's native resolution — keeping the pure
  JS raycaster's per-frame column count small and frame-rate stable regardless of display size, at the
  cost of a visibly blocky, retro-software-3D look (which is, if anything, in keeping with the engine's
  Abrash-lineage inspiration).
- **The legacy README's "62 assertions across 4 proofs" claim was fiction — see the engine's own
  README for the full finding.** `tests/arena.test.mjs`, `combat.test.mjs`, `demon.test.mjs`,
  `game.test.mjs` never existed on disk in the legacy archive; only a shared, unused `_harness.mjs` did.
  This port's own test suite (`arena.test.mts`, `demon.test.mts`, `combat.test.mts`, `game.test.mts`,
  `seed-rows.test.mts`, `server.test.mts`) is written fresh and actually run — see this app's `README.md`
  for the real, current count.
