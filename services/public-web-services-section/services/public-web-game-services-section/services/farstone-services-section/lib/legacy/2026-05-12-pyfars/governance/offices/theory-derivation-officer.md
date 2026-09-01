---
title: "Theory Derivation Officer"
type: office
scope: pyfars-theory-derivation
action-domain:
  - write-predicated-computing-entity
  - write-aop-entity
  - write-fars-spec-entity
  - write-implementation-guide
  - write-triage-note
  - read-predication-categories-entity
deontic-profile:
  write-predicated-computing-entity: power
  write-aop-entity: power
  write-fars-spec-entity: power
  write-implementation-guide: power
  write-triage-note: power
  read-predication-categories-entity: privilege
provides-skill:
  - auditing-theory-derivation-coverage
  - deriving-predicated-computing-content
  - lifting-to-programmer-surface
  - synthesizing-into-fars-spec
  - writing-implementation-guides
theory-basis: [office-as-double-settlement, normative-operational-layering, jural-relation, recurrent-practice]
---


Runs the theory-derivation loop: audits predication-categories for new material not yet derived downstream, derives it into predicated-computing and its descendants, lifts it to the programmer surface, synthesizes it into FARS spec, and writes the implementation guides that translate it into PyFARS engineering tasks.

The officer is the downstream agent in the theory chain.
It reads predication-categories but does not write there.
When a gap is found at the predication-categories level, the officer stops and escalates — it does not backfill the upstream theory.

## Scope

- Read: `theories/.../predication-categories/`
- Write: `theories/.../predicated-computing/` and all descendants (AOP, FARS spec)
- Write: `work/implementation/` (implementation guides)
- Write: `operations/engineering/triage/` (triage notes)

## Powers held

- `write-predicated-computing-entity`: create or modify entities in `predicated-computing/`
- `write-aop-entity`: create or modify entities in `agential-orchestration-platform/`
- `write-fars-spec-entity`: create or modify entities in `flatfile-agentic-resource-system/`
- `write-implementation-guide`: update sections of `work/implementation/` guides
- `write-triage-note`: file a triage note in `operations/engineering/triage/`

## Privileges held

- `read-predication-categories-entity`: read any entity in predication-categories; no claim against the officer for doing so; no duty attached

## Duties attached

- `write-in-correct-derivation-layer` (all write powers): every write must land in the correct layer for the active phase; writing in the wrong layer is a substrate violation
- `escalate-when-theory-gap-found` (write-predicated-computing-entity): if derivation reveals a missing or incorrect predication-categories entity, file a question upstream and stop rather than backfilling

## Skills held

- `auditing-theory-derivation-coverage`: produce the triage note that starts a loop cycle
- `deriving-predicated-computing-content`: write predicated-computing entities from a triage note
- `lifting-to-programmer-surface`: translate predicated-computing entities to AOP/FARS theory content
- `synthesizing-into-fars-spec`: write FARS spec entities that instantiate AOP entities
- `writing-implementation-guides`: update work/implementation/ guides with concrete implementation tasks

## Relation to other offices

The theory-derivation-officer runs Phases 1–5 of the theory-derivation loop.
Phase 6 (implementation) is `pyfars-developer` territory.
The two offices connect at the Phase 5 output: the implementation guide produced by the theory-derivation-officer is the input that the pyfars-developer reads before writing code.

The theory-derivation-officer does not hold governance record powers — those belong to `pyfars-records-officer`.
If deriving new theory reveals a needed change to governance/ records, the officer files a triage note and defers to the records officer.

## Incumbency

Currently held informally by whatever agent is tasked with theory derivation work (`derived-theory-improver`, `predication-theory-lifter`, `theory-researcher` scoped to FARS).
A future M5 task is to settle these incumbency predications in the substrate so the dispatch table routes by office, not by hardcoded agent slug.
