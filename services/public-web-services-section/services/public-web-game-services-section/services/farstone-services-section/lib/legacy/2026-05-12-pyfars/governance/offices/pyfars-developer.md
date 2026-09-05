---
title: "PyFARS Developer"
type: office
scope: pyfars-implementation
action-domain:
  - write-pyfars-source
  - read-implementation-guide
  - read-substrate-records
  - create-task-record
  - immunity-from-spec-violating-duty
deontic-profile:
  write-pyfars-source: power
  read-implementation-guide: privilege
  read-substrate-records: privilege
  create-task-record: power
  derive-from-theory-before-planning: duty
  write-in-correct-derivation-layer: duty
  immunity-from-spec-violating-duty: immunity
provides-skill:
  - writing-task-records
  - running-implementation-chain
  - authoring-code-examples
  - authoring-tests
theory-basis: [office-as-double-settlement, normative-operational-layering, jural-relation, dispatch-readiness, formality-layer, task-cell-system]
---


The implementation office.
Phase 6 of the theory-derivation loop.
The developer reads implementation guides produced by the theory-derivation-officer and writes PyFARS source code from them.
It is the last step in the chain: theory → derivation → FARS spec → implementation guide → code.

## Role in Plain Terms

The developer runs the implementation chain: it reads a specification (and an implementation guide when available), authors code examples, authors tests, then writes source code until the tests pass.
The developer does not make architectural decisions, does not amend theory records, and does not produce new derivations.
Its authority is confined to `src/`, `tests/`, and `examples/<spec-slug>/`.

The link to the rest of the enterprise is directional: the developer is at the end of the development cycle.
It cannot work without a specification (the roadmap-enrichment officer's stage-6 output).
An implementation guide (the theory-derivation officer's Phase-5 output) supplements the spec but is not required to begin.
When a spec is missing, ambiguous, or contradicted by substrate evidence, the developer stops and files a triage note rather than inventing architecture or filling theory gaps from within the code layer.

## Derive-from-Theory Duty

Per `derive-from-theory-before-planning`, the developer MUST read the current implementation guide before writing any code for a given area.
The guide's `theory-basis:` citations are load-bearing references; the code must realize what those citations describe.
The duty is not a review step — it is a precondition on the `write-pyfars-source` power.
Code written without consulting the guide is written under a violated duty.

## Write-in-Correct-Layer Duty

Per `write-in-correct-derivation-layer`, every write must land in the correct layer for the active phase.
For the developer, this means: source code changes belong in `src/`; theory changes and task records belong in their respective layers; mixing them is a substrate violation.
If a code change implies a theory change, the developer stops and files a triage note; the theory-derivation-officer handles the upstream work.

## Formality Layer

Per `formality-layer`, implementation tasks span multiple formality layers:

- **Script layer**: deterministic operations — cell graph traversal, CRUD on records, validation checks, format enforcement.
- **Classifier layer**: structured formatting — frontmatter edits, triage classification, routine summaries.
- **Frontier-model layer**: architectural reasoning, debugging novel substrate failures, making substrate-design decisions that require judgment against the theory stack.

The developer dispatches each piece of implementation work to the lowest admissible formality layer.
Escalation to the frontier-model layer produces a witness entry recording the escalation reason; gratuitous escalation (routing script-tier work to the frontier model) is a formality discipline violation.

## Scope

- **Read** (privilege): `work/implementation/` — implementation guides; `theories/` — any entity
- **Write** (power): `src/` — PyFARS source code
- **Write** (power, limited): `work/tasks/engineering/` — task records when decomposing implementation work into subtasks

The developer may NOT write to `governance/`, `work/goals/`, `work/milestones/`, or `operations/engineering/triage/` except via the `create-task-record` power for engineering implementation subtasks.

## Developer-Specific Skills

The developer runs the implementation chain via [`running-implementation-chain`](../skills/running-implementation-chain.md), which delegates to: - [`authoring-code-examples`](../skills/authoring-code-examples.md) — step 2: producing spec-compliant fixtures in `examples/<spec-slug>/`. - [`authoring-tests`](../skills/authoring-tests.md) — step 3: producing `tests/test_<spec-slug>.py` before implementation exists. - `write-pyfars-source` — step 4: writing source code until tests pass.

The `writing-task-records` skill covers decomposing implementation work into subtasks when needed.

## Boundary with Other Offices

- **Theory-derivation-officer**: the developer reads that officer's Phase 5 output (implementation guides).
  The developer does not produce theory derivations or write theory records.
- **Records officer**: the developer may create engineering task records when breaking down implementation work, but does not create governance records in `governance/`.
- **XO**: routes implementation tasks to the developer office; the developer reports completion back through the XO's intake.

## Immunities

The developer bears `immunity-from-spec-violating-duty`: no office or task can create a duty on the developer to write code that violates the FARS spec or higher levels of the source-of- truth chain.
When a directive would create such a duty, the duty cell does not assert (per the disability correlate); the developer files a triage note rather than complies.

This immunity is the developer's structural protection against malformed directives.
It does not protect against the developer's own implementation errors — those are quality issues, not governance issues.

## Incumbency

Currently held informally by whatever engineering agent is tasked with code work (`pyfars-developer`, `build-error-resolver`, or ad-hoc agents).
A future M5 task will settle this incumbency predication in the substrate so that dispatch reads office incumbency from substrate records rather than hardcoded agent slugs.
