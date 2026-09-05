---
type: index
status: open

contents:
  - slug: farstone-island
    kind: island
    contained-in: null
  - slug: mt-farstone
    kind: natural-feature
    contained-in: farstone-island
  - slug: town-of-farston
    kind: municipality
    contained-in: farstone-island
  - slug: downtown-farston
    kind: neighborhood
    contained-in: town-of-farston
  - slug: harbor-district
    kind: neighborhood
    contained-in: town-of-farston
  - slug: marsh-end
    kind: neighborhood
    contained-in: town-of-farston
  - slug: the-ridge
    kind: neighborhood
    contained-in: town-of-farston
  - slug: farr-valley
    kind: rural-area
    contained-in: farstone-island
  - slug: north-shore
    kind: rural-area
    contained-in: farstone-island
  - slug: the-marsh
    kind: natural-feature
    contained-in: farstone-island
  - slug: farr-river
    kind: natural-feature
    contained-in: farstone-island
  - slug: farston-harbor
    kind: natural-feature
    contained-in: farstone-island
  - slug: south-point-light
    kind: infrastructure
    contained-in: farstone-island

required-fields-on-place-record:
  - slug
  - type
  - kind
  - contained-in
  - biome-zone
optional-coordinate-fields-on-place-record:
  - lat
  - lon
  - elevation-m
  - area-km2
---

# Farstone places

Named places — neighborhoods, landmarks, natural features, infrastructure — referenced by hydrants, businesses, citizens, ferry schedules, dispatch records, and the rest of Farstone's substrate.
A place is an entity with location identity; it carries a slug, a containing region, a biome-zone reference.

The map under [`farstone-map.md`](farstone-map.md) is the single illustration tying the slugs to a sketch geography.

When a new arc names a specific location — a parcel, a road intersection, a hydrant — extend this directory with a record carrying the conventions above.
Keep records short; the substrate's job is to give the slug a stable identity, not to be a gazetteer.
