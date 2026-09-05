---
title: "Extend substrate index to key notes by content-hash"
type: task
area: engineering
status: open
horizon: captured
milestone: m6-federation
goal: content-hash-addressing
depends-on: [implement-content-hash-derivation-for-substrate-notes]
requires-capabilities: [python-editing, indexing]
theory-basis: [content-hash-addressing, sovereign-node]
---


## Description

Add a content-hash → note-record reverse index to `substrate/index.py`.
The substrate-load process computes the hash for each loaded note and registers it in the index alongside the existing slug/path indices.
Lookups by hash run in $O(1)$ per result.

This is what the federation cycle uses to de-duplicate received envelopes: a peer sends a cell referencing content-hash H; the local engine looks up by H — if the note exists locally, the join with the peer's cell happens; if not, the local engine accepts the new note (subject to authorization checks).

## Acceptance

- [ ] `substrate/index.py` carries `content_hash_to_note: dict[str, NoteRecord]`.
- [ ] On boot, every loaded note is hashed and indexed.
- [ ] On mid-tick substrate write (e.g., M5's on-complete authoring), the new note is added to the index with its hash.
- [ ] Lookup API: `substrate.lookup_by_content_hash(hash) -> Optional[NoteRecord]`.
- [ ] Tests cover: lookup-existing, lookup-missing, post-write-update.

## Progress cells

*(empty — task not yet started)*
