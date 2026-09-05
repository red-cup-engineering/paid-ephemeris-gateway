---
title: "Implement content-hash derivation for substrate notes"
type: task
area: engineering
status: open
horizon: captured
milestone: m6-federation
goal: content-hash-addressing
depends-on: [publish-fars-federation-spec-as-rfc]
requires-capabilities: [python-editing, hash-algorithm-knowledge]
theory-basis: [content-hash-addressing]
---


## Description

Add a function in `substrate/index.py` (or equivalent) that takes a substrate note's path or in-memory representation and returns a canonical content hash.

Steps: 1.
Parse the note's frontmatter and body.
2.
Render the frontmatter into canonical YAML (sorted keys, normalized whitespace).
3.
Concatenate canonical-frontmatter + canonical-body (newline-normalized).
4.
Hash with the algorithm chosen in the federation RFC (SHA-256 or BLAKE3 — finalize during this task).
5.
Return the hex digest.

The hash is replay-stable: the same input produces the same hash.
Test by hashing the same note via two different code paths and asserting equality.

## Acceptance

- [ ] `substrate/index.py:content_hash(path_or_record)` function exists.
- [ ] Hash algorithm choice documented in code comment + the federation RFC.
- [ ] Canonical-form derivation handles: key reordering, whitespace differences, trailing newlines.
- [ ] Tests cover: same content via two paths produces same hash, frontmatter key reorder produces same hash, body whitespace differences produce same hash.
- [ ] No content-modifying side effects.

## Progress cells

*(empty — task not yet started)*
