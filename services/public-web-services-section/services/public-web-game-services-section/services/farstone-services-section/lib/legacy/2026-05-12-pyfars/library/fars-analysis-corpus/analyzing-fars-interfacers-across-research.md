---
title: "Analyzing FARS interfacers across research"
specialization: analysis
feature: interfacers
description: "Everything we know about how FARS crosses format boundaries — the three operations (extract/apply/compose), the counit law, the four-layer architecture, the cost settlement path, filetype status, validation-as-settlement."
date-created: 2026-04-07
informs: [system-architecture-refactor, interfacer-entity-system, agent-efficiency, constraint-design]
synthesizes:
  - interfacer-mathematical-grounding
  - interfacer-compose-operation-discovery
  - interfacer-filetype-status-2026-04-06
  - hooks-are-interfacers-four-layer-architecture
  - cost-reduction-through-interfacers
  - markdown-jsonl-interfacer-design
  - validation-via-settlement-design
software-sources:
  - analyzing-how-bussard-informs-development-of-fars
  - analyzing-how-lpmud-discworld-informs-development-of-fars
  - analyzing-how-dwarf-fortress-informs-development-of-fars
  - analyzing-how-openclaw-informs-development-of-fars
  - analyzing-how-guix-guile-informs-development-of-fars
---

# Analyzing FARS Interfacers

An interfacer translates between the fiber algebra (inside) and an external representation (outside).
Every I/O boundary — markdown ↔ fibers, JSON-RPC ↔ fibers, agent context ↔ fibers, HTTP ↔ fibers — is an interfacer.

## Three operations

| Operation | Direction | Math | What it does |
|---|---|---|---|
| **extract** | restriction (read) | H(f) : H_{t'} → H_t | Parse external format → predicates |
| **apply** | carrier (write) | γ_t : X(t) → X(s⋆t) | Predicate changes → modified external format |
| **compose** | observation (emit) | Γ(H*) | Multiple entity fibers → new composed output |

The compose operation was discovered during implementation (2026-04-06): FOAH self-installation composes multiple entity fibers (ship, charter, offices) into CLAUDE.md — an observation of the system's settled state, published OUTSIDE the graph.

## The counit law

`extract(apply(changes, content))` must equal the original predicates + changes.
This is the mathematical losslessness criterion from the restriction-carrier dyad.
If YAML serialization mangles values (quoting, ordering, whitespace), the counit law fails.
The markdown apply() passes this test (7/7 tests including counit).

Three laws from the RelationalMachineCarrier spec: - **Counit:** ε ∘ γ = id — write-then-read round-trips - **Coassociativity:** apply(A, apply(B, content)) = apply(A∘B, content) — sequential applies compose - **Locality:** compatible changes glue; incompatible changes produce ⊤

## The four-layer architecture

From game engine research (DF raws, LPMud driver/mudlib, Discworld skills):

```
Entity fibers:     WHAT to check (patterns, severities, alternatives)
Precompiled cache: Fast-lookup format, generated at build time
Stepping map γ_t:  HOW to check (~30 lines of stable mechanism code)
Protocol adapter:  WHERE/WHEN to check (stdin/stdout, exit codes)
```

Adding a rule = creating an entity (top layer).
Mechanism and protocol DON'T change.
This is the DF raws pattern: adding a creature = adding a text file, not modifying the C++ engine.

## Filetype status

| Filetype | extract | apply | % of entities |
|---|---|---|---|
| markdown | ✓ | ✓ (7/7 tests + counit) | 93% (13,483) |
| jsonl | ✓ (multi-entity) | append only (no supersession) | <1% (87) |
| json | ✓ | trivial | 3% (489) |
| yaml | ✓ | shares markdown implementation | 1% (197) |
| javascript | ✓ (JSDoc frontmatter) | out of scope (code is read-only) | 1% (171) |

Markdown is 93% of entities.
Making markdown writable made FARS writable.

## Validation via settlement

Entity creation composes the creation message with the type definition's fiber.
If the composition settles cleanly (no ⊤), the entity is valid.
If it produces ⊤, the contradiction IS the validation error — it tells you what's wrong.
No schema validation code.
The algebra IS the validator. ⊤ IS the rejection.

Force flag: settle even if ⊤ — create in contradictory state, fix later.
Legitimate for drafts and triage.

## The cost settlement path

Every I/O operation sits on a settlement path from expensive to free:

| Level | Cost | Example |
|---|---|---|
| Agent reads and summarizes | ~$0.10 | "Read this plan and tell me its status" |
| Skill constrains the prompt | ~$0.05 | /plan-status with formatting guidelines |
| Tool computes, LLM formats | ~$0.01 | compute-plan-status.js + LLM output |
| Hook fires deterministically | ~$0.00 | auto-record-events.js on file edit |
| **Interfacer: fiber IS answer** | $0.00 | respond(plan, {}) returns fiber |

The interfacer is BELOW hooks.
It doesn't need code to fire — the entity's fiber IS the answer.
Moving I/O down this path is permanent cost reduction.

The fiber-model continuum: LLM models fill ⊥ gaps in thin fibers.
Fiber richness is inversely proportional to model cost needed.
Fatter fibers + cheaper models + interfacers = three vectors composing to reduce cost per workunit over time.

## See also

- [FARS filetypes](../../../operations/engineering/systems/fars/filetypes/) — the implementations
- [Interfacer entity system plan](../plans/interfacer-entity-system.md) — the implementation plan
