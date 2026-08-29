---
title: "PyFARS governance"
type: index
status: open
---

# PyFARS — governance

The development-governance layer for PyFARS: decisions that are committed, conventions that bind all records, offices and powers that authorize work, duties that constrain power exercise, and skills that define executable procedures.
Work-tracking (milestones, goals, tasks) lives in [`../work/`](../work/).

Governance is the *past* facet in the four-facet schema: what has been decided and settled, what founds further action.
[`../work/`](../work/) is the present (active doing); [`../src/`](../src/) is the future (what will run).
Per the [directory schema RFC](specifications/directories.md), this directory was named `theory/` until the schema clarified that "theory" overloaded the math-side `theories/` tree.

## Contents

| Path | What's in it |
|---|---|
| [`charter.md`](charter.md) | Captain's vision and anti-patterns. Read first. |
| [`conventions.md`](conventions.md) | Record schema, field conventions, status lifecycle, body format. Authoritative. |
| [`enterprise.md`](enterprise.md) | The PyFARS enterprise as a record: hard-core commitments and protective belt. |
| [`decisions/`](decisions/) | Binding technical decisions: What, Why, Rules-out, Does-not-constrain. |
| [`offices/`](offices/) | Office records: scope, powers, duties, skills, reporting. |
| [`powers/`](powers/) | Power records: what operation is admitted, who holds it, what duties attach. |
| [`duties/`](duties/) | Duty records: constraint on a power. Triggering operation + required action. |
| [`skills/`](skills/) | Skill records: executable procedures that powers enable. Gerund verb phrases. |
| [`ideas/`](ideas/) | Triage: speculative ideas not yet ready to be decisions or records. |
| [`specifications/`](specifications/) | RFCs and protocol specs (e.g., the directory schema). |
| [`questions/`](questions/) | Open questions for the captain. |

PyFARS-scope governance only.
Polity-scope governance lives at the polity's own root (`<polity>/governance/`); theory-scope governance lives at each theory's own root.
The recursion principle is in [`specifications/directories.md`](specifications/directories.md) §8.

## Decisions

| Slug | What |
|---|---|
| [`substrate-purity`](decisions/substrate-purity.md) | PyFARS stays a pure substrate; interface concerns are secondary. |
| [`openclaw-first`](decisions/openclaw-first.md) | OpenClaw is the primary human-facing interface; CLI is secondary. |
| [`event-log-is-jsonl`](decisions/event-log-is-jsonl.md) | The event log is an append-only JSONL file, not scattered markdown. |
| [`heartbeat-is-the-scheduler`](decisions/heartbeat-is-the-scheduler.md) | Work dispatch happens on heartbeat tick, not on request. |
| [`markdown-as-projection`](decisions/markdown-as-projection.md) | Markdown records are projections from the event log, not primary state. |
| [`dispatch-reads-substrate`](decisions/dispatch-reads-substrate.md) | Dispatch configuration comes from substrate records, not Python code. |
| [`governance-records-use-jural-relation-schema`](decisions/governance-records-use-jural-relation-schema.md) | Power, duty, privilege, immunity records use `type: jural-relation` with proper Hohfeldian fields. |
| [`three-governing-offices-in-parallel`](decisions/three-governing-offices-in-parallel.md) | Steward, XO, theory-officer operate as peers under the captain (civilian-pluralism), not as a chain. |

## Source-of-truth ordering

Governance records are level 4 in the source-of-truth chain:

1. `theories/.../predication-categories/` — math foundation
2. `theories/.../predicated-computing/` — engineering foundation
3. `theories/.../flatfile-agentic-resource-system/` — FARS spec
4. **`governance/`** — PyFARS development governance (here)
5. `work/` — work records
6. `src/` — source code

When a lower-numbered source disagrees with a higher-numbered one, the lower-numbered source wins.
Governance records can be amended only by a decision record — not by task completion or code change.
