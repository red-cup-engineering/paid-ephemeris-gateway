---
type: object
class: channel
status: draft
name: Query
kind: operation-typology
emit-policy: any
read-policy: any
retention: ephemeral
ordering: total
depends-on: [channel, witness]
---

# Query channel

Read-only; *per [`cost-discipline-reads-free`](../../claims/) a well-disciplined query never emits a witness*.
Queries that DO emit witnesses are observation-tagged, not query-tagged.

The query channel is documented as one of the seven canonical channels because the typology is complete — but operationally, this channel sees almost no traffic.
Callers reading system state classify their reads as queries (free); when a read transitions into recording-what-was-read, it becomes an observation.

Empty traffic on this channel is a *health indicator*, not a problem: it means the cost discipline holds.
