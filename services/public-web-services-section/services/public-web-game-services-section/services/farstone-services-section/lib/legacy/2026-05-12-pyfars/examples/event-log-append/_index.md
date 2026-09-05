---
type: index
title: "Code examples for event-log-append specification"
spec: "event-log-append:2026.05.09+event-log-append"
---

# Code examples — `event-log-append`

Implementation-chain step-2 fixtures realizing the [`event-log-append`](../../governance/specifications/event-log-append.md) specification's §6 acceptance criteria.
Tests under `tools/platform/pyfars/tests/test_event_log_append.py` operate over these fixtures; tests do not fabricate their own fixture data.

| Fixture | Spec criterion | Math example | Description |
|---|---|---|---|
| [`canonical-call-site-grep.txt`](canonical-call-site-grep.txt) | §6.1 (R1, R2) | [`event-log-append-call-site--singleton-instance`](../event-log-append-call-site--singleton-instance.md) | Expected single-match grep output for the canonical-call-site uniqueness check. |
| [`substrate-singleton-record.md`](substrate-singleton-record.md) | §6.2 (R3) | [`event-log-append-call-site--singleton-instance`](../event-log-append-call-site--singleton-instance.md) | Exact frontmatter the singleton call-site record must hold. |
| [`witness-payload-validation.py`](witness-payload-validation.py) | §6.3 (R4, R5) | (no math example; payload validation is implementation-level) | Valid and invalid `Witness` constructor argument payloads for the bilattice-axis validator. |
| [`audit-fixture-pass.json`](audit-fixture-pass.json) | §6.4 (R12) — pass | [`auditing-codepath-uniqueness--pass`](../auditing-codepath-uniqueness--pass.md) | Code-survey result with one match; expects audit-state: ok cells. |
| [`audit-fixture-violation.json`](audit-fixture-violation.json) | §6.4 (R12) — violation | [`auditing-codepath-uniqueness--violation-multiple`](../auditing-codepath-uniqueness--violation-multiple.md) | Code-survey result with two matches; expects a codepath-uniqueness-violation finding. |
| [`temp-polity-fixture/`](temp-polity-fixture/) | §6.5 | (no single math example; end-to-end traversal) | Minimal polity-image the end-to-end test loads to drive both the hook and MCP surfaces against the same canonical call site. |

## Authored under

Cycle [`2026-05-09-witness-emission-codepath-uniformity`](../../work/cycles/2026-05-09-witness-emission-codepath-uniformity.md), implementation-chain step 2 commissioned by the cycle's stage-7 integration.

## Discipline

Per [`authoring-code-examples`](../../governance/skills/authoring-code-examples.md):

- Fixtures are the ground truth for tests.
  Tests MUST load from these files, not inline data.
- Each fixture has a header comment citing the spec slug and §-criterion it operationalizes.
- Each fixture is self-contained; cross-fixture references are by relative path within `examples/event-log-append/` only.
- Minimality: one fixture per criterion.
  Where one fixture witnesses multiple criteria (e.g., `temp-polity-fixture/` feeds §6.5's end-to-end and indirectly exercises R1–R2 and R4–R5), the table above names every criterion it touches.
