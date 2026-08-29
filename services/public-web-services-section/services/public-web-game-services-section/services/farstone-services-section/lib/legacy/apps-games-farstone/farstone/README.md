# Farstone

A small granite island off a cool maritime coast.
One mountain (Mt Farstone, 620 m) over a single watershed; the Farr River down through farm valley to Farston Harbor; a tidal salt marsh in the northeast; an automated lighthouse on the harbor approach; and a weather-held ferry to the mainland.
The town (~10,000 people) is a working harbor town — ferry terminal, fish-pier, the harbormaster's office, city hall in a converted Victorian, a records office with a backlog of building permits.

The vibe is the point: **grounded, municipal, salt-worn**.
Not a fantasy world — a place where the interesting events are tides, fog, ferry schedules, water-quality disputes, and permits aging past their decision window.
That last one is why Farstone is the demo: it gives the world a natural **⊤** (contradiction-as-a-situation) that arises *on its own* as the clock runs.

Farstone is ported, for vibe not for specifics, from the prior Farstone in the tab archive (`development/lab/archive/multi-user-dungeon/tab/javascript/tab-2026-05-25/.../world/library/farstone/`, which already kept it as `{e,a,v,t}` rows) and from the PyFARS governance Farstone under the predication-categories bucket.

## What's here

- **`build-farstone.mjs`** — the canonical source.
  It builds the world by *doing* (the package's own `doing` morphism), so dual-filing, reification, and the converse declaration are exercised exactly as play would.
  This is the truth; the `.jsonl` files are its committed output.
- **`*.jsonl`** — the committed **seed** (tick 0): eleven places, five items, the harbormaster (an npc), Building Permit #23, and a player.
  Browsable, append-only EAVT logs, one per entity.

The committed logs are the seed only.
Running the daemon against this directory would append tick rows to it; the tests copy the seed into a temp dir before advancing it, so the example stays at tick 0 in the repo.

## What it does on its own

`node ../../scripts/run.mjs . --ticks 31 --interval 0` runs the world forward.
Each tick, with no input:

- the **tide** turns (six ticks rising, six falling); at low water the marsh clam bed exposes;
- the **ferry** sails docked↔underway — unless **fog** (every fifth tick) holds it in port;
- **fog rings the brass harbor bell**, and the **harbormaster** (an npc) responds by tending it;
- **Permit #23 ages**; past tick 30 the world files `overdue`, and against its standing `within-window` assertion the cell settles to **⊤**.

Rebuild it, point `run.mjs` at it, and play.
