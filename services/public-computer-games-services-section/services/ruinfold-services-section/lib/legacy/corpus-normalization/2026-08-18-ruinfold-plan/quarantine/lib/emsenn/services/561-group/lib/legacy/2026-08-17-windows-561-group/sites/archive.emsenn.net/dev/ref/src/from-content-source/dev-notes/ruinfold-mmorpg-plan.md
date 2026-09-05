# Ruinfold — a browser-based 3D MMORPG over tab + voidmath

## Context

The user wants a browser-based 3D MMORPG built in Node, reusing this repo's infrastructure: the **voidmath** four-valued bilattice (the "next-gen math system") and the **tab** EAVT world-substrate (the "cleaned up kernel" / world engine).
The target package already exists in charter but is empty: `development/experimental/ruinfold/` contains **only** `package.json`.
Its description already fixes the design intent:

> "browser-based 3D hack-and-slash MMORPG over the tab EAVT world-substrate and the voidmath four-valued bilattice.
> The world IS its append-only trace, folded (settled) every tick; death is paraconsistent — a slain undead settles its `alive` cell to ⊤ (alive AND slain, a held situation) and rises again.
> Server is pure Node http (SSE + POST, zero server deps); the 3D client loads three.js in the browser from a CDN import-map."

This plan fills that empty package into a working game.
The user chose **broad MMORPG scope** (multiple zones, items/inventory/loot, XP/leveling, several monster types — on top of a complete playable slice), **both click-to-move and WASD** controls, and asked for a **weird, varied death model inspired by Project Gorgon** — different death semantics per *kind* of death, not one rule.

## The honest division of labor (a repo constraint, stated plainly)

This repo rederives knowledge from the ground up and the kernel does **not** contain 3D geometry — voidmath is a *bilattice logic*, not linear algebra.
So:

- **Server = authoritative scalar state + bilattice truth.** Positions are plain numbers stored as EAVT predicates; the server does only scalar arithmetic (step toward target, clamp to bounds, melee `dx²+dz²` range checks).
  The bilattice governs *truth of state* (alive / dead / undead / cursed).
- **Client = all rendering geometry.** Every vec/matrix/projection/camera/ interpolation operation is browser-side **three.js**.
  The snapshot JSON is the only contract between them and carries plain numbers + bilattice glyphs.

This division is deliberate and should be written into the code comments.

## Substrate API to reuse (do NOT reinvent — import these)

From `@561/development.lab.tab` (paths under `development/lab/tab/`):

- `doing({ root, agent, subject, predicate, object, t })` — append an EAVT row `{e,a,v,t}` (+ reified `enacted-by` if `agent`).
  `being/doing/scripts/doing.mjs`
- `declareConverse(root, subject, p, q, t)` / `retract({root,subject,predicate,t})` — same file.
- `changing(args)` — `doing` for FUNCTIONAL (latest-t-wins) predicates.
  `being/doing/changing/scripts/changing.mjs`
- `being(subject, rows, opts)` → `{entity, fiber:[{predicate,object,value:{pos,neg,glyph},observers}]}`.
  `being/scripts/being.mjs`
- substrate (`@561/development.lab.tab/substrate`): `append`, `rowsFor`, `subjects`, `allRows`, `supersede`, `frontier`, `containedBy`, `locationOf`, `settle(root,subject,opts)`, and the sets `RELATIONAL`, `FUNCTIONAL`.
  `scripts/_substrate.mjs`
- `observing({root,observer,subject})` / `look(...)
  `.
  `being/doing/observing/scripts/observing.mjs`
- value (`being/library/value/scripts/value.mjs`): `BOTTOM`, `value(pos,neg)`, `knowledgeJoin`, `neg`, `glyph`, `holds`.
  Charge ∈ {0,1}² over FOUR: ⊥(0,0) unknown · t(1,0) true · f(0,1) false · ⊤(1,1) contradiction.

