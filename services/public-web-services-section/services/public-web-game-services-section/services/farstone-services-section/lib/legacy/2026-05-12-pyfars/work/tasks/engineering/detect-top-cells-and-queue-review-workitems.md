---
title: "Detect ⊤ cells in the closed store and queue review workitems"
type: task
area: engineering
status: open
horizon: soon
milestone: m3-continuous-loop
goal: anomaly-surfacing-via-contradiction-cells
depends-on: []
requires-capabilities: [python-editing]
theory-basis: [anomaly-as-contradiction]
---


## Description

In `runtime/dispatch_graph.py`, after `apply_eligibility_rules_node` produces the closed store, walk the store for cells with value `BilatticeValue.
TOP`.
For each, emit an `anomaly_surfaced` witness carrying:

- The cell key `(subject, predicate, object)`.
- The rule firings (from `RuleFiring` records) whose consequents knowledge-joined to `⊤` for this cell.
- The active `rsv_hash`.
- The tick number.

Channel `dispatch`, kind `observation`, origin `dispatch_graph`.

For persistence detection, track a small in-engine map `<cell-key> → consecutive-tick-count`.
When a `⊤` cell persists for N ticks (configurable via `EngineState.anomaly_review_threshold`; default 1), queue a review workitem by appending a markdown record to `work/tasks/governance/review-anomaly-<rsv-hash-prefix>-<timestamp>.md` with the contradicting rule slugs in its body.
(Or — alternative — emit a witness that a future projector consumes; both are acceptable per the substrate-vs-witness sourcing discussion in `markdown-as-projection`.)

## Acceptance

- [ ] A new node or in-line check in `dispatch_graph.py` detects `⊤` cells after closure.
- [ ] Each `⊤` cell produces an `anomaly_surfaced` witness with the fields above.
- [ ] Persistent `⊤` cells (≥ N ticks) queue a review workitem; transient ones do not.
- [ ] Tests cover: clean store (no anomalies), one transient `⊤` (witness only), one persistent `⊤` (witness + workitem queued), two `⊤`s on different cells (two witnesses).

## Progress cells

*(empty — task not yet started)*
