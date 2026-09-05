---
type: concept
class: port-subtype
status: draft
depends-on: [port, trigger, observation, witness]
---

# Hook

An inbound event-driven [port](port.md).
A hook is the system-side coupling-point at which an *external* event triggers a system-side response: a git pre-commit hook firing on a developer's commit; a Claude Code `UserPromptSubmit` hook firing on a user's prompt; an editor save-hook firing on file save; a webhook firing on an upstream system's notification.

Hooks are the polity's mechanism for *being-triggered-by-the-outside-world*.
Without hooks, the polity would be entirely self-driven; with hooks, external events can drive system-side acts (with full substrate-purity preserved through the hook's bridging-discipline).

## Hook as port + trigger

A hook combines two existing structures:

- It is a [port](port.md) — a substrate-bridging interface.
- Its bridging-discipline is *event-driven* — the external system fires; the hook responds — making it analogous to [trigger](trigger.md), but trigger lives substrate-internal and hook lives at the boundary.

The composition: an external event reaches the hook → the hook records an [observation](observation.md) of the event → the observation may itself trigger system-side agents' [pulses](../morphisms/pulsing.md) per their subscriptions.

## What a hook has

A hook has the [port](port.md) frontmatter plus:

1. **An external-event-shape** — what kind of event from outside fires this hook (git-hook-name, HTTP-webhook-path, OS-signal-number, IDE-extension-event, etc.).
2. **An invocation-discipline** — how the hook receives event data: stdin, env vars, command-line args, file-paths, request-body.
  This is the bridging schema.
3. **A response-policy** — what the hook's system-side response is.
  Often: produce an observation of the external event, then optionally emit witnesses or fire triggers based on the event's content.
4. **A blocking-discipline** — whether the external system waits for the hook's response (synchronous, e.g., git pre-commit) or fires-and-forgets (asynchronous, e.g., async webhook).

## Hooks and substrate-purity

A hook preserves substrate-purity by recording every external invocation:

- The hook's *receiving the event* is an observation.
  The substrate-cell records what arrived.
- The hook's *system-side response* (any witnesses it produces, any triggers it fires) is recorded as ordinary substrate witnesses.
- Replay reproduces the *recorded* hook-firings, not the external system's emission of the events.

This means a polity's interaction-history with its external environment is auditable from the system alone: every git hook firing, every webhook arrival, every IDE-event reaching the polity is in the log.

## Hooks in PyFARS-realization

PyFARS today uses hooks in several places:

- **Git hooks** — pre-commit (run validation), commit-msg (record commit-witness), post-commit (audit-binding).
- **Claude Code hooks** — `UserPromptSubmit`, `SessionStart`, `PreToolUse`, etc., wiring captain's IDE session to the system.
- **MCP server invocations** — when an external MCP client calls a tool, the invocation is hook-shaped from the system's view.
- **Web-server request-arrival** — incoming HTTP requests fire request-arrival hooks before reaching their endpoint.

The catalogue grows; new hooks are added as new external-event sources are integrated.

## Hooks and authority

The system's authority over a hook covers the *response-policy*: what witnesses fire, what closure rules apply, what triggers propagate.
The substrate has no authority over *whether the external system fires the hook* — that's external.
So hooks are points where the substrate is *receptive* rather than *commanding*.

This receptivity has discipline: a hook firing maliciously (an external system firing it under false pretenses) is contained by the hook's authority-shape — the observation records what was received, but cells affected by the observation are bounded by the system's response-policy, not by external claims.

## What this concept does not specify

- The complete external-event-shape catalogue.
- Hook idempotency.
  When the same external event fires the same hook twice, what discipline applies?
  Per-hook currently.
- Multi-hook coordination.
  When several hooks fire in sequence on related external events, the coordination discipline is partly settled.
- Hook deregistration.
  A hook is wired up via [wiring](wiring.md); removal is a wiring-revocation.
