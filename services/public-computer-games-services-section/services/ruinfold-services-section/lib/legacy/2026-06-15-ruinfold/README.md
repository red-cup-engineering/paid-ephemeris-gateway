# Ruinfold

A browser-based 3D hack-and-slash MMORPG over the **tab** EAVT world-substrate and the **voidmath** four-valued bilattice.
The world IS its append-only trace, folded (settled) every tick.
Death is not one rule but five, each a different reading of the bilattice — a slain undead settles its `alive` cell to ⊤ (alive *and* slain) and rises again; a wraith settles to ⊥ and is un-made; a boss settles to a clean f and stays down.
The server is pure Node `http` (SSE + POST, zero server dependencies); the 3D client loads three.js in the browser from a CDN import-map.

> A fallen keep that did not finish falling.
> The dead here are not done.

## Run it

```sh
pnpm --filter @561/development.experimental.ruinfold run seed    # build ./world
pnpm --filter @561/development.experimental.ruinfold run start   # serve it
# or both at once:
pnpm --filter @561/development.experimental.ruinfold run dev
```

Then open `http://localhost:8787` (set `RUINFOLD_PORT` to change it).
Open it in **two tabs** to see the MMO part: both are players in one shared world.

- **Move:** `WASD` / arrow keys, or **click the ground**.
- **Fight:** **click a foe** to strike it (melee, in reach); **1–4** for abilities — Heavy (2× hit), Cleave (melee AoE), Bolt (ranged), Mend (self-heal).
  Abilities cost **stamina** and have **cooldowns**.
- **Loot & gear:** `G` grabs the nearest item; `I` opens your **pack** to equip/unequip/drop.
  Gear changes your stats; out of combat, health and stamina **regenerate**.
- **Talk & trade:** `F` (or click an NPC): the **Shrine-Keeper** offers a bounty (cull 3 goblins for coin, xp, and gear); the **Rag-Merchant** buys/sells for **gold**.
- **Chat:** `Enter`, type, `Enter` — broadcast to everyone in your zone.
- **Exits:** `E` or the **exit buttons** (bottom) walk you between zones.
- **Die:** if you fall you become a ghost — walk to a pale shrine to return where you fell, or press the death-window button to enter the light back at the gate.

## The honest division of labor

This repo rederives knowledge from the ground up, and its kernel is a *bilattice logic*, not linear algebra — there is no 3D geometry in voidmath.
So Ruinfold is split cleanly:

- **Server = authoritative scalar state + bilattice truth.** Positions are plain numbers (`pos-x`/`pos-y`/`pos-z`) on EAVT rows; the server only does scalar arithmetic (step toward a goal, clamp to a zone, a `dx²+dz²` melee range gate).
  The bilattice governs the *truth* of state — `alive`, `form` — over FOUR (⊥ unknown · t true · f false · ⊤ contradiction-held-as-a-value).
- **Client = all geometry.** Every vector/matrix/projection/camera/interpolation operation is browser-side three.js.
  The snapshot JSON is the only contract, and it carries plain numbers plus bilattice glyphs.

## The five deaths (the headline)

Every monster declares `slain` the **converse** of `alive` at seed, so a killing blow's `slain` row folds as *negative* evidence into the `alive`-cell.
What that cell settles to is then chosen by the entity's `death-rule` — same evidence, five readings:

| death-rule | bilattice | what happens |
|---|---|---|
| `undead` | `alive` → **⊤** | alive AND slain — a held contradiction. Heals, scars (`alive-revives`++), stays ⊤, **rises again**. |
| `mortal` (monster) | `alive` → **f** | a corpse; respawns on cooldown. |
| `mortal` (player) | ghost | no corpse: `status`→ghost, `form`→ghost. Walk to a shrine to re-embody, or respawn at the gate. |
| `named` (boss) | `alive` → **f** | true death; drops loot; long respawn. |
| `construct` | `alive` → **⊥** | un-made: both faces retracted, no corpse, reforms elsewhere. |
| `cursed` | corpse + **curse** | the slain monster dies like a boss, but its slayer's `human` cell is contradicted by a `beast` row (its converse) → **⊤**, a permanent, irreversible dual identity (lycanthropy). |

