---
title: "Mistral Small (latest)"
type: llm-endpoint
status: active
provider: mistral
model-name: mistral-small-latest
base-url: https://api.mistral.ai/v1
auth-env-var: API_KEY_MISTRAL
handedness: outbound-only
provides-capabilities:
  - text-generation
  - instruction-following
  - tool-calling
  - structured-output
work-types:
  - generation
  - derivation
  - inquiry
context-window-tokens: 32768
supports-tool-calling: true
supports-structured-output: true
grade: mid
cost-per-token-in: 0.0
cost-per-token-out: 0.0
monthly-budget-tokens: 1000000000
rate-limit-rpm: 60
rate-limit-rpd: null
rate-limit-tpm: 500000
rate-limit-tpd: null
enrolled-at: "2026-05-08"
survey-cited: survey-of-free-cloud-model-endpoints-may-2026
---


Mistral La Plateforme's experiment-tier endpoint.
Largest absolute monthly budget on the May 2026 free-tier list (1B tokens/month) at ~1 RPS.
Best suited to batch / background work given the per-second cap.

## Why Farston uses this endpoint

Background consolidation runs (M4 settlement-path operator), routine indexing of meeting minutes, and sustained drafting work that benefits from Mistral's monthly token budget rather than per-day caps.
