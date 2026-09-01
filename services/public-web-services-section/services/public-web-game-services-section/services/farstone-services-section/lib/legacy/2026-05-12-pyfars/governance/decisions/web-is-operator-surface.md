---
title: "Web is the operator surface"
type: decision
status: committed
date: "2026-05-09"
supersedes: ["openclaw-first"]
theory-basis: [enterprise, formality-layer, normative-operational-layering]
---


## What

The web interface is the polity's **operator-control surface** — first-class, equal in standing to OpenClaw and the local CLI/UDS interface.
It carries the live witness stream, dispatch state, predication-cell view, intent submission, engine control, dispatch-graph visualization, and the OAuth Authorization Server federated to Google for non-local principals.
The MCP service is a peer surface for frontier-model agents (Claude.ai, ChatGPT, Cline).

OpenClaw remains primary for **agential** work — the place where human intent and frontier-model generation converge on the substrate.
The web surface is primary for **operator** work — driving a running polity, observing its state, queueing intents, halting, replaying.

This is not a downgrade of OpenClaw.
The two surfaces address different formality layers: OpenClaw hosts long-form generation and structured tool calls; the web surface gives the operator continuous real-time visibility and direct substrate manipulation that an agent loop is wrong shape for.

## Why

`openclaw-first` (2026-05-07) committed to the web interface being demonstration-only.
That was correct *at the time*: the engine had no live state worth exposing, dispatch was hand-simulated, and the only consumers of substrate reads were debugging contexts.
Arc A (selection-as-substrate), Arc B (engine-as-systemd-service), and Arc D (operator depth) have changed those facts:

- The engine is now a long-running service that emits a continuous witness stream and persists dispatch decisions as substrate cells.
  There is now state worth observing live.
- The polity-as-deployable model (per `engine-service-spec` §7.1) means each instance is a self-contained directory with its own AS, its own MCP, its own web surface.
  An operator needs a way to drive that instance from anywhere — not just from a shell on the host.
- Federated identity (the OAuth AS) means non-local principals can authenticate to the polity.
  The web is the natural place to host the AS endpoints; OpenClaw cannot.
- 561.group is a public deployment serving real users.
  The web is no longer hypothetical.

`openclaw-first`'s underlying commitment — that *agential* workflows go through OpenClaw — is unchanged.
This decision narrows that decision's `Rules out` clause about the web; it does not contradict the priority ordering for agential interface design.

## Rules out

- Hiding live engine state behind a CLI-only surface.
  If a piece of polity state is observable by an internal operator, it must be observable through the web (with appropriate auth).
- Removing the operator console (`/operator`) or its read endpoints (`/api/witnesses`, `/api/dispatch`, `/api/sessions`, `/api/cells`, `/api/witnesses/stream`) without an explicit superseding decision.
- Treating the web surface as a second-class consumer when designing new substrate APIs.
  New read-side endpoints land in `pyfars.web.app:build_app` first; CLI mirrors come after.

## Does not constrain

- The shape of the operator UI.
  The current single-page console at `/operator` is the first cut; richer flows (multi-pane, per-office dashboards, dispatch-graph clustering) can land without further decisions.
- Whether substrate *writes* go through the web.
  Today's writes are gated through control-plane endpoints (`/api/control/witness`, `/api/control/intent`) and substrate authorization in `pyfars.runtime.tool_registry`.
  Expanding the write surface remains policy work, not a decision-tier change.
- Whether OpenClaw is the primary agential interface.
  It is.
  This decision says the web is the primary *operator* interface; those two roles do not collide.
- Whether the public surface at https://561.group/ stays a static landing page or becomes the pyfars web app directly.
  That is a deployment-shape decision, not an interface-priority one.
