---
name: "Authoring code examples"
description: "Takes a specification and produces concrete, spec-compliant pyfars code fixtures in `examples/<spec-slug>/`. Tests operate over these. Use as step 2 of the implementation chain, before authoring tests."
---


A code example is a concrete, runnable pyfars code snippet or data fixture that satisfies a specification's acceptance criteria.
Code examples live in `examples/<spec-slug>/` and are what tests operate over — the test suite does not fabricate its own fixture data; it operates over the authored examples.

Code examples are the implementation-layer analog of math examples.
Where a math example shows "here is a valid mathematical instantiation of this object," a code example shows "here is a valid Python/substrate realization of this spec."

## Requirements

- The [`pyfars-developer`](../offices/pyfars-developer.md) office held.
- A specification at `governance/specifications/<slug>.md` with at least `status: draft`.
- Math examples (stage-5 cycle outputs) for the spec's objects/morphisms, as templates for what the code must realize.

## Steps

1. **Read the specification's §6 acceptance criteria.** These are the conditions the code examples must satisfy.
  List each criterion; for each, identify the minimal code that witnesses it.

2. **Read the math examples** for the spec's objects/morphisms.
  Each code example should realize the same scenario as a corresponding math example — the same entity set, predicates, morphism trace — expressed in pyfars Python rather than formal notation.

3. **For each acceptance criterion**, author a fixture at `examples/<spec-slug>/<criterion-slug>.<ext>`:
   - For substrate records: a minimal frontmatter file.
   - For Python callables: a minimal module or function.
   - For CLI invocations: a shell transcript.
     Each fixture must be self-contained (no hidden dependencies outside `examples/<spec-slug>/`), named after the criterion it witnesses, and carry a header comment citing the spec slug and criterion number.

4. **Verify each fixture manually** before handing off to test authoring.
  Run it if runnable; inspect it if it's a data record.
  A fixture that cannot be manually verified is a sketch, not a fixture.

5. **Author `examples/<spec-slug>/_index.md`** listing all fixtures, which criterion each witnesses, and the corresponding math example each was derived from.

6. **Update the task record** with `authored-code-examples: [<example-paths>]`.

## Outcomes

- A directory at `examples/<spec-slug>/` with one fixture per acceptance criterion plus an `_index.md`.
- Each fixture is spec-compliant and manually verified.
- The test-authoring step has a stable, named fixture corpus to operate over.

## Discipline notes

- **Fixtures are the ground truth for tests.** A test that constructs its own substrate state bypasses the example corpus and weakens provenance.
  Tests MUST load fixtures from `examples/<spec-slug>/`, not from inline data.
- **Minimality.** A fixture that exercises more than one criterion is acceptable only if the criteria are genuinely inseparable.
  Prefer one fixture per criterion.
- **Code examples are not documentation.** No explanatory comments beyond the spec-citation header.
  Tutorials come after code exists.
