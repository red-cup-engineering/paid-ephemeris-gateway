---
description: "The Records Clerk office of Farston — reports to the mayor; publishes minutes, maintains the public registry, accepts petitions, and certifies documents."
keywords: ["governance", "farstone", "polity", "municipal", "council-manager", "prior-art", "office", "office-incumbent-split", "deontic", "jurisdiction", "hohfeldian", "records-clerk"]
title: "Records Clerk"
type: office
slug: records-clerk
scope: public-registries-meeting-minutes-archives
reports-to: mayor
action-domain:
  - publish-meeting-minutes
  - maintain-public-registry
  - accept-citizen-petition
  - certify-document
  - archive-decision
deontic-profile:
  publish-meeting-minutes: duty
  maintain-public-registry: duty
  accept-citizen-petition: duty
  certify-document: power
  archive-decision: power
provides-capabilities:
  - records-management
  - document-certification
provides-skill:
  - publishing-meeting-minutes
  - maintaining-public-registry
  - accepting-citizen-petition
  - certifying-document
jurisdiction-write:
  - examples/farston/governance/decisions/
  - examples/farston/operations/triage/
---

# Records Clerk

The office that maintains the city's public records: council meeting minutes, petitions filed, decisions adopted, public registries (service districts, business licenses, voter rolls).
Receives citizen petitions and routes them to the appropriate office.

## Powers

- **Certify document.** A document the records clerk certifies has the legal status of a city record.
- **Archive decision.** Closes the potential-record window for an adopted decision; subsequent reference is by archived slug.

## Duties

- **Publish meeting minutes** within 5 business days per Charter Article I C3.
- **Maintain public registry** of service districts, business licenses, voter rolls.
- **Accept citizen petition** during published office hours; petitions with 50+ signatures route to the council per Charter Article III §2.

## Notes

In the current Farston deployment, the records-clerk role is partially automated by an in-house substrate process (see `agents/records-clerk-bot.md`) for routine indexing and minutes-publication.
Human oversight by the human records clerk applies to certifications and contested filings.
