---
name: writing-a-duty
description: "Writes a duty record from data, validating it against duty.schema.json and refusing every unmet precondition; amends a seated duty to a changed schema with --amend; and with --check validates every seated duty, exiting non-zero on any that does not conform, and non-zero on an empty sweep. Use when seating a new duty, amending one to a changed schema, or proving the duties pool still says what it claims."
---

Design: lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/text/documents/lld-commission-write-a-duty-and-write-a-work.md
(reviewed by senior-software-engineer, verdict PASS-WITH-CONDITIONS, both
conditions discharged on the record before this file was written). Sibling:
write-a-work.js. Both mirror write-an-office.js's pattern — the same
resolution primitives, the same read-a-schema.js validation, never a
private copy of it — with the frontmatter and reciprocal-edge layers
removed: every seated duty is a plain JSON instance, and duty.schema.json
declares no reciprocal edge for this script to patch.

The schema is loaded at RUNTIME and is the only authority on shape — this
script hardcodes no field names beyond the residual obligations the schema
explicitly delegates to it (id-equals-basename, reference resolution).

## Run it

```sh
node .../write-a-duty.js --check      # validate every seated duty
echo '{...}' | node .../write-a-duty.js
echo '{...}' | node .../write-a-duty.js --amend
```

`--from` (default: the caller's working directory) is where the duties pool
is asked for; only where that walk finds nothing does resolution walk up
from this script's own file location before refusing — a bare invocation
standing above the unit's pool, such as the repository root, still finds
the management pool this script is seated beside.

Input is JSON. Output is JSON. Neither is ever prose, because a record an
LLM types is a record nothing checked.

## What it refuses, and why that is the skill

A duty that already exists, refused and never overwritten. A reference
(authority, work, claim, or a skill) resolving to nothing, refused before
writing — except the literal "emsenn", which names the enterprise itself
and never an office record, mirroring how write-an-office.js exempts
part-of. A true tie between two equally-near seats, refused with both
named. A record that fails its own read-back, withdrawn rather than left
seated. An empty --check sweep, because a checker that finds nothing and
reports success is worse than none — it reads as proof.

## When NOT to use

- Not for editing duty.schema.json — the schema is the contract this discharges.
- Not for a task raised against a duty — that is making-a-task.
- Not for a work record — that is write-a-work.js.
