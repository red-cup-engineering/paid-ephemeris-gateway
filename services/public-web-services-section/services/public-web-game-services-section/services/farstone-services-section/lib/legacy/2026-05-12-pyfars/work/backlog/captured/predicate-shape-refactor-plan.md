---
title: "FARS predicate-shape refactor plan"
description: "FARS-local implementation plan for making frontmatter predicate shape declarations mandatory before graph use."
kind: plan
status: draft
version: "0.1"
---


This is a FARS-local plan.
It does not specify any other project, runtime, payload protocol, or handoff format.

## Goal

Before further FARS relation-graph work, FARS should stop treating frontmatter relation keys as an undifferentiated link layer.
It needs an explicit predicate-shape registry and validators that distinguish state flags, relational predicates, event records, and future arity-indexed encodings.

## Refactor sequence

1. Add a predicate-shape registry beside the existing FARS taxonomy/relation constants.
2. Register existing relation keys with shape and graph role: substantive relation, cross-reference gutter, state/status, event/provenance, or non-predicative editorial field.
3. Route frontmatter parsing through the registry before graph construction.
4. Reject undeclared predicate keys when they are used as graph-bearing relations.
5. Keep `see-also` relational but non-substantive.
6. Add validators for diagonal state flags, meaningful relational targets, event-record timestamps, and subject/object orientation.
7. Update relation-graph documentation after the validators exist, not before.

## Blocking rule

Do not add new FARS parsing, validation, graph construction, ranking, traversal, or closure behavior for a frontmatter predicate until its shape and graph role are declared.

## Initial tests

- `depends-on` accepts note/entity targets and enters the substantive relation graph.
- `see-also` accepts note/entity targets but does not enter substantive acyclicity checks.
- A state flag cannot lower to `(note, P, true)` or `(note, P, _)`.
- A timestamp is rejected unless the predicate is declared as an event record.
- A projected relation edge preserves subject/object orientation.
- An undeclared key cannot silently become a graph-bearing predicate.

## Open questions

- Whether the registry should be hand-authored, generated from theory records, or encoded as YAML.
- Which existing status-like keys should become diagonal state flags.
- Which date/provenance fields should be event records rather than instrumentation.
- How external URLs and bibliographic references should be represented inside FARS.
