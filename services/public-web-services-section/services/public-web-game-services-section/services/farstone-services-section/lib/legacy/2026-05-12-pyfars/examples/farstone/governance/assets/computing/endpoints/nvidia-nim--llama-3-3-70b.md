---
title: "NVIDIA NIM Llama 3.3 70B Instruct"
type: llm-endpoint
status: active
provider: nvidia-nim
model-name: meta/llama-3.3-70b-instruct
base-url: https://integrate.api.nvidia.com/v1
auth-env-var: API_KEY_NVIDIA
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
context-window-tokens: 128000
supports-tool-calling: true
supports-structured-output: true
grade: large
cost-per-token-in: 0.0
cost-per-token-out: 0.0
monthly-budget-tokens: null
rate-limit-rpm: 40
rate-limit-rpd: null
rate-limit-tpm: null
rate-limit-tpd: null
enrolled-at: "2026-05-08"
survey-cited: survey-of-free-cloud-model-endpoints-may-2026
---


NVIDIA-hosted Llama 3.3 70B Instruct via build.nvidia.com.
Pure rate-limited free access — no daily token cap, ~40 RPM per model.
128K context window — the largest among Farston's free endpoints.

## Why Farston uses this endpoint

Long-context work: financial-audit derivations across the full Q3 transaction set, charter-rule cross-referencing across the full ordinance corpus.
The absent token cap makes this the right place for sustained derivation work that would burn Cerebras's daily budget.
