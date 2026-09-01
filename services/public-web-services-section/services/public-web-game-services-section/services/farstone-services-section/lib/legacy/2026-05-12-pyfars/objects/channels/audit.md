---
type: object
class: channel
status: draft
name: Audit
kind: audit
description: "Read-only channel aggregating witnesses for review. Auditors subscribe; agents emit by writing audit-flagged witnesses."
emit-policy: "any agent (substrate guard rejects unauthorized)"
read-policy: "auditor offices"
retention: durable
ordering: total
message-schema: "{ finding-kind: governance | quality | security | drift, severity: info | notice | warning | error, target: substrate-path, witness-ref: hash }"
depends-on: [channel, message, witness]
---

# Audit channel

Aggregates audit findings from across the polity.
When an agent emits a witness on the `audit` operation-typology channel, a corresponding Message lands here for the auditor offices' review.

## Distinct from the operation-typology audit channel

The seven [operation-typology channels](_index.md) (observation / guard / accounting / query / mutation / analysis / learning) are **kinds** every witness is tagged with.
THIS audit channel is a **messaging channel** — agents send Messages on it explicitly, naming a finding-kind and severity, with a witness-ref pointing to the underlying observation.

The two coexist: an agent doing an audit emits *witnesses* on the `analysis` operation-typology channel (recording what it saw); when the audit produces a finding worth surfacing to the polity's auditor offices, the agent *also* sends a Message on this channel pointing at those witnesses.

## Retention

Durable.
Audit findings are the polity's record of its own self-checking; no expiry.

## Ordering

Total.
Auditors review findings in send-order; partial orderings would complicate report generation.

## Subscribers

Auditor offices (`code-reviewer`, `security-reviewer`, `theory-auditor`, `operational-record-enricher`) subscribe to receive findings as they arrive.
