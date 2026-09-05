---
title: "Council has ordinance power ↔ departments have liability to comply"
type: jural-relation
correlate-pair: power-liability
active-party: city-council
active-relation: power
active-action: pass-ordinance
passive-party: department-directors
passive-relation: liability
passive-action: comply-with-ordinance
scope-action: any-departmental-act-within-the-ordinance-scope
charter-section: "Article II"
---


The city council holds legislative authority to pass ordinances; department directors hold the correlative **liability**: an ordinance passed by council changes the legal landscape against which the directors operate, regardless of their consent.

## Active side (council)

The council holds **power**: by majority vote at a regular meeting (with quorum), it may pass an ordinance binding within the city limits.

## Passive side (department directors)

Directors hold the correlative **liability**: their authority to act is conditioned on the ordinance set as council has settled it.
A new ordinance may expand, narrow, or rescope a director's powers without the director's consent.

## Substrate cells

When the council passes an ordinance: - `(ordinance-<slug>, status, passed) = T` - `(ordinance-<slug>, signed-by, mayor) = T` (or `vetoed-by, mayor` triggering veto-override path) - `(ordinance-<slug>, scope, <action-domain>) = T` - The action-domain cells of any director whose scope intersects the ordinance scope are revised: previously-permitted acts become disallowed, or new acts become required.

This is the key vehicle for governance-rules-as-closure-rules (Arc G): an ordinance is a substrate-authored governance rule whose closure-rule firing reshapes department authority on the next tick.
