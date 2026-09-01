---
title: "Farstone Compute Endpoints"
description: "Index of the LLM inference endpoints enrolled as compute assets for Farston's automated agents."
keywords: ["governance", "farstone", "polity", "municipal", "council-manager", "prior-art", "specification", "capability"]
type: index
status: open
---

# Farston LLM endpoints

The free-tier cloud LLM endpoints Farston's automated agents (records-clerk-bot and any future autonomous offices) route through.
Sourced from the May 2026 free-cloud-endpoint survey.

| Slug | Provider | Notable |
|---|---|---|
| `cerebras--llama-3-3-70b` | Cerebras | 1M tokens/day; ~2,000 t/s — fastest |
| `groq--llama-3-3-70b-versatile` | Groq | 14,400 RPD; ~300 t/s |
| `nvidia-nim--llama-3-3-70b` | NVIDIA NIM | rate-limited only; 100+ models |
| `mistral--mistral-small-latest` | Mistral La Plateforme | 1B tokens/month |

All four provide `text-generation`, `instruction-following`, and `tool-calling`.
Capability matching at dispatch resolves which endpoint serves which agent's required-capabilities.
