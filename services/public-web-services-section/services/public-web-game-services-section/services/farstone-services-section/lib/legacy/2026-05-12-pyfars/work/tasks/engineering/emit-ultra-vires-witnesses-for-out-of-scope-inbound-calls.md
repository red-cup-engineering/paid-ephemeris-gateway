---
title: "Emit ultra vires witnesses for out-of-scope inbound calls"
type: task
area: engineering
status: open
horizon: captured
milestone: m8-inbound-participation-mcp-clients
goal: office-bound-admission-policies
depends-on: [implement-inbound-call-jurisdiction-check]
requires-capabilities: [python-editing, witness-emission]
theory-basis: [jurisdiction]
---


## Description

When the inbound-call jurisdiction check (per [`implement-inbound-call-jurisdiction-check`](implement-inbound-call-jurisdiction-check.md)) fails on any axis, emit a structured ultra-vires witness binding the failure to its cause:

- `(ultra-vires-attempt, by-cloud-agent, <agent-slug>) = T`
- `(ultra-vires-attempt, via-boundary, <boundary-slug>) = T`
- `(ultra-vires-attempt, against-office, <office-slug>) = T`
- `(ultra-vires-attempt, jurisdiction-failed-on, <axis>) = T` (`personal` | `subject-matter` | `temporal`)
- `(ultra-vires-attempt, attempted-tool, <tool-name>) = T`
- `(ultra-vires-attempt, at-stage, <ts>) = T`

The witness is part of the audit trail; the attempted call's effect on the substrate is **none** (per [predgov jurisdiction §"Ultra vires"](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/jurisdiction.md)).
The cloud agent receives a 403 response.

Per [M3](../../milestones/m3-continuous-loop.md)'s [`anomaly-surfacing-via-contradiction-cells`](anomaly-surfacing-via-contradiction-cells.md): repeated ultra-vires from the same cloud agent surfaces as an anomaly; review-workitem queued.

## Acceptance

- [ ] Ultra-vires witnesses emit on each jurisdiction-axis failure (personal, subject-matter, temporal).
- [ ] Witnesses carry the full provenance set above.
- [ ] No substrate-side effect on the workitem (verified: workitem stays at $\bot$ on its dispatch axes).
- [ ] Repeated ultra-vires from same cloud agent → anomaly + review-workitem.
- [ ] Tests cover all three axis failures and the anomaly path.

## Progress cells

*(empty — task not yet started)*
