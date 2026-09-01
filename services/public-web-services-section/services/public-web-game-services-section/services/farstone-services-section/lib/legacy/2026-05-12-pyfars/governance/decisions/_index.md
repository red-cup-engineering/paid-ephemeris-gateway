---
title: "Decisions"
type: index
---


Binding technical and governance decisions for PyFARS development.
Each decision states: What (the committed position), Why (the reason), Rules out (what this prohibits), Does not constrain (what it leaves open).

Decisions are level 4 in the source-of-truth chain — they override work records and code, but yield to the FARS spec and predication-categories theory.

A decision, once written, can only be superseded by another decision (with `supersedes:` frontmatter).
It cannot be overridden by a task or a code change.

| Slug | What |
|---|---|
| `substrate-purity` | PyFARS stays a pure substrate; interface concerns are secondary. |
| `openclaw-first` | OpenClaw is the primary human-facing interface; CLI is secondary. |
| `event-log-is-jsonl` | The event log is an append-only JSONL file, not scattered markdown. |
| `heartbeat-is-the-scheduler` | Work dispatch happens on heartbeat tick, not on request. |
| `markdown-as-projection` | Markdown records are projections from the event log, not primary state. |
| `dispatch-reads-substrate` | Dispatch configuration comes from substrate records, not Python code. |
| `governance-records-use-jural-relation-schema` | Power and duty records use `type: jural-relation` with proper Hohfeldian fields. |
| `three-governing-offices-in-parallel` | Steward, XO, theory-officer operate as peers under the captain (civilian-pluralism), not as a chain. |
| `web-is-operator-surface` | The web interface is the polity's first-class operator-control surface, peer to OpenClaw and CLI; supersedes the demo-only restriction in `openclaw-first`. |