**Key mechanism:** a row `{e:p, a:"has-converse", v:q}` makes `being` fold every `q`-row as `neg(value(1,0))` into the p-cell.
Asserting `p` **and** `q` ⇒ `knowledgeJoin((1,0),(0,1)) = (1,1) = ⊤`.
This is the death engine.

**Important:** tab's own `ticking.mjs` is hardcoded to the "farstone" demo world (harbor/marsh/ferry/bell).
Ruinfold writes its **own** engine tick reusing `changing`/`doing`/`observing`/`being`/substrate — it does not reuse farstone's.

## The weird death model (the headline — bilattice × Project Gorgon)

Each entity carries a data predicate `death-rule` (set at seed).
On `slain`, the engine routes the entity's `alive`/`form` cells to a **different bilattice value per death kind** — death is not one rule, it is five.
Project Gorgon's signature (a death *choice*; permanent, irreversible curses; per-curse reversal) maps onto the four FOUR-values plus a ghost limbo:

| death-rule | bilattice outcome | behavior (PG touchstone) |
|---|---|---|
| `mortal` (players) | `alive` → **f**, new `ghost` form at **t** | Body falls (f). You wander as a ghost (a t-form on a spirit body) and must reach a **shrine** to re-embody, OR "enter the light" → respawn at zone start. PG's death window. |
| `undead` (skeleton/zombie) | `alive` → **⊤** (slain ⊣ alive) | Held contradiction: alive AND slain. Heals to full, **stays ⊤ forever**, renders flickering, rises again on each kill. The charter's headline. |
| `cursed` (lycanthrope etc.) | `form` → **⊤** (human AND beast), permanent | Dying while bitten makes `form` a held dual identity that **can never be retracted** (PG lycanthropy is permanent). Toggling between faces costs N kills as beast. |
| `named`/`boss` | `alive` → **f**, settled | True death: drops a loot bundle, `status:dead`, very long or no respawn. The clean f. |
| `construct`/`illusion` | `alive` → **⊥** (vanish) | Returns to mystery/relationlessness — no corpse, no loot, simply un-made. Mirrors the kernel's void cone. |

`engine/death.mjs` reads each newly-`slain` entity's `death-rule` and applies the matching morphism sequence.
The branch is driven purely by **data** (the `death-rule` row + the presence/absence of a `has-converse` declaration), not by hardcoded per-entity code — exactly tab's "an NPC IS its fiber" philosophy.

## Broad MMORPG systems (layered on the slice)

- **Zones + portals:** each zone is a place subject with `pos-*` bounds + a ground size; `exit-to`/portal predications (RELATIONAL, dual-filed) move a player's `located-in` to another zone.
  The snapshot is scoped to the viewer's current zone (settle only co-located subjects via `containedBy`).
- **Items / inventory / loot:** items are subjects with `located-in` = a player (carried) or a place (on ground).
  Pickup/drop = `changing` `located-in`.
  Loot bundles spawn at boss `named` death.
  Equipment modifies `attack-power`/`armor`.
- **XP / leveling:** killing appends `xp` (functional, accumulating via a running total recomputed at settle); crossing thresholds bumps `level`, which scales `max-health`/`attack-power`.
  Stored as plain numeric predicates.
- **Monster types:** `skeleton` (undead/⊤), `goblin` (mortal), `wraith` (construct/⊥-vanish), a `lycanthrope` carrier, and a zone `boss` (named/f).
  All behavior is `intends` data rules (`{when:{predicate,object}, do:{...}}
  `) consumed by a generic AI — no per-monster code.

## Module / file tree to create under `ruinfold/`

