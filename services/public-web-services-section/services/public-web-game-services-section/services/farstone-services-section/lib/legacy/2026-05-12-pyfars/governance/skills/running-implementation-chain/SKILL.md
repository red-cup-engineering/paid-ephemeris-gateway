---
name: "Running the implementation chain"
description: "Composite developer skill: reads a specification, authors code examples, authors tests, writes source code until tests pass. Use when a task has a commissioned specification as its input. Narratives and tutorials are deferred post-chain."
---


The implementation chain is the developer-held counterpart to the roadmap-enrichment cycle.
Where the cycle turns questions into theory artifacts and roadmap entries, the implementation chain turns specifications into running code.
Its acceptance condition is: all tests pass.

The chain's structure is linear and strictly ordered: read spec → author code examples → author tests → write code.
Each step must complete before the next begins.

## Requirements

- The [`pyfars-developer`](../offices/pyfars-developer.md) office held.
- A specification at `governance/specifications/<slug>.md` with `status: draft` or higher, commissioned as the task's input.
- An implementation guide (theory-derivation officer's Phase-5 output) for the same scope, if available.
  The spec is the *acceptance contract*; the implementation guide is the *how-to*.
  When both exist, read both.
  When the guide is missing, note it in the task record and proceed from the spec alone.
- Read access to math examples for the spec's objects/morphisms.

## Step 1 — Read spec and implementation guide

1. Read the full specification: §3 conformance, §4 terminology, §5 requirements, §6 acceptance criteria.
  Copy the acceptance criteria list to the task record as a working checklist.
2. Read the implementation guide if present.
3. Read the math examples cited in the spec's §7.
4. Identify any acceptance criterion that cannot be mapped to a math example — note these as gaps in the task record.
  A criterion without a math example is an under-witnessed requirement; flag it but do not stop.

**Step-1 witness**: task record cells `spec-read: <spec-slug>@<version>`, `guide-read: <guide-slug>` (or `guide-missing: true`).

## Step 2 — Author code examples

Apply [`authoring-code-examples`](authoring-code-examples.md).

**Step-2 witness**: task record cell `authored-code-examples: [<paths>]`.

## Step 3 — Author tests

Apply [`authoring-tests`](authoring-tests.md).

**Step-3 witness**: task record cells `authored-tests: [<paths>]`, `expected-failures: <n>`.

## Step 4 — Write source code

1. Pick the first failing test.
  Read the acceptance criterion it asserts and the object/morphism records the criterion derives from (via the spec's `derives-from:` chain).
2. Write the minimal source code that makes this test pass without breaking any already-passing tests.
3. Repeat until all tests pass.
4. When all tests pass, update the task record: `tests-passing: true`, `implementation-complete: <date>`.

**Step-4 witness**: all tests green; task record `tests-passing: true`.

## Step 5 — Narratives and tutorials

1. Apply [`authoring-a-narrative`](authoring-a-narrative.md) to produce at least one narrative in `prose/narratives/` that walks through the spec's objects/morphisms/concepts now that the code exists to ground it.
2. Apply [`authoring-a-tutorial`](authoring-a-tutorial.md) if the implemented feature has a user-facing surface worth teaching.
  Not every spec produces a tutorial; a narrative is the floor.
3. Test the tutorial end-to-end in a clean environment before marking it `current`.

**Step-5 witness**: task record cells `authored-narratives: [<paths>]`, `authored-tutorials: [<paths>]` (or `tutorials: none` if no tutorial was appropriate).

## Outcomes

- Source code in `src/` that makes all spec-acceptance tests pass.
- Code examples at `examples/<spec-slug>/` as the permanent fixture corpus.
- Tests at `tests/test_<spec-slug>.py` as the permanent acceptance suite.
- At least one narrative in `prose/narratives/` grounding the theory↔practice fiber for this spec's slice.
- Tutorials in `prose/tutorials/` for user-facing surfaces (where applicable).
- The originating specification updated to `status: candidate` (or remains `draft` if open questions surfaced during implementation).

## When NOT to apply

- **No specification exists** — do not begin implementation without a spec.
  File a task for spec authoring and block on it.
- **Implementation reveals a spec gap** — stop.
  File a triage note.
  Do not fill a spec gap from the code layer; route back to the roadmap-enrichment officer for a spec amendment.
- **Implementation reveals a theory gap** — stop.
  Route to the theory-derivation officer per [`escalate-when-theory-gap-found`](../duties/escalate-when-theory-gap-found.md).

## Discipline notes

- **Tests are the acceptance condition, not the spec.** The spec is normative; the tests interpret it.
  If the tests are wrong (asserting something the spec doesn't say), fix the tests, not the code.
- **Code examples are fixtures, not docs.** Do not use step-2 examples as tutorial material.
  Tutorials are a separate post-code task.
- **Write code to pass tests, not to pass review.** Refactoring and cleanup belong to subsequent tasks once the chain is done.
