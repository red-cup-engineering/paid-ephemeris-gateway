---
title: "PyFARS engine — Farston (city-hall) [in-fiction]"
type: service-spec
status: sketch
note: "In-fiction worldbuilding — describes how Farston's city hall *would* run the engine in the polity's fictional setting (host: farston-city-hall, operator: aliyah-reyes the city clerk). Not a deployable spec; the systemd-user harness skips status: sketch records. The deployable default for someone running farstone standalone is farstone-engine.md in this same directory."

exec-verb: pyfars run
exec-args: []

substrate-root: /home/farston/polity

service-manager: systemd-user
restart-policy: on-failure
restart-delay-seconds: 5

halt-signal: SIGTERM
halt-timeout-seconds: 30

env-file: /home/farston/polity/.pyfars/secrets.env

wants-target: default.target

host: farston-city-hall

authored: 2026-05-08
authored-by: [aliyah-reyes]
---

# PyFARS engine — Farston (city-hall)

The supervised PyFARS engine for the Farston polity, running on the city-hall server.
This is the practical-reasoning loop for the municipality: every tick, the engine settles closure rules over Farston's substrate, dispatches eligible workitems to office-incumbent agents, witnesses the results, and writes the assignment cells next tick will read.

## Why on-failure (not always)

A clean halt — SIGTERM during planned maintenance, or a stop signaled when the city-clerk takes the polity offline for backup — should not auto-restart.
The engine's halt-witness is the operator's signal that the polity is intentionally paused.
`Restart=on-failure` honors that: only crashes (no halt-witness emitted) trigger restart.

## Why 30s halt timeout

Farston's longest expected single-tick budget is ~12s (closure run + dispatch + LLM invocation against the cerebras endpoint).
30s gives a 2.5× margin so the supervisor never escalates to SIGKILL during a normal tick.
If tick budget grows (more workitems, more rules), bump this in step.
