---
title: "Analyzing how qtOps informs development of FARS"
specialization: analysis
subject: qtops
subject-description: "emsenn's Racket MUD engine. No declaration files, no hierarchy. Things are procedures over mutable hashes. Qualities compose by function application. Identity is what the thing responds to."
date-created: 2026-04-07
source-code: operations/engineering/toys/qtops/engine/
informs: [system-architecture-refactor, relational-mud]
---

## What qtOps Is

A Racket MUD engine.
No model files.
Things are created empty: `(create-thing "pebble")`.
Qualities are functions that mutate the thing's procedure hash: `(<>lookable (<>noun t) #:description "...")
`.
The `<>` convention is pure composition — take a thing, install procedures, return the thing.
Chain them.

## Principles for FARS Predication

### 1.
No hierarchy, only composition qtOps has no inheritance at all.
Identity is what the thing responds to (`(t 'has-procedure? k)`), not what type it declares. **FARS application:** The `type:` predicate is a label for findByType(), not a mechanism.
What an entity IS = what predicates it has.
Two entities with the same predicates but different `type:` labels are functionally identical to the algebra.

### 2.
Quality functions as the composition primitive `<>lookable` takes a thing and makes it lookable by installing procedures.
Applied in sequence: `(<>lookable (<>noun t))`.
Each quality function is independent — composable in any order. **FARS application:** Duties, capabilities, and behaviors are independent predicate-bundles that compose additively onto an entity.
Adding `duty: watch-management` to an office is applying a quality function.

### 3.
The thing IS a procedure In qtOps, the thing is `(lambda (k . a) ...)
` — a function that dispatches over its hash.
`(t 'describe)` calls the stored `describe` procedure. **FARS application:** `message(entity, {action: describe})` is the same pattern.
The entity's fiber IS its dispatch table.
The entity IS a function from messages to responses.

### 4.
Missing key = error, not default `(t 'nonexistent-key)` raises `raise-argument-error` listing available procedures.
No fallback, no default behavior. **FARS application:** `respond(entity, {unknown-predicate: value})` produces ⊥ (no information), which IS the error signal.
The composition tells you what the entity DOESN'T know about.

## See also

- [TAB analysis](./analyzing-how-tab-informs-development-of-fars.md) — the Fennel counterpart