```
engine/
  functional.mjs   RUIN_FUNCTIONAL set (FUNCTIONAL ∪ {health,pos-x,pos-y,pos-z,
                   facing,status,form,level,xp,respawn-at,alive-revives}) + clock(tick,seq)
                   → zero-padded `t` string. SINGLE source of `t` (lexical==chrono order).
  tick.mjs         ruinfold's own ticking: drain player intents → monster AI →
                   combat → resolve deaths (death.mjs) → respawns → bump tick. Returns {tick,dirty}.
  ai.mjs           generic intends-rule AI (data, not code); adds combat/chase intents.
  combat.mjs       attack(): scalar range gate, `changing` health down, `doing` slain on ≤0.
  death.mjs        resolveDeaths(): the 5-way death-rule router (table above) + resolveRespawns / ghost-run.
  movement.mjs     scalar step toward move-target or WASD delta; clamp to zone bounds; write pos-*/facing.
  items.mjs        pickup/drop/equip via `changing` located-in; loot bundle spawn.
  progression.mjs  xp award, level thresholds, stat scaling.
  zones.mjs        portal traversal (located-in across zones); zone bounds + spawn points.
  snapshot.mjs     settle dirty subjects (RUIN_FUNCTIONAL) → compact client JSON; in-mem cache + deltas.
server/
  http.mjs         pure node:http router: GET / , GET /client/* , GET /events (SSE), POST /act.
  sse.mjs          SSE client registry, broadcast(full|delta), heartbeat, dead-client GC.
  loop.mjs         setInterval(200ms) tick driver: engineTick → resettle dirty → broadcast delta. Overrun guard.
  actions.mjs      validate + QUEUE POSTed join/move/attack/pickup/portal intents (single-writer discipline).
  bin/
    ruinfold.mjs   start: boot http + loop.
    seed.mjs       build the world by `doing`: zones, portals, monsters w/ intends + death-rule,
                   declare slain⊣alive for undead, shrines, starter items. Idempotent (rm world/ first).
client/
  index.html       import-map → three.js ESM from CDN (https://unpkg.com/three@0.160.0/build/three.module.js,
                   pinned; jsDelivr fallback) + <canvas> + module entry.
  main.mjs         three scene/camera/renderer; EventSource('/events') reconcile meshes by id;
                   60fps lerp between 5Hz snapshots; click-to-move (raycast ground) + WASD + click-attack;
                   per-bilattice-glyph visual treatment (⊤ undead = flicker + floating ⊤ sprite;
                   f dead = collapsed/desaturated; ⊥ vanish = fade out; ghost = translucent).
  ui.mjs           health/xp/level HUD, inventory panel, the PG-style death window (respawn / enter the light).
tests/
  prove-combat.mjs   headless: attack reduces health (functional latest-t wins); fatal hit appends slain
                     w/ correct attribution; out-of-range = no-op.
  prove-undeath.mjs  headless: undead `alive` settles to ⊤ (pos==1&&neg==1, glyph "⊤"); rises (health
                     restored, alive-revives++); stays ⊤; a mortal w/o converse never reaches ⊤.
  prove-deaths.mjs   headless: each death-rule routes to its bilattice value (f boss / ⊥ construct /
                     ⊤ cursed-form / ghost mortal). Proves the router is data-driven.
world/             generated by seed (gitignore). The on-disk EAVT trace.
README.md          what ruinfold is, how to run, the death model, the server/client division.
```

All imports honor the existing package.json map: `#substrate`, `#doing`, `#changing`, `#observing`, `#value` (from tab); `#engine/*`, `#server/*` (local).
`package.json` `test` script currently lists `prove-combat` + `prove-undeath`; extend it to add `prove-deaths`.

## Critical implementation details (load-bearing)

1. **`t` is a lexically-ordered string** and functional supersession compares it as a string.
  Use `clock(tick, seq)` → `"tick:000042/seq:0007"` (both zero-padded) so order is correct past 9 sub-events.
  One source in `functional.mjs`.
2. **Extend the functional set.** tab's `FUNCTIONAL` lacks health/position.
  Pass `opts.functional: RUIN_FUNCTIONAL` on **every** `settle`/`supersede` so position/health/level are latest-t-wins.
  This is the key integration decision.
