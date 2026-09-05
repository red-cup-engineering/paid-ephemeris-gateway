---
type: definition
class: system-cell
status: draft
realizes: [observation-record, observation]
depends-on: [predication-cell, session-record, jsonl-event-log, observation, channels/observation]
implementation: pyfars.engine.observation
---

# Observation cell

The substrate-cell PyFARS emits when an agent invocation, closure-rule firing, or external-tool call surfaces a *raw* substrate-input to learning — what was seen, heard, returned, or noticed during a [session](session-record.md).
One observation-cell per recordable surface event; the cell goes to the [`observation`](channels/observation.md) channel.

PyFARS realizes upstream [observation-record](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/observation-record.md) as a *cell* rather than a separate-file record because pyfars's discipline is that observations accumulate at high frequency (every agent response, every tool call) — file-per-observation produces unmanageable file counts on a working substrate.
The cell's slug is content-derived (hash of payload), so duplicate observations dedupe naturally; the cell's provenance lives in the JSONL log.

## Cell shape

For an observation produced during session $S$ by agent $A$ noticing predicate $P$ on subject $X$:

```
(<obs-slug>, type, "observation") = t
(<obs-slug>, derived-during-session, <S-slug>) = t
(<obs-slug>, observed-by, <A-slug>) = t
(<obs-slug>, subject, <X-slug>) = t
(<obs-slug>, predicate, <P-name>) = t
(<obs-slug>, predicate-value, <value>) = t
(<obs-slug>, origin, <trace-tag>) = t
(<obs-slug>, channel, "observation") = t
(<obs-slug>, ts, <iso-timestamp>) = t
```

The slug is `obs-<hash(subject + predicate + value + ts)>` — content-addressed but timestamped, so two observations of the same surface fact at different moments are two cells (preserving the upstream discipline that observations are not deduplicated at observation time).

## Where they come from

Observations are produced by: - **Agent invocation responses** — PydanticAI agent responses are projected through `pyfars.engine.observation.from_agent_response()` into observation-cells per declared `produces-observations:` slots in the agent's frontmatter. - **Closure-rule firings on the `learning` channel** — rules whose conclusion is a `(subject, predicate, value)` cell on the learning channel produce observation-cells as a side effect of normal closure. - **External-tool wrappers** — wrappers around `gh`, `git`, `pyfars validate`, etc., emit observation-cells from their stdout/stderr per the tool's projector.

## Per-cell evidence

When an observation cites material (a screenshot, a tool output, a quoted passage), the evidence goes to the JSONL log as a separate event with content-hash addressing per [content-hash-addressing](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/content-hash-addressing.md).
The observation-cell carries the hash; the log carries the bytes.

## Antecedent for consolidation

The [consolidating](../morphisms/consolidating.md) morphism reads observation-cells as the seed of the closure that produces [instinct-cells](instinct-cell.md).
Observations are not consolidated at observation-time — they accumulate, and a periodic consolidation closure runs over the accumulated set.

## Discussion

The cell-vs-record decision is a substantive realization choice: upstream FARS specifies `ObservationRecord` as a substrate-record, which would suggest a file-per-observation.
PyFARS realizes them as cells because the file-per-observation discipline produced unworkable corpora in early experiments (50,000+ files within a week of operation).
Cells preserve every required-field of the upstream `ObservationRecord` while keeping the corpus's file count bounded by the entity-count, not the event-count.
This is a *load-bearing realization choice*, documented here so any alternative realization can revisit it explicitly.
