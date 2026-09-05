---
title: "Test: predication on host A appears on host B after one federation cycle"
type: task
area: engineering
status: open
horizon: captured
milestone: m6-federation
goal: cross-host-substrate-convergence
depends-on: [implement-federation-cycle-as-recurrent-practice]
requires-capabilities: [integration-testing, federation-correctness]
theory-basis: [closure-merge-commutation]
---


## Description

Integration test (likely run with two engine instances in the same process or via test fixtures simulating two hosts):

Setup: two engine instances (A and B) with mutual peer records, full-trust, sync-scope including the test predicate.

Run: A authors `(test-cell, p, value) = T`.
Run one federation cycle on A (emit to B).
Run one federation cycle on B (admit from A).

Verify: B's substrate now carries `(test-cell, p, value) = T` after the cycle completes.
B sees the cell via the standard substrate-query path.

## Acceptance

- [ ] Test at `tests/test_federation_propagation.py`.
- [ ] Two engine instances in the test fixture.
- [ ] Test asserts: B's local substrate carries the predication after the federation cycle.
- [ ] Test runs in CI; no flaky timing dependencies.

## Progress cells

*(empty — task not yet started)*
