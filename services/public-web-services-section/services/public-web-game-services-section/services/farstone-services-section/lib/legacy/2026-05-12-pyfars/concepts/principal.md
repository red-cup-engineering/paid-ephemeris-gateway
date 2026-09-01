---
type: concept
class: external-identity
status: draft
depends-on: [substrate, jural-relation, authority-gate]
---

# Principal

An external identity that interacts with PyFARS — a human user or an agent — represented in the substrate as a [user-account](../governance/) record (formerly called *external-principal*; the rename is in flight).
A principal carries authentication context (who they are, per an upstream OIDC issuer) and authorization context (what they may do in this polity).

## What a principal record carries

A user-account record in the substrate carries:

- **Identity**: `oauth-issuer` and `oauth-subject` (the canonical identity key from the upstream OIDC issuer — currently always Google).
- **Granted profiles**: a list of named verb-exposure profiles (`remote-rw-narrow`, `read-only`, …) that the principal is authorized to invoke.
- **Personnel mapping** (optional): a `mapped-to-personnel:` link to an internal personnel record, when the principal is a member of the polity who has both an external identity (for inbound-from-the-web auth) and an internal identity (for system operations).
- **Email** (optional): for human readability, not for authentication.

Principal records are system cells in their own right.
The cell $(\text{user-account-X}, \text{granted-profile}, \text{remote-rw-narrow}) = t$ projects as a frontmatter line in the user-account note.

## Authentication

Inbound HTTP requests carry a bearer token.
PyFARS's MCP transport (and, prospectively, its FastAPI app) verify the token's JWT signature against the issuer's JWKS, validate the standard claims (issuer, audience, expiry), extract the `(iss, sub)` tuple, and look up the matching user-account record.

If no record matches, the request is rejected (under the default `--auth-allow-unmapped=false`).
If a record matches, the request proceeds with the principal's granted-profiles informing what verbs the request may invoke.

## Authorization

Authorization is the per-verb gate fired by [dispatch](dispatch.md): does the principal's granted-profiles list include a profile that covers the requested verb?

Profiles are named bundles of verbs.
`read-only` covers reading verbs (`show`, `list`, `search`, `context`, `stats`).
`remote-rw-narrow` adds `queue-intent` and `intents`.
Other profiles can be defined per-polity.
A principal with no granted profile cannot invoke any verb beyond the unauth public surface (which is currently empty for MCP, and will be carefully scoped for the FastAPI public homepage).

## Principal vs. agent vs. personnel

These distinctions matter and are easily blurred.
Per the entity hierarchy ([entity](entity.md) → various specializations):

- **Personnel** is an internal-to-polity identity — a member of the polity with offices, duties, witnessed activity, and an internal record.
  A personnel does not require external authentication; their authority flows through polity-internal delegation. *In the entity hierarchy*: personnel is an entity that is typically also an [agent](agent.md) (it does things) and may be a [principal](principal.md) (it authenticates).
- **[Agent](agent.md)** is the doer — an entity that causes [acts](act.md) via [skills](skill.md).
  Per the upstream [three-condition characterization](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/theorems/three-condition-characterization.md), a strict agent satisfies environmental-action + goal-directed-planning + persistent-state.
  PyFARS uses "agent" in two senses (broad: any doer; strict: agentic-system); see the agent concept.
- **Principal (this concept)** is an external authenticated identity.
  Principals come from outside the polity; they're how non-personnel reach the polity.
  A principal may be `mapped-to-personnel:` if the principal is a member's external identity, or unmapped if the principal is a guest.

The captain has both an internal personnel record (`personnel:emsenn`) and an external user-account (`user-account:emsenn-google`) mapped to that personnel.
When the captain reaches the polity through the web (via Claude.ai), they authenticate as the user-account; their system operations carry through to their personnel.

A single human is typically multiple of these roles simultaneously: an agent (the doer), a principal (when authenticated externally), a personnel (when an internal member).
The roles compose; a Claude Code session running on behalf of the captain is an agent that acts under the captain's principal authority through the captain's personnel-office incumbencies.

## Principals and the public surface

PyFARS's public web surface (the planned homepage at 561.group) is reached by *unauthenticated* requests — no principal is identified.
Such requests can only invoke whatever the polity has defined as the public projection.
Most verbs are unreachable.

When a request authenticates and matches a principal, the principal's granted-profiles widen the reachable surface — read-only granted-profiles enable corpus reads; rw-profiles enable system transitions; full-profiles enable everything.

## What this concept does not yet specify

- The relationship to non-OIDC authentication.
  PyFARS currently commits to OIDC (Google issuer specifically).
  Other auth schemes — sovereign IdPs, mTLS, Signal-as-identity — are program-shaping questions.
- The principal-as-system-content identity model.
  Whether principals should be settled cells (recognized via closure rules from witness events) or just JSON-API consumers is partly settled, partly open.
- Federation across polities.
  A principal authenticated by another 561-Group-affiliated polity reaching this one — open.
