---
title: "Implement incumbency verification as a substrate rule"
type: task
area: engineering
status: open
horizon: later
milestone: m5-agential-self-generation
goal: office-records-gate-authority
depends-on: [extend-dispatch-eligibility-to-read-office-jurisdiction]
requires-capabilities: [python-editing, closure-rule-instantiation]
theory-basis: [office-as-double-settlement, incumbent]
---


## Description

Author `objects/full-incumbency-required.md` plus the rule that fires it: a closure rule that fires when an office is referenced in a dispatch attempt, checking that an [incumbent](../../../governance/incumbents/_index.md) record exists for that office with both `instituted-at` and `inducted-at` cells settled at T (and `relieved-at` at $\bot$ or in the future).

If full incumbency is absent (vacancy, instituted-only, inducted-only, or already-relieved): the rule emits F on `(office, fully-occupied, true)` and the eligibility-by-office-authority rule reads that and disqualifies.

## Acceptance

- [ ] `objects/full-incumbency-required.md` exists.
- [ ] Rule instantiator at `runtime/governance_rules.py` (or equivalent) walks office records, checks for full incumbency, emits cells.
- [ ] The eligibility-by-office-authority rule reads the incumbency cells.
- [ ] Tests cover: full incumbency admits dispatch, vacant office F-disqualifies, instituted-only F-disqualifies, relieved incumbency F-disqualifies (after relief), pre-relief admits.

## Progress cells

*(empty — task not yet started)*
