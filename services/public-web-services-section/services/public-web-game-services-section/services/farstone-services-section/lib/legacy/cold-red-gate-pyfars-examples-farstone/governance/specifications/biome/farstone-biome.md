---
title: "Farstone Island — biome"
type: specification
status: active
authority: city-council
basis: state-environmental-survey-2018

bedrock-zones:
  - zone: summit-and-flanks
    bedrock: granite-intrusive
    soil: thin-acidic-leaf-litter-mor
    drainage: rapid
  - zone: the-ridge
    bedrock: granite-plus-glacial-till
    soil: thin-acidic-loam
    drainage: moderate
  - zone: farr-valley
    bedrock: granite-under-alluvium
    soil: deep-silty-alluvial-loam
    drainage: well-drained-on-terraces-poor-near-river
  - zone: coastal-lowland
    bedrock: granite-under-marine-sediments
    soil: sandy-loam-over-clay-subsoil
    drainage: moderate-some-hardpan
  - zone: the-marsh
    bedrock: granite-under-peat-and-tidal-mud
    soil: organic-peat-over-saline-mud
    drainage: tidal-saturated
  - zone: north-shore
    bedrock: granite-plus-glacial-till
    soil: thin-gravelly-loam
    drainage: rapid

vegetation-zones:
  - zone: summit-and-upper-flanks
    dominant-vegetation: [krummholz-spruce, subalpine-fir, juniper, lichen]
    successional-state: climax
    notes: bare-rock-fraction-increases-above-500m
  - zone: mid-flanks-forest
    dominant-vegetation: [red-spruce, balsam-fir, paper-birch, red-maple]
    successional-state: mid-to-late-successional
    notes: watershed-of-municipal-wells-logging-restricted-by-ordinance
  - zone: lower-flanks-mixed-forest
    dominant-vegetation: [sugar-maple, beech, yellow-birch, eastern-hemlock]
    successional-state: mature-mixed-broadleaf-conifer
    notes: recreational-trails-town-watershed-extends-here
  - zone: riparian-corridor
    dominant-vegetation: [red-maple, silver-maple, alder, fern-understory]
    successional-state: climax-flood-adapted
    notes: flooding-regime-intact-buffer-ordinance
  - zone: farr-valley-farmland
    dominant-vegetation: [hay, vegetable-row-crops, small-orchards]
    successional-state: actively-cultivated
    notes: 140-ha-22-farmsteads
  - zone: coastal-scrub-and-dune
    dominant-vegetation: [beach-pea, beach-plum, marsh-elder, bayberry]
    successional-state: naturalizing-on-disturbed-sites
    notes: thin-band-along-harbor-and-beaches
  - zone: salt-marsh
    dominant-vegetation: [spartina-patens, spartina-alterniflora, salt-meadow-rush]
    successional-state: climax-tidal
    notes: 3-km2-shellfish-bed-bird-rich

watershed:
  description: single-catchment-centered-on-mt-farstone
  flow:
    - "snowmelt-and-rain-on-upper-flanks → headwater-streams → farr-river"
    - "farr-river-mid-course-passes-municipal-well-field"
    - "farr-river-meets-sea-at-farston-harbor"
    - "north-flank-streams-drain-to-the-marsh-not-the-river-producing-brackish-regime"
    - "north-shore-drainage-direct-to-coast-via-intermittent-streams"
  aquifer: fractured-granite-tapped-by-municipal-wells-north-of-town

wildlife:
  mammals: [white-tailed-deer, raccoon, red-fox, snowshoe-hare, harbor-seal-offshore, eastern-coyote-occasional]
  birds: [osprey-nesting-at-harbor, bald-eagle-winter, great-blue-heron-marsh, common-tern-breeding-colony-south-point, warblers-thrushes-seasonal]
  marine: [striped-bass, lobster, blue-mussel, soft-shell-clam-marsh, atlantic-herring-offshore]
  state-listed: [common-tern-marsh-colony]
  notable-old-growth-with-disturbance: mt-farstone-watershed-forest

climate:
  climate-band: cool-maritime
  mean-annual-temp-c: 8.4
  frost-free-days: 150
  frost-free-window-start: "early-may"
  frost-free-window-end: "early-october"
  mean-annual-precip-mm: 1180
  dominant-wind-direction-summer: southwest
  dominant-wind-direction-winter: northwest
  storm-exposure: atlantic-frontal-systems-plus-occasional-remnant-tropical-systems-aug-oct
  tide-regime: semidiurnal
  mean-tide-range-m: 2.6
  spring-tide-range-m: 3.4

cadence-derivable-cells:
  - "(farstone, season, X)"
  - "(farstone, growing-season-active, true|false)"
  - "(farstone, weather, X)"
  - "(farstone, dry-streak-days, n)"
  - "(farston-harbor, tide-state, rising|falling)"
  - "(farston-harbor, tide-height-m, x)"
  - "(the-marsh, shellfish-closed, true|false)"
---


The land-base of the polity.
Where [`farstone-island`](../geography/farstone-island.md) declares shape and extent, this record declares the living ground — the bedrock, soils, vegetation zones, watershed, wildlife, climate band — that downstream cadence-derivations (weather, tide, growing season, fire-risk, shellfish closures) read.

All cells are in the frontmatter above; this body is for human readers and points to the open questions.

The aquifer is a fractured-granite system underlying the whole island; the municipal wells north of town tap it where the fractures align with the Farr River's recharge zone.
Water-quality is governed by [`water-quality-thresholds`](../water-quality-thresholds.md).

The Marsh's tern colony is state-listed; the Mt Farstone watershed forest was identified as old-growth-with-disturbance in the 2018 environmental survey and is logging-restricted by ordinance.

## Open

- Detailed soil-survey records per parcel.
  Out of scope until a specific arc needs parcel-level resolution.
- Fish and shellfish population cells — currently absent; required when a biology arc lands.
- Forestry and old-growth designation map.
