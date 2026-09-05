---
title: "Farstone engine (standalone default)"
type: service-spec
status: active

# Default service-spec for an operator running farstone standalone on
# a personal box or server: clones emsenn/farstone, runs `pyfars
# materialize systemd-user`, gets a usable unit out the other end. The
# substrate-root and env-file paths assume the polity sits at
# ~/farstone; override at install time when the operator's layout
# differs. Polities embedding farstone (e.g., the 561 group deploying
# it on cold-red-gate) author their *own* service-spec under their
# substrate's specifications/services/ rather than relying on this one.
exec-verb: pyfars run
exec-args: []

substrate-root: ${HOME}/farstone

service-manager: systemd-user
restart-policy: on-failure
restart-delay-seconds: 5

halt-signal: SIGTERM
halt-timeout-seconds: 30

env-file: ${HOME}/farstone/.pyfars/secrets.env

wants-target: default.target

# No host pin — this is the standalone default. A deploying-polity's
# service-spec for its own host pins `host:` to the registered
# computer-system slug.
host: ""

authored: 2026-05-09
---


The deployable service-spec for someone running farstone on their own machine.
Boots the engine bound to the farstone polity at `~/farstone`, lets systemd-user supervise it across reboots and crashes.

This is the *standalone* default — minimal viable spec for "I cloned `emsenn/farstone`, I want it running on my laptop or single server, I have no other PyFARS-based polities competing for resources."
A polity that wants to host farstone *as one of its services on a shared host* (the `561 Group` deploying it on `cold-red-gate` alongside the 561 polity itself, for example) authors its own service-spec under that polity's `governance/specifications/services/` rather than relying on this one.
That polity-side spec sets the real `substrate-root`, the real `host:`, and overrides ports / env-file paths to match the deployment context.

## Why `on-failure` (not `always`)

A clean halt — SIGTERM during planned maintenance, or a stop signaled when the operator pauses the polity for backup — should not auto-restart.
The engine's halt-witness is the operator's signal that the polity is intentionally paused.
`Restart=on-failure` honors that: only crashes (no halt-witness emitted) trigger restart.

## Why `30s` halt timeout

Farstone's longest expected single-tick budget is ~12s (closure run + dispatch + LLM invocation against whichever endpoint the operator has configured).
30s gives a 2.5× margin so the supervisor never escalates to SIGKILL during a normal tick.

## Ports

The engine reads its bound ports from farstone's website-asset cells under `governance/assets/computing/web/`:

- `farston-web/farston-web.md` — web service, default `127.0.0.1:8002`
- `farston-mcp/farston-mcp.md` — MCP service, default `127.0.0.1:8003`

This service-spec doesn't redeclare them; the engine reads the asset cells at boot.
A deploying-polity that needs different ports either edits its in-tree copy of those cells or overrides via `exec-args` (`["--web-port", "..."]
`).

## See also

- [`pyfars-engine-farston.md`](pyfars-engine-farston.md) — in-fiction service-spec narrating Farston's own deployment in the polity's fiction.
  `status: sketch`, harness skips it.
