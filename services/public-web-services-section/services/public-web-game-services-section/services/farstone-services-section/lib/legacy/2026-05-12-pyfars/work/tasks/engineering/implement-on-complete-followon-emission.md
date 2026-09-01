---
title: "Implement on-complete follow-on emission"
type: task
area: engineering
status: open
horizon: soon
milestone: m3-continuous-loop
goal: on-complete-follow-on-intents
depends-on: [assignment-cells-written-back]
requires-capabilities: [python-editing, theory-derivation]
theory-basis: [operations-loop, recurrent-practice]
---


## Description

Two implementation paths; pick one:

**Option A — substrate-authored closure rule (preferred).** Author `objects/followon-by-on-complete.md` declaring the rule.
Antecedent: `(W, status, done) = T AND (W, on-complete, <C>) = T`.
Consequent: `(W', type, <C>) = T` plus derived `(W', predecessor, W) = T` and any `requires-capabilities` cells the follow-on class implies.
Implement `runtime.eligibility_rules.instantiate_followon_by_on_complete` and register it.
The instantiator is a generative rule — it emits cells about a new subject `W'` whose slug needs to be deterministic from the predecessor (e.g., `<W>-followon-<class>`).

**Option B — runtime helper.** A new node in `dispatch_graph` that walks the store post-closure for `(W, status, done) = T AND (W, on-complete, <C>) = T` and writes a markdown workitem record `work/tasks/<area>/<W>-followon-<C>.md` to disk (the engine writing markdown is normally an anti-pattern — see `governance/decisions/markdown-as-projection.md` — but follow-on creation may be exempt as a derived projection of substrate state).

Option A is purer.
Option B is faster to land.
Pick A; if the generative-rule shape proves awkward in `pypredcalc.
StoreRule` (which expects fully-grounded subjects), fall back to B with a documented design decision.

## Acceptance

- [ ] On a fixture substrate with a workitem `W1` carrying `on-complete: phase-2-derivation`, after `W1` transitions to `done`, the next tick's store contains a new workitem `W2` of type `phase-2-derivation` with `predecessor: W1`.
- [ ] If `W1` has no `on-complete:` field, no follow-on is created.
- [ ] If `W1.on-complete` lists multiple classes, one follow-on per class is created.
- [ ] Tests cover the four cases listed in the goal's acceptance.

## Progress cells

*(empty — task not yet started; blocked on `assignment-cells-written-back` because completion-tracking depends on assignment cells being substrate state)*
