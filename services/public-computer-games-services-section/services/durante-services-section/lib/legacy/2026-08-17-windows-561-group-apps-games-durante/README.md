# @561-group/durante

> A **QUAKE-like first-person shooter** on [`@561-group/abrash`](../../tools/abrash) (the software-3D pixel engine over the daleske terminal).
> You walk a level, strafe, and shoot a demon.
> The **first-playable** proof — a federated arena, FPS movement, a hitscan weapon, a chasing enemy — with the paraconsistent twist woven through the substrate, not bolted on.
> It sits ABOVE `@561-group/abrash` and [`@561-group/computer`](../../../computer); neither depends on it.
> Games ride the engine; the engine rides the terminal; the terminal rides the computer.

```sh
npm test                    # 62 assertions across 4 proofs (arena, demon, combat, game)
npm run demo                # walk-and-shoot over kitty/sixel (or an ASCII downsample in a pipe)
npm run demo -- --headless  # a scripted kill: t -> ⊤ -> f, printed as ASCII 3D frames (CI / audit)
```

## The three twists — THE LAW, played as mechanics

durante does not decorate a normal shooter with paraconsistent flavor.
Each of its three core systems **is** a reading of the bilattice the substrate holds — ⊤ is a designed mechanic here, never a debug dump.

### 1. The arena is a MERGE OF TRACES (`arena`)

A deathmatch level is not authored once.
It **settles from the federated union ∥** of every player's wall-trace (abrash's world is already the fold of an append-only trace).
Two peers who lay the **same** wall agree — it settles **t**.
Two peers who **disagree** — alpha builds a wall, beta carves it open — leave that cell **⊤**: a **contested wall** that **shivers** (abrash's pixel readout) AND is a **PHASE GATE** you can walk through, precisely because nobody agrees it is solid (`passContested`).
The merge is order-independent (a G-Set union — no coordinator, no last-write-wins), and the contested walls are an enumerable **value** (`contestedWalls(world)`), never an error.

### 2. The enemy is HELD ⊤ (`demon`)

A demon's **vitality is the FOLD** of its `alive` cell.
Its spawn **affirms** `alive`; each wound **denies** it.
So between first blood and the kill the demon is **alive-AND-dead** — a held contradiction **⊤**, the monster you cannot trust, still hunting but failing.
It **settles to f (dead)** only when the deny-evidence reaches the demon's `toughness`. **The kill is a SETTLE, not a subtraction**:

```
spawn            → t   (alive, hunting)
wound  (1/3)     → ⊤   (WOUNDED — alive AND denied, HELD, still hunts)
wound  (2/3)     → ⊤   (still held — every wound a witness kept, evidence linear)
wound  (3/3)     → f   (DEAD — the contradiction settled; the demon falls)
```

### 3. A weapon's effect is EVIDENCE you fold (`combat`)

The gun is **hitscan** — one ray down the crosshair.
A landing shot does **not** subtract a hit-point; it **appends `deny(demon, 'alive')`** — negative evidence on the demon's vitality.
A wall **occludes** the shot (the bullet stops at the nearer wall).
You cannot wound a corpse.
Every shot that lands is a witness the LAW keeps **linearly** — no wound overwrites another; the demon's state is the fold of them all.

## The tick loop (`game`)

One turn, with **no global clock** (abrash's aperiodic settling): read the arena into a grid, resolve the player's **move** against it (contested walls phase-walkable), resolve **fire** into wound evidence (append-only), run each demon's **chase** (a functional position update; a demon at melee range **CONTESTS the player's tile** to ⊤ — a held grasp, a shivering wall on top of you, counted as `hurt`), re-grid, and **project** a 3D frame.
`tick(state, intent)` returns a NEW state — append-only, never mutated in place, replay-identical.

## The demo

`scripts/durante.mjs` loads `world/blood-merge.jsonl` — the **merge of two peers' traces** (alpha built an inner wall, beta carved it, so `voxel:4,4` is a contested ⊤ phase-gate) plus two demons.
The headless run aims at demon 0 and empties the magazine, printing each 3D frame as a small ASCII downsample and the demon's vitality settling **t → ⊤ → f**: alive, then held alive-AND-dead while wounded, then dead once the wound-evidence reaches toughness.
The `%` columns are the contested gate, shivering.
A calm status line carries the four-value audit (`hunting`, `⊤ wounded`, `dead`, `⊤ walls`, `hurt`) — calm by default, the ⊤ counts the headline.

## Built on

`@561-group/abrash` (the software-3D engine: federated voxel world, raycaster, grid collision, tick loop) and `@561-group/computer` (the EAVT substrate + federation underneath abrash).
The interactive cockpit reaches abrash's pixel terminal (`@561-group/daleske`) **through the engine** — lazily, only in TTY mode — so the engine, the tests, and the headless audit stay pure (abrash + computer only).
