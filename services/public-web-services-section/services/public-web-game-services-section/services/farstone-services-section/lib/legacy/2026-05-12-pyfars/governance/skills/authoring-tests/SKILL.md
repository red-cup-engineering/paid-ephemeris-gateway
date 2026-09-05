---
name: "Authoring tests"
description: "Takes code examples (step 2 of the implementation chain) and produces a test suite asserting each spec acceptance criterion over those examples. Use as step 3 of the implementation chain, before writing source code."
---


Tests are executable assertions of a specification's acceptance criteria, operating over the code examples authored in the prior step.
Tests are written before the code that makes them pass — they are the acceptance contract that closes the QDD cycle: the question that opened the cycle is answered when all tests pass.

A test that passes before the code is written is a redundant test.
A test that cannot possibly pass until the code is written is the correct kind of test.

## Requirements

- The [`pyfars-developer`](../offices/pyfars-developer.md) office held.
- Code examples at `examples/<spec-slug>/` (step-2 outputs).
- The specification's §5 requirements and §6 acceptance criteria.

## Steps

1. **Map criteria to tests.** For each acceptance criterion in §6, plan one or more test cases.
  Each test:
   - Loads the corresponding code example fixture (never fabricates its own data).
   - Asserts the criterion holds for that fixture.
   - Is named `test_<criterion-slug>` or equivalent per the test framework's convention.

2. **Author the test file** at `tests/test_<spec-slug>.py`.
  At the top, cite the spec slug and version in a comment.

3. **Run the tests.** They should fail or error because the implementation doesn't exist yet.
  A test that passes before implementation doesn't exercise the code — investigate and tighten.

4. **For each failing test**, record the failure mode in the task record.
  The failure mode is the implementation contract: when the code is written, these specific assertions must flip from failing to passing.

5. **Update the task record** with `authored-tests: [<test-paths>]` and `expected-failures: <count>`.

## Outcomes

- A test file at `tests/test_<spec-slug>.py` asserting all acceptance criteria over the code examples.
- All tests currently fail (pre-implementation).
- The implementation step has an explicit acceptance contract: done means all tests pass.

## Discipline notes

- **Tests operate over examples, not inline data.** Per `authoring-code-examples`, fixtures are the ground truth.
  A test that constructs its own substrate state bypasses the example corpus and weakens the provenance chain.
- **One assertion per criterion is the floor.** Happy-path plus at least one unhappy-path (a fixture that violates the criterion) is the target.
- **Don't test implementation details.** Tests assert what the spec says must be true, not how the code achieves it.
  A test that breaks when the implementation is refactored — but the spec behavior is preserved — is testing the wrong thing.
