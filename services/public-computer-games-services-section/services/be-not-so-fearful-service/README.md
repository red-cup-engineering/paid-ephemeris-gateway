# Be Not So Fearful (be-not-so-fearful-service)

A backrooms/SCP-inspired extraction shooter on `@red-cup-engineering/abrash`: OG-Wolfenstein-grade
raycast graphics, a BNSF-owned Quake-momentum kernel (bunnyhop speed gain, rocket-jump
verticality — both numerically tested) composing abrash's real `collision.move`, seeded liminal
levels whose contested-voxel (⊤) shiver is abrash's own held-contradiction mechanic used as the
dread signal, four anomalies each a tested behavior contract, and an extraction economy where
banked loot survives death and unbanked loot simply never counts.

Engineering identity: `be-not-so-fearful-service` / `bnsf` (package name, directory, doc headers).
Display name: **Be Not So Fearful**, live at `fearful.561.group` — see DESIGN.md's "Naming" section
for why the hostname differs from the engineering identity.

## Run it locally

```
npm install
npm run verify   # syntax-checks every src file, then runs the full test suite
npm run serve    # http://localhost:8787/  (or `node src/server.mjs <port>`)
```

Then open `http://localhost:8787/` in a browser, click the canvas to lock the pointer, and play.
Fully keyboard-playable too — every action has a default key binding (see the amenities panel).

Other scripts: `npm run check` (syntax only) and `npm test` (test suite only).

## Controls

| Action | Default key |
|---|---|
| Move forward / back | `W` / `S` |
| Strafe left / right | `A` / `D` |
| Look | mouse (pointer-locked) |
| Jump | `Space` |
| Sprint (loud) | `Shift` |
| Crouch (silent) | `Ctrl` |
| Fire | left click |
| Rocket-jump | right click (on a cooldown) |
| Pick up / extract / descend | `E` (context-sensitive, whichever you're standing near) |

Every binding is remappable in the amenities panel (click a binding, press a new key) and
persists in `localStorage`. FOV, mouse sensitivity, reduced-flash, and reduced-motion are also in
that panel.

## What v1 actually is, stated plainly

- **Anomalies are not combat targets.** No weapon-vs-anomaly health/damage system — they are
  evasion puzzles (SCP register: learn the rule, survive it), not DOOM kill-fodder. A disclosed
  scope cut, not an oversight.
- **Rocket-jumping is an immediate self-blast on a cooldown**, not a simulated travelling
  projectile with splash damage. The momentum-kernel mechanic itself (the actual "feel bar" the
  design names) is real and numerically tested; a full projectile/damage system is Later.
- **No live leaderboard backend.** `@red-cup-engineering/cartridge`'s replay-verification contract
  is fully wired (`src/manifest.mts#verify` really replay-verifies a log) and the daily seed is
  real (`dailySeed("be-not-so-fearful", today)`), but there is no server standing behind it the
  way durante's `POST /runs` does — "for leaderboard compatibility LATER," per the design's own
  phrasing, not a live leaderboard today.
- **No multiplayer.** A solo run with cartridge-verified replay is the honest v1 shape — see
  DESIGN.md's "Multiplayer judgment" section for the full reasoning (qwzspace's real value doesn't
  net-positive against this game's actual v1 needs).
- **A real, disclosed performance debt**: `state.dynamicRows` is kept bounded (pruned to one row
  per (subject,predicate) every tick — see `src/cartridge.mts`'s own header), but the static
  per-tier level geometry (1,000–3,000+ voxels) is still folded into a grid once per tier and never
  revisited; that one-time fold cost has not been profiled at real Cloud Run scale under a full
  5–15 minute run. Worth doing before assuming the deploy tier holds.

See `DESIGN.md` for the full technical disclosure: what abrash actually supports (read from its
real source, not assumed), the movement kernel's exact formulas, level generation, each anomaly's
behavior contract, the economy's ledger rules, the extensions proposed for the abrash owner lane,
and the naming/deploy reasoning.

## Tests

`npm test` runs every `.test.mts` file under `src/`, `src/anomalies/`, and `src/ext/` via
`node --test`. As of this writing: 8 files' worth of numeric feel tests (bunnyhop speed-gain,
rocket-jump apex ratio, friction stop, determinism byte-replay, EXT-3 engagement, tunneling —
both the safe range and the disclosed limitation), a level-generator solvability suite (1,200
seeded runs across all 3 tiers, zero unreachable beacons), four anomaly behavior-contract suites,
an economy ledger suite, two `ext/` adapter suites, a keymap completeness suite, and a full-game
cartridge suite (byte-replay determinism, `cartridge/replay`'s real `defaultReplay`, pickup/
extract/transition/death mechanics). Run `npm test` for the real, current count.
