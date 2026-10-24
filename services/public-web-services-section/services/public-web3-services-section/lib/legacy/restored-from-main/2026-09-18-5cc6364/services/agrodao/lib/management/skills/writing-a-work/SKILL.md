---
name: writing-a-work
description: "Writes a work record from data, validating it against work.schema.json and refusing every unmet precondition; amends a seated work to a changed schema with --amend; and with --check validates every seated work, exiting non-zero on any that does not conform, and non-zero on an empty sweep. Use when seating a new work, amending one to a changed schema, or proving the works pool still says what it claims."
---

Design: lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/text/documents/lld-commission-write-a-duty-and-write-a-work.md
(reviewed by senior-software-engineer, verdict PASS-WITH-CONDITIONS, both
conditions discharged on the record before this file was written). Sibling:
write-a-duty.js, which this file mirrors verbatim in shape. The one
structural difference: work.schema.json's `needs` field declares no
resolution obligation (its own $comment never says a `needs` entry must
resolve to a skill, unlike duty.schema.json's `skills`), and the seated
pool bears this out — some `needs` entries name seated skill ids, others
name bare capability phrases. Guessing which is which would be exactly the
shape-guessing read-a-schema.js itself refuses to do, so REFERENCE_POOLS is
empty here: `needs` is read, never checked against a pool.

The schema is loaded at RUNTIME and is the only authority on shape.

## Run it

```sh
node <red-cup-engineering/computer-engineering-services-section>/lib/received/2026-10-24-public-computer-services-section/services/public-web-services-section/services/public-web3-services-section/lib/legacy/restored-from-main/2026-09-18-5cc6364/services/agrodao/lib/management/skills/writing-a-work/scripts/write-a-work.js --check      # validate every seated work
echo '{...}' | node <red-cup-engineering/computer-engineering-services-section>/lib/received/2026-10-24-public-computer-services-section/services/public-web-services-section/services/public-web3-services-section/lib/legacy/restored-from-main/2026-09-18-5cc6364/services/agrodao/lib/management/skills/writing-a-work/scripts/write-a-work.js
echo '{...}' | node <red-cup-engineering/computer-engineering-services-section>/lib/received/2026-10-24-public-computer-services-section/services/public-web-services-section/services/public-web3-services-section/lib/legacy/restored-from-main/2026-09-18-5cc6364/services/agrodao/lib/management/skills/writing-a-work/scripts/write-a-work.js --amend
```

`--from` (default: the caller's working directory) is where the works pool
is asked for; only where that walk finds nothing does resolution walk up
from this script's own file location before refusing.

Input is JSON. Output is JSON. Neither is ever prose.

## What it refuses, and why that is the skill

A work that already exists, refused and never overwritten. A record that
fails its own read-back, withdrawn rather than left seated. An empty
--check sweep, because a checker that finds nothing and reports success is
worse than none — it reads as proof.

## When NOT to use

- Not for editing work.schema.json — the schema is the contract this discharges.
- Not for a duty record — that is write-a-duty.js.
