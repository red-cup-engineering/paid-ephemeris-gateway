---
title: "OpenClaw-first interface design"
type: decision
status: committed
date: "2026-05-07"
theory-basis: [enterprise, formality-layer, normative-operational-layering]
---


## What

OpenClaw is the primary human-facing interface for PyFARS.
The CLI is secondary — maintained for substrate inspection, debugging, and operator bootstrapping, but not the design target for new interface features.
The web interface is demonstration-only.

## Why

Per `formality-layer`, different work has different formality requirements.
The agentic workflows PyFARS is built to support — theory derivation, heartbeat dispatch, multi-office task routing — require the frontier-model and structured-output layers that OpenClaw provides.
A CLI cannot host these workflows; it can only hand off to them.

The charter's G1 guideline (guidelines tier, not hard core) commits to OpenClaw as the primary integration point for exactly this reason: OpenClaw is the layer where agential orchestration and human intent converge on the PyFARS substrate.
Building the primary interface there keeps the formality gradient intact — the substrate handles predication; the harness handles agents; OpenClaw handles the human.

This is a G1 (guidelines tier) commitment, not a hard-core commitment.
Unlike C1–C5, OpenClaw-first can be changed by a steward governance decision without novation.
It reflects the current phase of development; a future phase might replace OpenClaw with a different harness architecture without terminating the enterprise.

## Rules out

- New CLI features that duplicate OpenClaw capabilities.
  When a feature exists in OpenClaw, the CLI does not need to re-implement it.
  If a CLI user needs the feature, the answer is to use OpenClaw.
- Web interface features beyond debugging/demonstration.
  Growing `pyfars serve` as a primary feature surface contradicts this decision.
- Designing substrate APIs around what's convenient to call from a shell.
  APIs are designed for correctness and substrate integrity; CLI ergonomics are a harness concern.

## Does not constrain

- Whether to maintain the CLI at all.
  The CLI serves legitimate substrate inspection and operator bootstrapping needs; it is secondary, not absent.
- Which version of OpenClaw, or what protocol OpenClaw uses to call PyFARS tools.
  The decision is about interface priority, not about OpenClaw's internal architecture.
- Whether non-OpenClaw harnesses (MCP, custom agents) are admissible.
  They are; this decision doesn't exclude them.
  It says OpenClaw is *primary*, not *exclusive*.
