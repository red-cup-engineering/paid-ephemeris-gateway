---
title: "M12 — Cross-Substrate Handoff Protocol to Physical Control Layer"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: planning
horizon: captured
depends-on: [m11-assurance-audit-chain-export]
goals:
  - control-layer-handoff-as-substrate-norm
  - meaningful-human-control-as-charter-c3-extension-norm
  - control-layer-rejection-projector
  - safe-envelope-precondition-cell-required-on-embodied-dispatch
  - byzantine-resilient-consensus-witness-projector
theory-basis: [charter-c3, charter-c5, normative-operational-layering, llm-swarms-fail-classical-conditions]
cites-objects:
  - pyfars/objects/office-record.md
  - pyfars/objects/anomaly-witness.md
  - pyfars/objects/dispatch-closure-rule-system.md
  - pyfars/objects/jsonl-event-log.md
cites-morphisms:
  - pyfars/morphisms/dispatching.md
  - pyfars/morphisms/witnessing-completion.md
cites-claims:
  - pyfars/claims/substrate-purity.md
backing-gaps:
  - pyfars/objects/handoff-protocol-record.md (NOT YET AUTHORED — substrate-readable handoff contract to physical control layer)
  - pyfars/objects/control-layer-rejection-witness.md (NOT YET AUTHORED — CBF/reachability rejection projector)
  - pyfars/objects/human-control-attestation.md (NOT YET AUTHORED — captain authorization gate cell)
  - pyfars/objects/verified-safe-envelope-cell.md (NOT YET AUTHORED — shared with M9)
  - pyfars/morphisms/initiating-handoff.md (NOT YET AUTHORED — substrate→control-layer dispatch boundary)
acceptance: "An embodied-action dispatch (e.g., 'fly to waypoint W via path P') emits an authorization-witness with the verified-safe-envelope cell, the office-as-actor signature, the cloud-or-control-layer-as-via name, and a 'meaningful-human-control' attestation cell from the captain's authorization at the boundary. The control layer's response (acceptance or rejection) projects back as substrate execution events. A captain reviewing the audit can reconstruct the full chain: human authorization → substrate workitem → safe-envelope verification → control-layer handoff → control-layer outcome → substrate witness."
---


A "dispatch to a drone" is *not* a flight command; it is an **authorization to initiate**.
The physical control layer (graph Laplacian dynamics, ADMM-style distributed optimization, MARL-trained policy) operates below the substrate.
M12 codifies the handoff: what the substrate *sends* (an authorization with verified safe envelope), what the control layer *guarantees* (forward-invariance under GCBF+, Byzantine-resilient consensus), how rejections from the control layer become substrate witnesses.

This is also where ["Meaningful Human Control"](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/strategic-deployment-raodmap-drone-swarms.md) becomes a [substrate norm](../../governance/norms/_index.md): dispatch decisions affecting embodied participants pass through a captain's human-witnessed authorization gate.

## Implementation status

**Research-actionable, implementation-blocked at the deployment-context level.** The substrate-side machinery (norm authoring, projector emission, authorization-cell discipline) is doable today.
What's blocked is **the deployment context** — the actual control layer that PyFARS hands off to.
This is not a single technology choice but a deployment decision per polity.

What M12 binds **now**: the substrate-side handoff protocol — the cells the substrate emits to invite the handoff, the cells the substrate reads to accept the response, the witness shape of the captain's "meaningful human control" attestation.

## Goals

| Slug | One-liner | Status |
|---|---|---|
| `control-layer-handoff-as-substrate-norm` | A norm record declaring the discipline: an embodied-action dispatch SHALL include the verified-safe-envelope cell from M9, the cost cells from M10, AND a control-layer-handoff-protocol field naming which control layer admits the action | open |
| `meaningful-human-control-as-charter-c3-extension-norm` | An extension to charter C3: the captain (or designated office) authorizes embodied-action workitems via a "meaningful human control" attestation cell; absent the cell, the dispatch is refused | open |
| `control-layer-rejection-projector` | When the control layer rejects an authorized action (CBF violation, sensor anomaly, byzantine consensus failure), the rejection projects back as a substrate execution event with full provenance | open |
| `safe-envelope-precondition-cell-required-on-embodied-dispatch` | The dispatch graph requires `(workitem, has-verified-safe-envelope, true) = T` before admitting an embodied-action workitem; absent → ultra-vires | open |
| `byzantine-resilient-consensus-witness-projector` | When multi-drone formations require Byzantine-resilient consensus (per the [strategic-deployment-roadmap](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/strategic-deployment-raodmap-drone-swarms.md)'s "Resilience under Adversarial Conditions"), the consensus result projects back as a substrate witness | open |

## Theoretical shape

**1.
Substrate-as-authorization-not-as-control** (substrate-purity preserved at the embodied boundary).
[Charter](../../governance/charter.md) C5 (practical reasoning as operator schedule) commits the substrate to scheduling but **not** to direct actuator control. **The substrate authorizes; the control layer acts.** M12 codifies the discipline that keeps this separation honest.

**2.
Meaningful-Human-Control as substrate norm** (extends [M5](m5-agential-self-generation.md)'s charter-binding norms).
The legal requirement of "appropriate human judgment" over force-relevant decisions becomes a [norm](../../governance/norms/_index.md): every embodied-action dispatch must carry a captain's authorization attestation.
A dispatch lacking the attestation is *ultra vires* and emits a refusal-witness. **This is what makes PyFARS legally deployable** in regulated drone-swarm contexts.

**3.
Honest framing of swarm-coordination claims** (per [`llm-swarms-fail-classical-conditions`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/swarm-intelligence/theorems/llm-swarms-fail-classical-conditions.md)).
PyFARS is small, orchestrated, and expensive.
It does not magically converge. **Every embodied-action dispatch passes through a substrate-authorized, human-attested, formally-verified gate** — no claim that the swarm "self-organizes" or "self-converges".
The convergence claims belong to the lower-layer's mathematics (graph Laplacian's algebraic connectivity, GCBF+'s forward-invariance, Byzantine-resilient optimization's quorum properties); the substrate just authorizes.

## Related

- [Roadmap](roadmap.md)
- [M9](m9-substrate-as-supervisor-of-layered-control.md), [M10](m10-cost-and-energy-ledger-extension.md), [M11](m11-assurance-audit-chain-export.md) — preceding milestones in the embodied-deployment arc
- [Strategic deployment roadmap (theory)](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/strategic-deployment-raodmap-drone-swarms.md)
- [Emergent intelligence in drone swarms (theory)](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/emergent-intelligence-drone-swarms.md)
- [Autonomous agents and drone swarms standalone report (theory)](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/autonomous-agents-drone-swarms-standalone-report-may-2026.md)
