---
title: "Cloud agent admission via dispatch"
type: goal
milestone: m8-inbound-participation-mcp-clients
status: open
horizon: captured
theory-basis: [dispatch-readiness, office-as-fuzzy-cell, witness-chain-bifurcation]
tasks:
  - design-cloud-agent-as-inbound-only-dispatchable
  - implement-inbound-call-to-workitem-projection
  - route-inbound-workitem-via-boundary-office
---


After this goal, when a cloud agent's authenticated call arrives at the inbound boundary, dispatch creates a workitem on the agent's behalf and routes it to the agent (handedness `inbound-only`); the call's response is the workitem's result.

The cloud agent is treated as an **inbound-only dispatchable** — a special class of swarm participant the dispatch graph admits via its boundary's office.
From the dispatch graph's perspective, the inbound case is not a different code path; it's the **same dispatch** with the dispatchable being the cloud agent and the assigned settle-action being "consume the inbound request, run the office's authorized workflow, return the result via the same boundary."

## Why

Without this goal, the MCP server sub-app would be a separate code path running its own admission, validation, workflow execution — duplicating and probably diverging from the engine's substrate-driven dispatch.
The captain's commitment to substrate-mediation requires that **inbound calls flow through the same dispatch graph as in-process workitems**, with the only difference being where the work-source is and where the work-result goes.

This is the structural unification that makes the swarm-participation-handedness framework coherent: one boundary algebra, three handedness classes, one dispatch graph.

## Theory grounding

**1.
Cloud agent as inbound-only AgentRecord specialization** (analogue to [`LLMEndpointRecord`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/llm-endpoint-record.md)'s outbound-only specialization).
A cloud agent record carries `handedness: inbound-only`, no signing key (admission is signed by the office), and a degenerate office whose only granted skill is `admit-inbound-call`. **The dispatch graph routes work *to* the cloud agent in the limited sense of "consume this inbound request"; the cloud agent doesn't initiate substrate writes itself — the office does, on the agent's behalf.**

**2.
Dispatch readiness as inbound-call eligibility** ([`predicated-work/concepts/dispatch-readiness`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/dispatch-readiness.md)).
When an inbound call arrives, the dispatch graph evaluates eligibility cells: does the boundary's office hold the power to admit this call?
Is the call within the jurisdiction?
Does it match an exposed predicate?
Each is one of the dispatch axes; the same closure-rule machinery as in-process dispatch fires.

**3.
Witness-chain bifurcation for inbound** (mirror of the M7 outbound case).
For inbound: **the actor is the office (substrate-native, signs), the agent-via-which is the cloud agent (substrate-foreign, named).** This bifurcation is the operational realization of "PyFARS is sovereign; cloud agents are guests."
The witness chain `office → admit-via-cloud-agent → substrate-bound-result` mirrors `office → dispatch-via-endpoint → external-result` ([`m7-boundary-handedness-and-outbound-endpoints`](../milestones/m7-boundary-handedness-and-outbound-endpoints.md)).

### Design constraints from this grounding

- **The inbound call becomes a workitem in the substrate.** The MCP server's `call-tool` handler emits `(workitem, kind, inbound-call) = T`, `(workitem, requested-by-cloud-agent, <agent-id>) = T`, `(workitem, requested-via-boundary, <boundary-slug>) = T`.
  The dispatch graph picks it up like any other workitem.
- **The dispatchable for an inbound call is a degenerate office-shaped entity**, not the cloud agent itself.
  The office's settle-action is "execute the workflow corresponding to the requested tool"; the workflow's invocations may include calling other workitems, reading substrate state, etc. — all under the office's authority.
- **The response path goes back through the same boundary.** When the workflow completes, the result projects through the boundary's `apply` interfacer into MCP-protocol response shape.
  The cloud agent receives the result; the substrate has the witness-chain.

## Acceptance

- [ ] An inbound `call-tool` request is projected into a workitem with the appropriate frontmatter.
- [ ] The dispatch graph routes the workitem via the boundary's office (verified by the dispatch-witness naming the office in the actor slot).
- [ ] The witness chain carries the cloud-agent identifier in the via slot.
- [ ] The result projects back through the boundary's apply interfacer; the MCP response carries the workflow's output.
- [ ] Replay determinism preserved: replaying the event log reconstructs the inbound-call workitem and its witness chain.
- [ ] Tests cover: simple inbound call (one tool), inbound call with chained substrate writes (workflow with multiple steps), inbound call refused on jurisdiction (boundary's exposed-predicates doesn't admit the tool).
