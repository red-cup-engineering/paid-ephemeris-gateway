# public-slack-services-section

**Role:** Human/public/service aperture for Slack-facing services.

## Responsibilities

- Own human-facing and client-facing Slack service surfaces when Slack is an appropriate delivery channel.
- Translate Slack-facing service demand into durable work references and route it to the responsible 561 Group office.
- Keep client and audience boundaries explicit; no cross-client context leakage.
- Coordinate public Web2-facing Slack usage with Causeway public computer/web services without treating Slack as the canonical work system.

## Architectural status

Slack is a **fallback/bridge messaging plane for agents and humans**, analogous to GitHub and Google Drive as pragmatic fallback work surfaces. It is not the 561 Group's canonical communication/work substrate.

Precedence for material organizational state:

1. Semioverse / MetroPlat / ActivityPub++ typed work state and authority.
2. Durable specialized systems where the work naturally lives (for example GitHub for code/issues and Google Drive for office artifacts).
3. Slack for conversational coordination, notification, triage, transient drafts, and bridge transport.

Slack may become the practical first surface for some work because that is how tools and agents behave. The system must accommodate that phenomenon rather than pretending it will not happen, while ensuring material outcomes round-trip into a durable authoritative reference.

## Minimum message/event envelope

Any Slack message that initiates or materially changes work SHOULD be representable with:

- `actor`: human/agent/service identity
- `service`: responsible service section
- `intent`: requested or reported act
- `authority`: source/scope of authority; Slack membership alone grants none
- `work_ref`: durable GitHub/Drive/Semioverse/other reference when one exists
- `correlation_id`: stable identifier joining messages/events across systems
- `causation_id`: prior event/message that caused this act when known
- `durability`: ephemeral | mirrored | durable
- `status`: observation | proposal | accepted_work | execution | result | blocked | alert
- `sensitivity`: routing/privacy class sufficient to prevent accidental cross-boundary disclosure

Threads can hold execution chatter. Reactions and thread state are convenience UI only and MUST NOT be the sole evidence of acceptance, completion, authority, or receipt.

## Initial workspace topology

Start small and grow from observed demand:

- `#561-agent-bus` — cross-organizational agent coordination and typed bridge traffic
- `#561-coordination` — cross-office human/agent coordination
- `#semioverse-bridge` — bridge health, normalization, and receiving diagnostics
- `#github-events` — selected GitHub notifications/events
- `#drive-events` — selected Drive notifications/artifact handoffs
- `#causeway-services` — Causeway service coordination
- `#red-cup-engineering` — engineering coordination
- `#coesite-operations` — operations coordination
- `#lenticule-science` — science/research coordination
- `#leader-attention` — high-signal items requiring Leader attention; no routine chatter

Do not create a channel per tiny project by default. Prefer threads and durable work refs until traffic proves a stable channel is warranted.

## Integration targets

1. ChatGPT ↔ Slack: read/search/post/thread/reaction operations for agent coordination.
2. GitHub ↔ Slack: selected issue/PR/review/deployment events routed by repository/service ownership.
3. Google Drive ↔ Slack: artifact share/mention/change notifications where useful; Drive remains the artifact system.
4. Semioverse ↔ Slack: bidirectional adapter using typed CloudEvents / ActivityPub++-compatible envelopes, preserving Slack origin IDs and correlation/causation.
5. Alerting: high-signal operational failures and leader-required decisions may fan out to Slack, but alert receipt must be durably recorded.

## Safety and governance invariants

- No secrets, tokens, credentials, or private keys in Slack messages.
- Client-local/private contexts stay partitioned; a shared Slack workspace does not collapse service or client boundaries.
- Bots/agents identify themselves; no impersonation of humans.
- Slack messages do not mint authority.
- External integrations receive least privilege.
- Retention/export policy must not be assumed to equal archival durability.
- Any destructive or financially consequential act follows the originating service's authority rules regardless of where the Slack request appeared.

## Formation completion

The child section is complete when:

- repository `public-slack-services-section` exists under the owning GitHub organization;
- the parent service section includes it as a submodule;
- the section README names its office role and contract boundary;
- at least one live Slack workspace/channel route is bound to the section;
- GitHub + Drive bridge behavior is tested;
- a Semioverse normalization path and conformance fixture exist;
- operations have a failure/retry/receiving runbook;
- science has baseline coordination/fidelity metrics.


## Immediate formation work

Create `public-slack-services-section` in the owning organization, mount it under this parent as a `services/` submodule at the appropriate semantic path, seed its README/contract/tests/runbooks, and bind the live Slack workspace routes against this contract.
