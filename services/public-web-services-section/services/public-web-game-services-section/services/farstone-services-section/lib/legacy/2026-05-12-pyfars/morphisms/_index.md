# morphisms/

Operations PyFARS provides on its named structures, treated as maps between objects.
One operation per file.

Examples of what belongs here: validate (corpus → diagnostics), render (note → projection), dispatch (intent → assigned-to), serve (corpus → HTTP responses), audit-commits (commit → witness), install-harness (system-state → harness manifest), settle (predication graph → quiescent fiber).

Morphisms get their own type because in PyFARS many of them carry as much content as objects do.
The dispatch operation has its own algebra (assignment, decomposition, escalation); the render operation has its own discipline (markdown-as-projection); the validate operation has its own settling (closure under cross-reference rules).
Treating them as first-class avoids burying their content inside whichever object happens to be the source or target.

## Frontmatter

```yaml
---
type: morphism
status: draft | sketch | settled
realizes: [...]                                     # if the morphism realizes a concept
depends-on: [source-object, target-object, upstream-warrant, ...]
---
```

The source and target objects of the morphism go in `depends-on:`, alongside any upstream theory that warrants the operation's discipline.

## Body shape

1. The morphism itself, formally defined: action on objects, action on the substrate, what it produces when run, what its side-channels are (writes to corpus, writes to JSONL log, emits to stdout, etc.).
2. Naturality / functoriality / coherence conditions, stated.
  Their *proofs* go in `claims/`.
3. Brief discussion of role: what does this morphism do in PyFARS, why is it the right operation, what would change under a different operation choice.

## Verbs as morphisms

PyFARS exposes most of its operations through CLI verbs (the 55+ registered verbs).
Most CLI verbs correspond to one morphism in this theory; some correspond to several (e.g., `pyfars work` decomposes into multiple system operations).
The mapping is not strict: a morphism here may be exposed through multiple verbs, or a verb may be a composition of morphisms.
The note should name the corresponding verb(s) where applicable as a navigation aid, but the morphism's identity is theoretical, not lexical.

## Compositions and adjunctions

A composition of morphisms gets its own note when the composition is named and used as a unit (e.g., `dispatch-via-heartbeat` = settle ∘ select-ready ∘ assign).
An adjunction is one note (not two), naming both directions and the unit/counit.
