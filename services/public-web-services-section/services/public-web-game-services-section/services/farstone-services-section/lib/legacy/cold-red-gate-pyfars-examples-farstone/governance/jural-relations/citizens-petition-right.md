---
title: "Citizens have petition right ↔ council has duty to hear"
type: jural-relation
correlate-pair: claim-duty
active-party: farston-residents
active-relation: claim
active-action: file-petition
passive-party: city-council
passive-relation: duty
passive-action: hear-petition
scope-action: petition-with-50-signatures
charter-section: "Article III §2"
---


Per Charter Article III §2: a citizen may file a petition with the records clerk; petitions with 50+ signatures must be heard at the next regular council meeting; the council shall vote within two meetings of first hearing.

## Active side (citizens)

Citizens hold a **claim**: they may file petitions through the records clerk and require the council to hear them when the signature threshold is met.

## Passive side (council)

The council holds the correlative **duty**: when a 50+ signature petition is filed, the council must hear it at the next regular meeting and vote within two meetings of first hearing.

## Substrate cells

When a petition with 50+ signatures lands: - `(petition-<slug>, has-signature-count, ≥50) = T` - `(petition-<slug>, filed-with, records-clerk) = T` - `(petition-<slug>, hearing-due-at, <next-regular-meeting>) = T` (derived) - `(city-council, has-pending-petition, petition-<slug>) = T` (derived)

The eligibility-by-message rule (channel-arrival) fires when the petition arrives on the records-clerk's queue; council members become eligible to consume the petition at the next meeting.
