---
title: "Farstone Island — geography"
type: specification
status: active
authority: city-council

name: "Farstone Island"
archipelago: "Farr Archipelago, eastern coastal shelf"
extent-km-north-south: 14
extent-km-east-west: 9
area-km2: 98
highest-point-name: mt-farstone
highest-point-elevation-m: 620
coastline-km: 62
coastline-character: "mostly-rocky-with-three-sand-beaches-and-one-tidal-marsh"

population-total: 12000
population-by-place:
  - place: town-of-farston
    pop: 10400
  - place: farr-valley
    pop: 350
  - place: north-shore
    pop: 320
  - place: the-ridge
    pop: 800
  - place: marsh-end
    pop: 600

mainland-connection:
  mode: ferry
  kind: passenger-and-vehicle
  daily-sailings: 2
  weather-dependent: true

major-features:
  - slug: mt-farstone
    kind: peak
    notes: granite-outcrops-above-treeline-mixed-conifer-broadleaf-below-island-watershed-source
  - slug: farr-river
    kind: watercourse
    notes: descends-from-mt-farstone-southern-flanks-meets-sea-at-farston-harbor
  - slug: farston-harbor
    kind: embayment
    notes: south-coast-protected-by-granite-breakwater-deep-enough-for-ferry-at-most-tides
  - slug: the-marsh
    kind: salt-marsh
    notes: 3-km2-northeast-corner-tidal-brackish-shellfish-bed-summer-closure
  - slug: the-ridge
    kind: shoulder
    notes: mt-farstone-southwest-shoulder-residential-up-to-200m-above-sea-level
  - slug: south-point-light
    kind: lighthouse
    notes: automated-since-1987-mainland-coast-guard-maintenance

city-jurisdiction-boundary: "high-tide-line-of-farston-harbor"
incorporated-rural-areas: [farr-valley, north-shore, the-ridge-upper, marsh-end]
---


The geographic ground every other Farstone record sits on.
Place records, hydrant locations, ferry schedules, ward boundaries, parcel addresses, weather and tide derivations — all of them resolve back to the cells declared in this record's frontmatter.

Place coordinates are kept on individual place records under [`places/`](../../places/_index.md) when location precision matters; most places omit coordinates and reference only the slug + containing region.

## Why island, not river-valley

The river-valley framing in the original sketch made Farston a town on a continent — fine for testing dispatch, weak for testing federation, weather, and tide-coupled biology.
The island framing bounds the polity sharply, gives a natural federation peer (the mainland county, reached by ferry), couples weather and tide and biome cleanly (one watershed, one tidal regime, one wind exposure), and gives the city council's chartered jurisdiction a real edge — at the high-tide line of Farston Harbor.

## Open

- Detailed contour map; currently a sketch ASCII map under [`places/farstone-map.md`](../../places/farstone-map.md).
- Subdivision into wards/districts beyond the named neighborhoods.
- Offshore rocks and shoals relevant to ferry routing.