3. **Single-writer discipline.** POST `/act` only *queues* intents; **all** appends happen inside `engine/tick.mjs`.
  Guard the interval with a `running` flag so a slow tick can't overlap the next (coalesce).
4. **Dirty-set snapshots.** Settle only subjects the tick touched; static geometry (zones/scenery) settled once at boot and cached.
  SSE sends `full` on connect, `delta` (only changed + `removed`) each tick.
  5 Hz server tick; client lerps at 60 fps.
5. **Append-only growth** is acknowledged: settle cost is bounded by latest-row-per- predicate, parse cost grows; compaction is out of scope for v0 — note it in README.

## Build approach — concurrent agents

The user asked for concurrent agents.
Build in dependency order; fan out within each layer.
Suggested orchestration (a Workflow or parallel Agent fan-out):

- **Phase A (foundation, sequential first):** `engine/functional.mjs` + `server/scripts/seed.mjs` skeleton + a minimal world — everything else depends on the `t` clock, RUIN_FUNCTIONAL, and a seeded world to run against.
- **Phase B (engine, parallel agents):** combat.mjs, death.mjs, movement.mjs, items.mjs, progression.mjs, zones.mjs, ai.mjs, snapshot.mjs — each an agent, all importing the Phase-A contracts. tick.mjs integrates them (after they land).
- **Phase C (server, parallel):** http.mjs, sse.mjs, actions.mjs, loop.mjs.
- **Phase D (client, parallel):** index.html + main.mjs (renderer/reconcile/input) and ui.mjs (HUD/inventory/death-window).
- **Phase E (tests + README, parallel):** prove-combat / prove-undeath / prove-deaths + README.
- Use `isolation: "worktree"` only if agents would write the same file; here files are disjoint so plain parallel agents are fine.
  Integrate (tick.mjs, loop.mjs) on the main thread after each layer.

## Verification (end-to-end)

1. **Install/link:** `pnpm install` at repo root (resolves `workspace:*` to tab).
2. **Unit proofs:** `pnpm --filter @561/development.experimental.ruinfold test` → prove-combat, prove-undeath, prove-deaths all pass (health supersession, ⊤ undeath + rise, the 5-way death router).
  Also run `tab`'s own tests once to confirm the substrate is intact.
3. **Seed + run:** `pnpm --filter ...ruinfold run dev` (seeds world/, starts server).
  Confirm it logs a listening port and ticks.
4. **Browser (use the `run`/`verify` skill or a headless check):** open the served URL; confirm three.js loads from CDN, the scene renders, a player mesh joins, WASD + click-to-move move it (SSE deltas flowing), attacking a skeleton drops its health to 0 and it **rises flickering as ⊤**, a goblin dies to a ghost-run, a boss dies to a corpse + loot, a wraith vanishes.
  Two browser tabs = two players sharing one world (the MMO check).
5. **Replay:** confirm the world is reconstructable from `world/*.jsonl` (the trace IS the world) — restart the server without re-seeding and state persists.

## Risks

- **Real-time over append-only disk:** mitigated by dirty-set + cache + single-writer
  + 5 Hz tick + client interpolation (§ Critical details).
- **CDN dependency for three.js:** the client needs internet to load three.js; acceptable per the charter, noted in README (could vendor later).
- **Log growth / no compaction in v0:** acknowledged, README-flagged.
- **Scope is broad:** if time-constrained at execution, the playable slice (zones
  + combat + the 5-way death model + one of each monster type) is the must-ship core; items/XP/leveling layer on top and can be trimmed last.

## Sources (death-model inspiration) - [Lycanthropy — Project: Gorgon Wiki](https://wiki.projectgorgon.com/wiki/Lycanthropy) - [Beast Forms — Project: Gorgon Wiki](https://wiki.projectgorgon.com/wiki/Beast_Forms) - [Death Effects and Diseases — Project Gorgon Wiki](https://project-gorgon.fandom.com/wiki/Death_Effects_and_Diseases)
