---
title: "FARS predicate-shape discipline"
description: "FARS-local development documentation for declared frontmatter predicate shapes."
kind: spec
status: normative
version: "0.1"
---


FARS works over a frontmatter-markdown corpus.
When FARS treats a frontmatter key as a predicate, that key is a FARS-local predication declaration that can be validated and projected into a relation graph.

This document does not specify any other project, runtime, payload protocol, or handoff format.

## Mathematical anchors

FARS must stay aligned with these theory anchors:

- `predication-cell.md`: predication cells are oriented `(subject, predicate, object)` assertion-positions; diagonal cells `(s, p, s)` are meaningful.
- `n-ary-predication.md`: unary, binary, ternary, and higher-arity predication are arity-indexed cases of `E^n`; closure is not intrinsically unary or binary.
- `operation.md`: operation arity is not predication-cell shape.
- `frontmatter-relation-graph-acyclic-modulo-see-also.md`: substantive frontmatter relations are governed differently from the `see-also` gutter.
- `validation-rule.md`: validation rules are decidable checks over notes, note pairs, subgraphs, or the vault.

## Required shape declarations

Every frontmatter key that FARS treats as a predicate MUST have a declared shape before relation-graph use.

| Shape | FARS lowering | Invalid lowering |
|---|---|---|
| `state-flag` | `(note, P, note)` | `(note, P, true)`, `(note, P, _)`, `(note, P, timestamp)` |
| `relational` | `(note, P, target-note-or-entity)` | generic metadata with no meaningful target axis |
| `event-record` | `(note, P, timestamp-or-event-entity)` | timestamp object used as a state flag object |
| future `n-ary` | explicitly encoded arity-indexed tuple | arbitrary YAML list or map with no declared arity |

Status predicates that say something about the note itself MUST lower diagonally or remain non-predicative editorial fields.
Relational predicates such as `depends-on`, `realizes`, `instantiates`, `defines`, and `see-also` MUST name meaningful targets.
Event/provenance predicates MUST be declared as event records before timestamp objects are allowed.

## FARS frontmatter classes

FARS needs a project-local predicate registry.
For each frontmatter key, the registry must say whether the key is a predicate, what shape it has, whether it enters the relation graph, whether it is substantive, whether it is a cross-reference gutter, and what target type it accepts.

Initial classifications:

| Key family | Shape | Graph role |
|---|---|---|
| `depends-on`, `realizes`, `instantiates`, `defines` | `relational` | substantive relation edge |
| `see-also` | `relational` | non-substantive cross-reference gutter |
| status-like keys | `state-flag` or typed valuation | no relation edge unless explicitly projected |
| date/provenance/audit keys | `event-record` or instrumentation | no relation edge unless explicitly projected |

The FARS relation graph is a projection of typed predication cells, not the whole substrate.
A projected edge must preserve subject/object orientation and must not confuse state flags or event witnesses with relation edges.

## Validation obligations

FARS validation MUST catch shape violations, not merely dangling links or bad paths.
Required validator families include: undeclared predicate key; state flag with non-diagonal object; sentinel object used as a fake unary object; relational predicate without meaningful target; event-record object used under a non-event predicate; substantive edge mixed with `see-also`; and relation-graph projection that reverses subject and object.

## FARS-local open questions

- Where should the predicate registry live: taxonomy constants, generated data, YAML, or theory-derived records?
- Which status-like fields should become diagonal state flags, typed valuations, or remain editorial fields?
- Which date/provenance fields are event records, and which are instrumentation only?
- How should external URLs and bibliographic references be represented inside FARS?

Until those questions are resolved, implementation work MUST NOT add new FARS parsing, validation, graph construction, or closure behavior for frontmatter predicates without declaring the predicate shape first.
