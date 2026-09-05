---
title: "Public Works Director"
type: office
scope: water-sewage-roads-parks
reports-to: mayor
action-domain:
  - inspect-public-water
  - dispatch-road-repair
  - operate-water-treatment-plant
  - manage-snow-removal
  - file-water-quality-report
deontic-profile:
  inspect-public-water: power
  dispatch-road-repair: power
  operate-water-treatment-plant: power
  file-water-quality-report: duty
  inspect-quarterly: duty
  immunity-from-emergency-overtime-violations: immunity
provides-capabilities:
  - infrastructure-operation
  - water-quality-inspection
provides-skill:
  - conducting-water-quality-inspection
  - dispatching-road-repair
  - filing-quarterly-report
jurisdiction-write:
  - examples/farston/operations/triage/dispatch-intents/
  - examples/farston/work/tasks/municipal/
---


The office responsible for the city's physical infrastructure: water treatment, sewage handling, road maintenance, snow removal, and parks.
Inspects public hydrants and water-quality sampling points quarterly per Charter Article III §4.

## Powers

- **Inspect public water.** Authority over public hydrants, treatment plant, sampling points.
- **Dispatch road repair.** Schedules pothole patching, paving, snow operations.
- **Operate water treatment plant.** Daily operational authority; emergency authority during boil-water events.

## Duties

- **File water-quality report quarterly** per charter §4.
  Reports filed to the public registry through the records clerk.
- **Inspect quarterly.** Every public hydrant and sampling point at least once per calendar quarter.

## Immunity

Operational decisions made during a declared public-health emergency are immune from charter-binding-violation findings related to overtime authorization, per a 2019 council resolution.

## Touches paths

Public Works writes operational records under `operations/triage/` (active dispatch intents) and `work/tasks/municipal/` (longer-running infrastructure work).
