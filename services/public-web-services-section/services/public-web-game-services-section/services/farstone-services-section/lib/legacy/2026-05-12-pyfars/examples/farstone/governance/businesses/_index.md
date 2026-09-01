---
type: index
status: open

contents:
  - slug: farston-general-store
    kind: general-store
    place: downtown-farston
  - slug: harbor-cafe
    kind: cafe
    place: harbor-district
  - slug: farston-hardware
    kind: hardware-store
    place: downtown-farston
  - slug: ferry-terminal-cafe
    kind: cafe
    place: harbor-district
  - slug: farston-library
    kind: library
    place: downtown-farston
  - slug: farston-clinic
    kind: clinic
    place: downtown-farston

required-fields-on-business-record:
  - slug
  - type
  - kind
  - place
  - opening-hours
  - closes-on-holidays

derived-cells-rule: opening-hours-derivation
---

# Farstone businesses

Substrate records for the businesses operating on Farstone Island.
The `opening-hours-derivation` closure rule reads each business's `opening-hours:` and `closes-on-holidays:` cells (plus the world-clock and world-calendar cells) and writes `(business, open-now, ?)
`, `(business, next-open-at, ?)
`, `(business, next-close-at, ?)
` each settling pass.

Coverage is sketch — six businesses across two neighborhoods.
Extend as arcs need richer commerce content.
