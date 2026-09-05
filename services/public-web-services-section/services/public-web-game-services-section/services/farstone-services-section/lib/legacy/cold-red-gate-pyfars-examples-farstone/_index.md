---
type: example
class: polity
status: sketch
depends-on: [polity, office, agent, workitem, channel, dispatch, charter]
instantiates: [substrate-driven-dispatch, dispatch-derives-from-governance, four-layer-rule-architecture]
nix-package:
  input-name: farstone
  flake-url: "git+ssh://git@github.com/emsenn/farstone"
  follows-inputs: [nixpkgs, flake-utils]
  package-name: farstone-engine
---

# Farstone — an island polity (testbed)

Farstone is a small island polity. **Mt Farstone** rises at the island's center; the **town of Farston** sits on the harbor side at the mouth of the Farr River.
The polity's substrate scope is the whole island — the town and its government are one feature within it, sharing space with the mountain, the salt marsh, the farms in the river valley, the working harbor, and the mainland-ferry that ties the island to the rest of the region.

Farstone is **PyFARS's primary downstream-package example** — a working illustration of what it looks like to depend on the PyFARS engine and ship a polity built on it.
PyFARS is the engine; Farstone is the polity.
Its content (governance, work, objects, operations) is hand-authored substrate; the engine is brought in as a Nix flake input.
The `flake.nix` and `_index.md` `nix-package:` block in this directory are what make this directory a "package" in the Nix sense — consumable as `inputs.farstone` from any flake that wants to deploy the testbed.

Beyond illustrating the package shape, Farstone is the autonomous-loop campaign's acceptance environment: arcs A through K run their acceptance against `farstone-engine` (or `pyfars run examples/farstone/`) before any change graduates to PyFARS's own substrate.

Farstone is a polity in the literal PyFARS sense — it carries `governance/`, `work/`, `objects/`, `operations/` as a real polity tree, with municipal-and-environmental content rather than self-development content.
Domain isolation: a misfiring closure rule or runaway dispatch corrupts only Farstone, recoverable by `rm -rf examples/farstone/.pyfars && pyfars run examples/farstone/`.

## Why an island municipality

Municipal-on-an-island structure exercises PyFARS's conceptual stack across two registers — the political and the environmental — at once:

| PyFARS concept | Farstone realization |
|---|---|
| polity | Farstone Island |
| office | mayor of Farston, city council, dept directors, harbormaster |
| DeonticProfile (Hohfeldian) | citizen rights / council powers / dept duties / inspector immunities |
| charter + closure rules | the city charter + municipal ordinances + island-wide environmental rules |
| workitem subtypes | water treatment (process) / permit issuance (procedure) / financial audit (derivation) / complaint investigation (inquiry) |
| channels | public meeting / emergency dispatch / water-quality reports / harbor-radio |
| budget gating | actual municipal budget |
| ⊤-anomaly | water main contradiction (clean-water claim + boil-advisory) |
| federation (M6) | regional water districts, the mainland county, neighboring islands |
| environmental cadence | tide / weather / season as substrate cells, derived each tick from the world-clock |

## The island and the town

**Farstone Island** is roughly oval, ~14 km north-to-south by ~9 km east-to-west, set in a coastal archipelago.
The Farr River descends from Mt Farstone's southern flanks, runs through the river valley's farmland, and meets the sea at the harbor.
The island is reached by a passenger-and-vehicle ferry from the mainland, twice daily.

**Mt Farstone** is the central peak: ~620 m, mixed conifer-broadleaf forest on its flanks, granite outcrops near the summit.
It's the watershed of nearly every freshwater source on the island.

**Farston** is the town — ~12,000 residents, working harbor, a 5-member city council elected at-large, a finance director who's been in office since 2019.
The town hall is a converted Victorian on Main Street.
Farston runs its own water treatment plant fed from upstream wells in the mountain's catchment, maintains 47 miles of road, and operates a volunteer fire department.

Beyond the town: **scattered farmsteads** in the south river valley, **rural homes** on the north shore and around the mountain's flanks, **salt marsh** at the island's northeast corner, a **lighthouse** at the southern point.

## Recent issues

- **Hydrant-23 dispute.** Two inspectors recently filed conflicting water-quality reports on Hydrant-23 (Public Works's regular inspector logged a pass; the contracted lab's inspector logged a fail).
  The discrepancy hasn't been resolved. *(Designed anomaly: produces a ⊤-cell in the substrate; exercises Arc F's anomaly surfacing.)*
- **Permit backlog.** Building & Safety has 14 pending permit applications, 3 of them aging past the charter-required 30-day decision window.
- **FY2026 budget.** Council adopted a tight budget with a $48k contingency line; Public Works is already projecting an overrun on storm-debris cleanup.
- **Pothole on Elm Street.** Citizen complaint #2026-117 filed two weeks ago, not yet routed.

## Layout

| Path | Mirrors |
|---|---|
| `governance/charter.md` | the city charter — hard-core commitments and procedural rules |
| `governance/decisions/` | council-adopted resolutions and binding decisions |
| `governance/specifications/` | technical specs (water-quality thresholds, geography, biome) |
| `governance/specifications/geography/` | the island, the river, the harbor, the ferry |
| `governance/specifications/biome/` | bedrock, soils, vegetation zones, watershed, climate |
| `governance/places/` | named places — neighborhoods, landmarks, the mountain, the marsh |
| `governance/cadences/` | substrate-resident cadences (heartbeat, hour, day, season) |
| `governance/offices/` | mayor, council, dept director offices |
| `governance/agents/` | named human + automated incumbents |
| `governance/skills/` | procedural skills offices exercise |
| `governance/runbooks/` | composed procedures (skill-sequences with branching) |
| `governance/duties/` | mandatory recurring duties |
| `governance/jural-relations/` | citizen↔council and council↔dept normative pairs |
| `governance/state/` | live substrate cells the engine reads each tick (world-clock, weather, tide) |
| `objects/` | closure-rule records active for this polity |
| `work/tasks/` | workitems across all four subtypes |
| `operations/triage/dispatch-intents/` | citizen-filed intents awaiting routing |

## Acceptance environment for the campaign arcs

Arcs A, C, D, E, F, G, H, I list `examples/farstone/` as their acceptance environment.
The pattern: get an arc working against Farstone, then graduate to PyFARS-self-application as a second pass.

## Status

Sketch.
The records below are believable enough to dispatch, but the island's history is not deeply specified — feel free to extend incident records, council minutes, citizen rosters, biome surveys, etc., as later arcs need richer context.