The branch is driven entirely by **data** (the `death-rule` row and the presence of a converse declaration) — there is no per-entity death code anywhere.
This is voidmath's point: a contradiction is a *value the world can hold and render*, not a crash.
(Death-model flavor draws on Project Gorgon's varied, permanent deaths.)

## How it is built

```
engine/
  functional.mjs   RUIN_FUNCTIONAL (health/position/level/stamina/gold/cooldowns… latest-t-wins) + clock(tick,seq)
  _world.mjs       shared readers over tab's settle: view / valOf / numOf / glyphOf / posOf / dist2 / zoneOf
  archetypes.mjs   the item catalogue (slot, grants, value); an item instance points at an archetype
  stats.mjs        derive attack/armor/health from level + equipped gear (one source of truth)
  combat.mjs       strike() shared damage primitive; attack() = melee range gate + strike
  abilities.mjs    Heavy / Cleave / Bolt / Mend — stamina costs, cooldowns, melee+ranged+AoE
  death.mjs        the 5-way bilattice router + respawns + ghost embody
  movement.mjs     scalar step toward a goal / WASD nudge, clamped to the zone
  ai.mjs           generic monster turn (acquire / leash / engage / patrol) — behaviour is data
  items.mjs        pickup/drop/equip/unequip/grant/destroy via `changing` located-in
  loot.mjs         spawn drops + gold at a corpse (from the monster's `drops` data)
  progression.mjs  xp / leveling / stat scaling (pure curve)
  quests.mjs       accept / track-by-kill / turn-in bounties (data on a quest-giver NPC)
  vendor.mjs       buy / sell against an NPC's stock, priced from archetypes
  regen.mjs        out-of-combat health + stamina regeneration
  zones.mjs        spawn + portal traversal across zones
  snapshot.mjs     settle dirty subjects → compact client JSON (incl. inventory/gear/bounty/cooldowns)
  tick.mjs         one advance: intents → AI → deaths → rewards(xp/gold/loot/bounty) → respawns → regen
server/
  http.mjs   sse.mjs   actions.mjs   loop.mjs   bin/{ruinfold,seed}.mjs   (pure node:http, zero deps)
client/
  index.html (three.js CDN import-map)   main.mjs (scene/SSE-reconcile/input/nameplates/damage)   ui.mjs (HUD/hotbar/pack/shop/dialogue/chat)
tests/
  prove-combat   prove-undeath   prove-deaths   prove-abilities   prove-quests   prove-economy
```

Built on `@561/development.lab.tab`: `doing`/`changing` append to the trace, `being`/`settle` fold it, the converse declaration makes `slain` negative evidence, and the thin bilattice supplies the FOUR values.
Ruinfold writes its **own** tick (tab's farstone `ticking` is hardcoded to a harbor) and reuses only the substrate operations underneath.

### Notes & limits

- **Single-writer discipline:** HTTP POSTs only *queue* intents; the tick is the only thing that ever appends, so concurrent players can never race the log.
- **Append-only growth:** functional supersession keeps *settle* cost bounded by the latest row per predicate, but the log files grow unbounded — log compaction is out of scope for this v0.
- **`located-in` is dual-filed**, and supersede collapses a functional predicate across a whole log regardless of `e`; an entity's true place is therefore read via `zoneOf` (tab's `locationOf`, which filters `e===id`), never via a settled `located-in` cell.
- The client loads three.js from `unpkg` — the browser needs internet; the server ships no JS dependencies.

## Test

```sh
pnpm --filter @561/development.experimental.ruinfold test
```

Three headless proofs drive the engine over throwaway worlds: combat is a state-transition with attribution; undeath settles `alive` to ⊤ and rises (and a thing without the converse never can); and the five death-rules each route to their bilattice value, with loot, curse, and respawn.
