---
title: "Cerebras Llama 3.3 70B"
type: llm-endpoint
status: active
provider: cerebras
model-name: llama-3.3-70b
base-url: https://api.cerebras.ai/v1
auth-env-var: API_KEY_CEREBRAS
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
context-window-tokens: 8192
supports-tool-calling: true
supports-structured-output: true
grade: large
cost-per-token-in: 0.0
cost-per-token-out: 0.0
monthly-budget-tokens: null
rate-limit-rpm: 30
rate-limit-rpd: null
rate-limit-tpm: 60000
rate-limit-tpd: 1000000
enrolled-at: "2026-05-08"
survey-cited: survey-of-free-cloud-model-endpoints-may-2026
---


Wafer-scale-silicon-hosted Llama 3.3 70B.
The fastest commodity-LLM endpoint in the May 2026 survey (~1,800–2,600 tokens/second).
Cerebras's ongoing free tier provides the largest daily token budget on the market (1M tokens/day) within a 30 RPM rate limit.

## Why Farston uses this endpoint

For council deliberations, ordinance drafting, and budget audits — work that benefits from speed when an automated office (records-clerk-bot or future autonomous council-summary agents) is processing batches.

## Charter binding

Farston's contract with Cerebras is implicit through the public free tier; Farston does not transmit personally-identifying citizen data through this endpoint.
Citizen-complaint payloads are anonymized before any LLM call.
