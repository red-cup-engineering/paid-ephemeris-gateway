---
name: "Authoring a boundary record"
description: "Creates a boundary record in work/boundaries/ encoding a substrate-foreign edge with explicit handedness (bidirectional, outbound-only, or inbound-only). Use when describing a connection to an external system that PyFARS must adjudicate at the substrate level — federation peers, LLM endpoints, MCP-client cloud-agents."
---


## Requirements

- The [`m7-boundary-handedness-and-outbound-endpoints`](../../work/milestones/m7-boundary-handedness-and-outbound-endpoints.md) milestone's [`author-boundary-record-type`](../../work/tasks/engineering/author-boundary-record-type.md) task is complete (or the boundary template exists in `governance/templates/boundary.md`).
- The boundary's handedness — bidirectional, outbound-only, or inbound-only — is determined per the [`swarm-participation-handedness`](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/questions/swarm-participation-handedness.md) framework.
- The boundary's substrate-foreign party (the system on the other side) is named.
- For inbound boundaries: the office that backs the boundary's admission scope exists and declares the boundary in its `admits-inbound-from-boundaries:` cell.

## Steps

1. Read the boundary template at `governance/templates/boundary.md` (or [`governance/specifications/directories.md`](../specifications/directories.md) for the schema if the template doesn't yet exist).
2. **Identify the slug** descriptively: `<peer-system>-<handedness>` (e.g., `claude-api-outbound`, `claude-cloud-agent-inbound`, `acme-federation-peer-bidirectional`).
3. Author frontmatter with `type: boundary`, `handedness:` (one of `bidirectional`, `outbound-only`, `inbound-only`), `peer-identifier:`, `peer-class:` (sovereign-peer / llm-endpoint / cloud-agent / mcp-client), `office:` (for inbound only — which office admits), `signing-key:` (for outbound and bidirectional — the key the boundary uses to sign witnesses), `theory-basis:`.
4. Author body sections:
   - **Peer description** — what the substrate-foreign party is, what it offers
   - **Handedness justification** — why this handedness and not another, citing the [`swarm-vs-orchestration-dichotomy`](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/theories/swarm-intelligence/theorems/swarm-vs-orchestration-dichotomy.md) theorem and [`llm-swarms-fail-classical-conditions`](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/theories/swarm-intelligence/theorems/llm-swarms-fail-classical-conditions.md)
   - **Witness chain** — actor (substrate-native, signs) vs via (substrate-foreign, named) bifurcation; how this boundary's events are witnessed
   - **What this boundary does NOT claim** — per [`author-honest-non-claims-section`](../duties/author-honest-non-claims-section.md), be explicit about non-claims (e.g., "this boundary does NOT claim the peer participates as a classical swarm peer")
5. **For outbound boundaries**: cross-reference the LLM endpoint record per [`authoring-an-llm-endpoint-record`](authoring-an-llm-endpoint-record.md), if applicable.
6. **For inbound boundaries**: ensure the backing office record's `admits-inbound-from-boundaries:` cell includes this boundary's slug; if not, edit the office record (per [`extend-office-record-to-declare-inbound-admission-scope`](../../work/tasks/engineering/extend-office-record-to-declare-inbound-admission-scope.md)).

## Outcomes

A new file in [`work/boundaries/`](../../work/boundaries/) with `type: boundary` and explicit handedness.
Substrate audit can enumerate boundaries by handedness; dispatch consults the boundary's `signing-key:` (outbound) or `office:` (inbound) for witness emission and admission.

## Discipline notes

- **Handedness is structural, not configurational.** A boundary's handedness is a *choice about substrate semantics*, not a runtime toggle.
  Changing it requires authoring a new boundary record and migrating downstream references.
- **Inbound boundaries default-deny.** Per [`m8-inbound-participation-mcp-clients`](../../work/milestones/m8-inbound-participation-mcp-clients.md), an inbound boundary that lacks an office cross-reference admits no calls.
  This is a substrate-purity property, not a security afterthought.
- **The witness chain bifurcates.** Per [`signed-witness-chain-for-inbound-work`](../../work/goals/signed-witness-chain-for-inbound-work.md), inbound calls produce witnesses where actor is the substrate-native receiver and via is the substrate-foreign caller.
  Outbound dispatches reverse this.
  The boundary record carries the half of the chain it's responsible for.
