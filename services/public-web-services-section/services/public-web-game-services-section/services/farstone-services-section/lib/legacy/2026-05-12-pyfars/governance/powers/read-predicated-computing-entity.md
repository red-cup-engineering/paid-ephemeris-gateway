---
title: "Read any predicated-computing entity"
type: jural-relation
kind: privilege
active-holder: self-theory-author
passive-party: pyfars-substrate
scope-action: read-theory-corpus-entity
scope: theories/.../predicated-computing/
correlate-of: no-right
theory-basis: [jural-relation, normative-operational-layering]
---


The self-theory-author may read any entity in the predicated-computing theory corpus — predicated-computing itself plus its sub-theories (agential-orchestration-platform, database-platform, distributed-coordination-platform, functional-runtime-platform, interactive-application-platform, web-server-platform) and any deeper sub-sub-theories — without incurring a duty and without the substrate having any claim against this reading.

The privilege is scoped to predicated-computing and below because the self-theory-author's work is to lift those theories into PyFARS-self-theory commitments.
The author needs to read the full sub-theory tree (e.g., to author the web-slice expansion, the author reads `web-server-platform/` and `interactive-application-platform/` directly).

## What this privilege is not

- It is not a privilege to read the predication-categories math floor (separate privilege: `read-predication-categories-entity`) — though the author also holds that one.
- It is not a privilege to read the FARS spec layer (separate privilege: `read-fars-spec-entity`) — though the author also holds that one.
- It is not a write privilege anywhere.
  The self-theory-author writes only to `pyfars/` (covered by `write-pyfars-self-theory-entity`) and to triage (covered by `write-triage-note`).

## Correlation

The correlate is `no-right` on the substrate: no agent or office may claim the self-theory-author is obligated to refrain from reading any predicated-computing entity.
The read is unconditionally permitted.

## Relationship to other read privileges

| Privilege | Holder | Scope |
|---|---|---|
| `read-predication-categories-entity` | theory-derivation-officer, self-theory-author | predication-categories only |
| `read-predicated-computing-entity` | self-theory-author | predicated-computing + descendants |
| `read-fars-spec-entity` | self-theory-author | FARS spec only |
| `read-any-theory-entity` | pyfars-theory-officer | the entire theory corpus (broadest) |

The narrower privileges (predication-categories, predicated-computing, FARS spec) compose to roughly the same scope as `read-any-theory-entity` — but they're separate records because the motivating need is per-layer: theory-derivation-officer reads only predication-categories; self-theory-author reads three specific layers; theory-officer audits across all of them.
