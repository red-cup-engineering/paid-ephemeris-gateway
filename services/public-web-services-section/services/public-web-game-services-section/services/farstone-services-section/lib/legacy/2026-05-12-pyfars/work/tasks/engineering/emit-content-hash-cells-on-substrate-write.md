---
title: "Emit content-hash cells on substrate write"
type: task
area: engineering
status: open
horizon: captured
milestone: m6-federation
goal: content-hash-addressing
depends-on: [extend-substrate-index-to-key-by-content-hash]
requires-capabilities: [python-editing, witness-emission]
theory-basis: [content-hash-addressing, first-class-provenance]
---


## Description

When the runtime writes a new note (mid-tick substrate write per [M5](../../milestones/m5-agential-self-generation.md)), additionally emit `(note, content-hash, <hash>) = T` as a substrate cell.
This makes the hash a first-class predicate cell, not just an index key.

Why a cell: federation envelopes reference cells, and a cell-shaped hash claim is what lets a federated peer verify "the note I see has content-hash H" by looking at the substrate, not at a separate metadata table.

## Acceptance

- [ ] Substrate-write functions (the M5 on-complete handler, any other write path) emit `(note, content-hash, <hash>) = T` after writing.
- [ ] The hash cell uses the same canonical-form hash as the index.
- [ ] Replay-stable: replaying writes produces the same hash cells.
- [ ] Tests cover: skill on-complete emits the hash cell; runbook on-complete emits the hash cell.

## Progress cells

*(empty — task not yet started)*
