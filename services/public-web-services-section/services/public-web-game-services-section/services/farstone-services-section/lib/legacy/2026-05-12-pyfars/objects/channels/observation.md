---
type: object
class: channel
status: draft
name: Observation
kind: operation-typology
emit-policy: any
read-policy: any
retention: durable
ordering: total
depends-on: [channel, witness]
---

# Observation channel

Records *what happened*.
Witnesses emitted on the observation channel describe an event without transforming other state — the witness IS the event's substrate residue.
Pure event predication.

Examples: clock ticks, federation envelope emission, wavefront-layer witnesses, commit observations.

Per [`cost-discipline-reads-free`](../../claims/), observations are cheap.
Adding an observation costs only the witness's storage; downstream effect is via subscribers, not via substrate transformation.
