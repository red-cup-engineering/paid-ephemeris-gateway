---
title: "Groq Llama 3.3 70B Versatile"
type: llm-endpoint
status: active
provider: groq
model-name: llama-3.3-70b-versatile
base-url: https://api.groq.com/openai/v1
auth-env-var: API_KEY_GROQ
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
grade: large
cost-per-token-in: 0.0
cost-per-token-out: 0.0
monthly-budget-tokens: null
rate-limit-rpm: 30
rate-limit-rpd: 14400
rate-limit-tpm: 6000
rate-limit-tpd: 500000
enrolled-at: "2026-05-08"
survey-cited: survey-of-free-cloud-model-endpoints-may-2026
---


Groq-hosted Llama 3.3 70B. ~300 tokens/second on 70B-class models — second only to Cerebras for free-tier throughput, with broader model selection and a higher daily-request cap (14,400 RPD).

## Why Farston uses this endpoint

Routine procedural work where Cerebras's daily budget is exhausted: complaint classification, permit-application initial review, meeting minutes drafting.
The 14,400 RPD cap accommodates the small-town volume Farston produces.
