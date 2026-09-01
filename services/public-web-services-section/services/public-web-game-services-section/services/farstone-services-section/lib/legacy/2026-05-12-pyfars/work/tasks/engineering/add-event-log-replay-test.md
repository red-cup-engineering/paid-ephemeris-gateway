---
title: "Add the event-log replay determinism test"
type: task
area: engineering
status: open
horizon: soon
milestone: m3-continuous-loop
goal: replay-determinism-verified
depends-on: []
requires-capabilities: [python-editing, test-authoring]
theory-basis: [operations-loop, recurrent-practice]
---


## Description

Write `tests/test_runtime_replay_determinism.py` with three parametrized cases:

1. **Minimal substrate** — one workitem, one agent (`provider: test`), one endpoint, `eligibility-by-capabilities` only.
  Run for 3 ticks, capture state, replay.
2. **Full default rule-system** — substrate with all five default eligibility rules active (`eligibility-by-capabilities`, `eligibility-by-skills`, `eligibility-by-jurisdiction`, `eligibility-by-rate-limit`, `eligibility-by-charter-binding`); workitems and dispatchables that exercise each.
  Run for 5 ticks, capture, replay.
3. **Contradiction case** — a workitem-dispatchable pair where eligibility rules emit `T` and disqualification rules emit `F` on the same cell, producing `⊤`.
  Verify the `⊤` survives replay.

Per case:

```python
async def test_replay_determinism_minimal():
    # 1. Run an engine on the fixture substrate for N ticks.
    state_a = await run_polity(fixture_root, ...)

    # 2. Capture the final store and rsv_hash from the last DispatchState.
    store_a = ...; hash_a = ...

    # 3. Read the event log; reconstruct the substrate state by re-running
    #    the dispatch graph against the same fixture.
    state_b = await run_polity(fixture_root, ...)
    store_b = ...; hash_b = ...

    # 4. Assert cell-by-cell equality and rsv_hash equality.
    assert dict(store_a._values) == dict(store_b._values)
    assert hash_a == hash_b
```

The "replay" half should walk the event log and verify it accumulates witnesses in the order the original engine emitted them; the rsv_hash equality is the strong guarantee.

## Acceptance

- [ ] `tests/test_runtime_replay_determinism.py` exists with the three parametrized cases.
- [ ] All three pass under `nix flake check`.
- [ ] Failure messages clearly identify which cell or witness differs.
- [ ] The test fixtures live under `tests/fixtures/replay/` with one substrate per case.

## Progress cells

*(empty — task not yet started)*
