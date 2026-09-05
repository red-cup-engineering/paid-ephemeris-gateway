---
type: skill
name: "Advancing the world-clock"
description: "Reads the world-clock cell and the sim-seconds-per-heartbeat cell, advances the current-time, and writes the new value through a substrate-mutation verb. Idempotent within a tick by reading last-advanced-at-tick."
status: active
formality: F2
required-capabilities:
  - substrate.write
witness-format: world-clock-advance
channel: dispatch
recipe-form: orient-act-verify-witness

orient-reads:
  - subject: world-clock
    predicate: current-time
  - subject: world-clock
    predicate: sim-seconds-per-heartbeat
  - subject: world-clock
    predicate: last-advanced-at-tick
  - subject: heartbeat
    predicate: tick-#

orient-guard: "heartbeat.tick-# > world-clock.last-advanced-at-tick"
orient-on-guard-fail: "halt-without-acting"

act-computes:
  current-time: "world-clock.current-time + world-clock.sim-seconds-per-heartbeat sim-seconds"

act-invokes-verb: substrate.rewrite-cells
act-writes:
  - subject: world-clock
    predicate: current-time
    value: "<computed-current-time>"
  - subject: world-clock
    predicate: last-advanced-at-tick
    value: "(heartbeat, tick-#, ?)"

verify-reads:
  - subject: world-clock
    predicate: current-time
verify-condition: "world-clock.current-time = <computed-current-time>"
verify-on-fail: "emit-verify-failure-witness"

witness-fields:
  - previous-time
  - current-time
  - sim-seconds-per-heartbeat
  - tick-#
  - workitem
---


The skill that moves Farstone's notion of *now* forward each engine [`heartbeat`](../cadences/heartbeat.md).
Recipe-normal-form (orient → act → verify → witness); the act-slot calls a substrate-mutation verb. **No Python script body.**

The frontmatter declares the skill's complete substrate I/O — what it reads in orient, what guard it checks, what it computes, which verb it invokes, what it writes, what it verifies, what it witnesses.
That makes the skill scriptable: a runbook-runner can read the frontmatter and execute the recipe without parsing the body.

The body is for human readers — see the frontmatter for the executable form.

## Why a skill-with-verb-call and not a closure rule

The world-clock is the only cell on Farstone that *must* change each tick regardless of any other antecedent's state.
A closure rule needs an antecedent that *changes* to drive the consequent forward — and the heartbeat itself isn't a substrate cell.
So the clock-advance work is dispatched as a workitem, an authorized actor invokes this skill, and the verb performs the cell-rewrite.
