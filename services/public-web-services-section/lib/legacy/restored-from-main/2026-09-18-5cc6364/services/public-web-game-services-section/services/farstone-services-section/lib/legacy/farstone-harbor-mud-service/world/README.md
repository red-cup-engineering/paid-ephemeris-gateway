# The World of Farstone

Farstone is a small granite island in the Farr Archipelago, off a cool maritime coast — a working harbor town after the summer trade has gone, where the fleet is half tied-up, money is short, and the most interesting things that happen are tides, fog, ferry schedules held up by weather, water-quality disputes, and permits aging past their decision windows.
It is deliberately *not* a fantasy place.
It is a plausible New England municipality with a charter adopted in 1923, a lighthouse lit in 1872, a volunteer fire department, a converted-Victorian city hall, and a salt marsh full of terns and soft-shell clams.
The world's heart is that it *holds its contradictions* rather than resolving them away: a disputed hydrant, a contested permit, a feud sharpening under scarcity — these are the stories Farstone tells about itself, on its own clock, without anyone scripting them.

This directory is the durable, version-controlled canon for the Farstone world.
The world is **data, not code** — written to survive every future engine rewrite.

## Start here

| File | What it holds |
|------|---------------|
| [`README.md`](./README.md) | This index — what Farstone is, and where the rest of the canon lives. |
| [`geography.md`](./geography.md) | The map: every named place, its description, and how the places connect. Regions, the harbor, Mt. Farstone, the marsh, the rural strips, with a list-form connection map. |
| [`biome.md`](./biome.md) | The living island: bedrock and soils, vegetation zones, the watershed, climate, tides, weather, wildlife, and the renewable resources actors draw on. |
| [`inhabitants.md`](./inhabitants.md) | Who lives here: the named citizens, municipal government, factions, and the harbor MUD cast — every NPC read as a ludics design, with traits, needs, and stakes. |
| [`lore.md`](./lore.md) | History, themes, and — above all — the tone and voice to preserve across every engine rewrite: what kind of place Farstone is and how it is meant to feel. |
| [`things.md`](./things.md) | The stuff: items carried, wielded, and worn; shop wares; currency; the forge's materials and recipes; the renewable provisions; and how the predicate-richness economy works. |
| [`harbor.json`](./harbor.json) | The first structured slice of the playable world — engine-neutral JSON of rooms, items, and NPCs (the MUD reading's seed). |
| [`../DESIGN.md`](../DESIGN.md) | The Farstone engine design: the thesis (a MUD is the theory wearing a walkable face), the architecture stack, the turn loop, the mechanics, and the build order. |

## What's canon and what isn't

Farstone exists in the recovered archive in two registers that this canon keeps distinct where they diverge:

- **The governance / municipal reading** (PyFARS) — the town as a small polity: the charter, the mayor and council, department directors, the harbormaster, named households, and the live civic disputes (Hydrant-23, the permit backlog, the snow-removal overrun, riparian-buffer non-compliance).
- **The harbor MUD reading** (the playable world) — the same island as a walkable, lived-in waterfront: Dax Pell and Sergeant Mara Quill on the quay, the Saltloft Inn, the chandlery, the boatyard forge, the marsh-witch's hut past the salt marsh.

These two readings share one geography and one ecology.
Where a name or detail appears in only one register, this canon says so rather than forcing a merge.

## Open questions (world-wide)

These are gaps the archive leaves honestly open — recorded so future work knows where the thin places are:

- Precise coordinates for named places (records note these live on individual place records "when they matter"; most don't yet exist).
- How the two readings (governance vs. MUD) relate after the migration from the earlier EAVT-log Farstone — what was preserved, what was lost.
- A detailed contour map with hydrant locations and a parcel index (only the ASCII sketch exists).
- Offshore rocks and shoals relevant to ferry routing.
- How often sea-level events move the Marsh / Marsh-End boundary.

Per-file open questions appear at the bottom of each canon file.
