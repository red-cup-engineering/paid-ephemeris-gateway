---
title: "Inbound-only boundary records"
type: goal
milestone: m8-inbound-participation-mcp-clients
status: open
horizon: captured
theory-basis: [boundary-as-fiber, swarm-participation-handedness, office-as-fuzzy-cell]
tasks:
  - author-inbound-boundary-template
  - implement-inbound-boundary-loader
  - bind-inbound-boundary-to-office-and-jurisdiction
---


After this goal, an inbound boundary at `governance/boundaries/<slug>.md` with `handedness: inbound-only` declares an authenticated entry point: which office admits incoming calls, which [jurisdiction](../../governance/jurisdictions/) bounds the calls' scope, what authentication scheme the boundary expects, what predicates the boundary admits.

The inbound boundary is the substrate-side declaration of "we expose this endpoint for external agents to dial into".
Without inbound boundary records, the MCP server in the next goal has no substrate-level declaration of what offices and jurisdictions to bind to.

## Why

[M7](../milestones/m7-boundary-handedness-and-outbound-endpoints.md) added the handedness coordinate but exercised only the outbound case.
M8 exercises the inbound case: inbound-only boundaries are different in **what the operations are**:

- *Inbound-only*: `extract` is the substantive operation (parse incoming request → predications); `apply` is response-shaped; `compose` is response-fan-out.
- *Outbound-only*: `apply` is the substantive operation (project request from predications → outbound call); `extract` is response-parsing.

The boundary record's `handedness:` cell determines which operations the closure-rule machinery runs.
An inbound boundary's record must additionally carry the *bind-to* office and jurisdiction — those are what gate admission of incoming calls.

## Theory grounding

**1.
Per-handedness interfacer typing** ([FARS *Harness surfaces & interfacers* spec section](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/) — when published).
Inbound boundaries are typed by `extract` as the substantive operation.
Authoring the boundary record makes that typing substrate-readable; the runtime reads `handedness: inbound-only` and binds the inbound interfacer machinery (parse, validate, dispatch) to the boundary.

**2.
Office-bound admission** (from M5's [`office-records-gate-authority`](office-records-gate-authority.md)).
M5 made office authority operative at dispatch time for in-process workitems.
M8 extends to inbound calls: **the boundary's `office:` cell names which office's authority gates admission of cross-boundary calls.** The office's [jural-relations](../../governance/jural-relations/_index.md) of `kind: power` whose `scope-action` matches the call determine eligibility; the office's [jurisdiction](../../governance/jurisdictions/) determines the predicate sub-category the call may affect.

**3.
Substrate-declared exposure, not runtime config** (per [Charter](../../governance/charter.md) C3 agential-self-generation).
What endpoints the substrate exposes is itself substrate content. **A captain authoring a new MCP-public boundary is just authoring a new boundary record** — no code change, no config-file edit.
The runtime reads boundary records on boot and starts servers per the records.

### Design constraints from this grounding

- **Each inbound boundary names exactly one office.** A boundary "the public MCP" naming three offices simultaneously would force the runtime to choose at admission-time, defeating substrate-readable admission.
  If a deployment needs multiple inbound paths with different offices, that's multiple boundary records (e.g., `governance/boundaries/mcp-public.md` and `governance/boundaries/mcp-internal.md`).
- **`exposed-predicates:` cell limits scope.** The boundary's frontmatter carries `exposed-predicates:` — the predicates the boundary admits work-on.
  This is a sub-cap of the office's full jurisdiction; it lets a captain expose narrower scope on a public boundary than the office holds in full.
- **Authentication-scheme is required.** No frontmatter cell `auth:` means the boundary refuses connections (substrate-readable refusal).
  Acceptable values: `bearer-token`, `mtls`, `oauth2-client-credentials`, etc.

## Acceptance

- [ ] A `boundary` template exists at `governance/templates/boundary.md` (already part of [`boundary-records-with-handedness-coordinate`](boundary-records-with-handedness-coordinate.md); this goal uses it for inbound).
- [ ] Inbound boundary records carry: `handedness: inbound-only`, `office: <office-slug>`, `jurisdiction: <jurisdiction-slug>`, `auth: <scheme>`, `exposed-predicates: [<predicate>...]
  `.
- [ ] The runtime's boot phase reads inbound boundary records and configures the FastAPI MCP server (next goal) per the records.
- [ ] Validation rejects: missing office, missing jurisdiction, missing auth, exposed-predicates exceeding the jurisdiction's predicate sub-category.
- [ ] At least one example inbound boundary is authored (e.g., `governance/boundaries/mcp-public.md` for `quiescent.
  561.group/mcp/...
  `).
