---
type: index
status: open

citizens:
  - slug: marisol-vazquez
    name: "Marisol Vázquez"
    place: downtown-farston
    household: vazquez-household
  - slug: tomas-vazquez
    name: "Tomás Vázquez"
    place: downtown-farston
    household: vazquez-household
  - slug: ellis-pearce
    name: "Ellis Pearce"
    place: the-ridge
    household: pearce-household
  - slug: anita-pearce
    name: "Anita Pearce"
    place: the-ridge
    household: pearce-household
  - slug: ben-jordan
    name: "Ben Jordan"
    place: farr-valley
    household: jordan-farmstead
  - slug: mira-jordan
    name: "Mira Jordan"
    place: farr-valley
    household: jordan-farmstead

households:
  - slug: vazquez-household
    members: [marisol-vazquez, tomas-vazquez]
    address: "412 Cherry Lane"
    place: downtown-farston
  - slug: pearce-household
    members: [ellis-pearce, anita-pearce]
    address: "88 Ridge Road"
    place: the-ridge
  - slug: jordan-farmstead
    members: [ben-jordan, mira-jordan]
    address: "27 Valley Road"
    place: farr-valley

required-fields-on-citizen-record:
  - slug
  - type
  - name
  - address
  - place
  - household
required-fields-on-household-record:
  - slug
  - type
  - title
  - address
  - place
  - members
---

# Farstone citizens

Substrate records for named residents of the island.
A citizen carries petition rights, votes, and may file complaints; an [`agent`](../agents/_index.md) is what causes acts in dispatch.
A citizen who serves an office is *also* an agent; the agent record references the citizen.

Households group co-resident citizens at one address.
Coverage is sketch — six citizens, three households.
Extend as arcs need richer demographic content.
