---
type: definition
class: system-entity
status: draft
realizes: [peer-record]
depends-on: [predication-cell, jsonl-event-log, channels/inter-office]
implementation: pyfars.federation.peer
---

# Peer record

The PyFARS-realization of upstream [peer-record](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/peer-record.md): a markdown file under `governance/peers/<slug>.md` whose frontmatter declares a federated PyFARS engine — its address, its trust level, the substrate scopes it shares, and the federation cadence.

A peer is a *sovereign* node — it holds its own substrate, runs its own engine, owns its own writes.
Federation is *not* RPC: a peer record does not give us authority to invoke that peer; it gives us a channel to receive their system cells and merge them with ours via the bilattice value-domain join.

## Markdown shape

```markdown
---
slug: cold-red-gate-561-peer
type: peer-record
address: https://cold-red-gate.561.group/federation/
trust-level: confederate
shared-scopes:
  - theories/
  - governance/charter.md
  - work/milestones/
sync-cadence: per-hour
sync-direction: bidirectional
public-key: ed25519:XYZABC123...
---
```

## Cells

A peer record's frontmatter projects to:

- `(slug, type, "peer-record") = t`
- `(slug, address, <url>) = t`
- `(slug, trust-level, <level>) = t` where level ∈ {`confederate`, `federate`, `observe-only`, `untrusted`}
- `(slug, shares-scope, <path>) = t` — one cell per shared scope path
- `(slug, sync-cadence, <cadence>) = t`
- `(slug, sync-direction, <direction>) = t` where direction ∈ {`bidirectional`, `inbound-only`, `outbound-only`}
- `(slug, public-key, <key>) = t` — for envelope signature verification

## Trust levels

- **`confederate`** — full sovereignty acknowledged; cells from this peer merge with ours via $\vee_k$ on shared scopes; conflicts produce $\top$ that we surface for adjudication, not silently overwrite.
- **`federate`** — read-only relationship; we admit their envelopes but they do not admit ours.
- **`observe-only`** — we admit their envelopes for visibility but mark merged cells with `(cell, source-trust, observe-only)` so the dispatch graph can de-prioritize.
- **`untrusted`** — envelopes are received and logged but not merged into the substrate; useful for monitoring an adversarial peer's claims without giving them substrate-write capacity.

The trust-level cell is read by the envelope-admission morphism (currently a backing-gap on M6) before merge.

## Per-cycle federation

The federation cycle (a [recurrent-practice](../../work/recurrent-practices/_index.md), backing-gap until authored) reads each peer record, dials the peer's address, exchanges envelopes for shared scopes, and merges via $\vee_k$.
Cadence is per-peer; one peer may sync hourly while another syncs daily.

A peer record authored or modified mid-tick takes effect on the next federation cycle.

## Discussion

The peer-record realization is intentionally thin — most of federation's content lives in the [federation-envelope-record](federation-envelope-record.md) (the wire-format that crosses the boundary) and in the federation-cycle recurrent-practice (the schedule that drives exchange).
The peer record carries only the *relationship metadata*: who they are, how to reach them, what we share, what we trust.

Sovereignty is preserved by construction: nothing in this record gives us authority to write to the peer's substrate.
The merge happens on *our* substrate when *we* receive *their* envelope.
The peer's substrate is updated only when *they* receive *our* envelope and run *their* merge.
