# Farstone Wild — a generated world

A real, sizable world, not a toy: **40 areas across 5 biome-regions, 16 NPCs, 20 resources, 20 items** — generated deterministically by `#worldgen` (seed 1).
Regenerate or make a different world with:

```sh
node scripts/run.mjs <some-dir> --generate <seed>
```

Same seed → byte-identical world (no RNG, no clock; everything is a hash of the seed + index).
This committed copy is **tick 0** (pristine); ticking it brings it to life.

## It lives

Unlike the hand-authored `farstone/` (a vignette tuned to demonstrate the algebra), this world is a **stage for emergent stories**.
Every NPC carries traits, three needs (hunger/rest/recreation), skills, and a home.
Each tick:

- **needs decay** (hunger fastest);
- each NPC's **mood** = how satisfied its needs are, shifted by traits;
- the NPC **pursues its most pressing need** — `decide` runs a utility-AI: find the nearest resource that `provides` the need (BFS over the map's exits), move toward it, and use it;
- using a resource **depletes** it — so the world has scarcity, and scarcity makes stories (when the clams run out, the hungry compete, moods break).

Run it:

```sh
cp -r examples/farstone-wild /tmp/wild
node scripts/run.mjs /tmp/wild --ticks 20 --interval 0   # the world advances on its own
node scripts/run.mjs /tmp/wild --needs npc-0              # watch one life
node scripts/run.mjs /tmp/wild --monologue <entity>      # its held contradictions, as monologue
node scripts/run.mjs /tmp/wild --closure <entity>        # mood / distance-from-settled
node scripts/run.mjs /tmp/wild --health <entity>         # body capacities
```

In a 12-tick run from seed 1, `npc-0` left home chasing rest, ate and rested its mood from 0.68 to 0.86, and 18 of 20 resources were drawn down by the population.
No events were scripted; it is the systems interacting.

## Caveat

The world is the append-only log, and `decide` re-reads it each tick, so a long simulation over many NPCs is slow (correctness over speed).
An in-memory fold cache is the next optimization.
