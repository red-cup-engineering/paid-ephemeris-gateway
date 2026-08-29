---
# Spec: event-log-append:2026.05.09+event-log-append §6.5 — End-to-end equivalence
# Fixture: minimal polity-image used by the end-to-end test that drives both
# the hook dispatcher and the MCP append_witness tool against a temporary root.
type: index
title: "Offices (test fixture)"
---

# Offices

This directory is intentionally minimal.
The end-to-end fixture polity has no offices declared because the §6.5 test does not exercise office-authority binding.
It exercises only the codepath-uniqueness invariant (R1–R2) and the payload schema (R4–R5) under both the hook and MCP surfaces.
