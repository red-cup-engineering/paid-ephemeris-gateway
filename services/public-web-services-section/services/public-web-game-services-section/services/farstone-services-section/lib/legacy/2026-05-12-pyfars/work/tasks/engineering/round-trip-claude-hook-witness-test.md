---
title: "Round-trip Claude-Code hook to substrate witness test"
type: task
area: engineering
status: open
horizon: captured
milestone: m1-operational-housekeeping
goal: claude-code-harness-properly-installed
depends-on: [verify-pyfars-hook-dispatch-on-path]
requires-capabilities: [live-claude-session, witness-audit]
theory-basis: [witness-as-increment, substrate-purity]
---


## Description

The structural commitment of the proper Claude harness — the one that distinguishes it from a weak set of projectors — is the round-trip: every Claude Code event becomes a bilattice-graded substrate witness.
This task is the live verification.

Run a Claude Code session in `561/` and deliberately trigger one event of each kind for which a substrate hook record exists (per [`author-substrate-claude-hook-record-set`](author-substrate-claude-hook-record-set.md)):

| Event | How to trigger |
|---|---|
| `SessionStart` | Open `561/` in Claude Code; the event fires on session boot. |
| `UserPromptSubmit` | Submit any prompt. |
| `PreToolUse` / `PostToolUse` | Have Claude run any tool (e.g., `Bash` to `ls`). The matcher should fire on the tool name. |
| `PostToolUseFailure` | Have Claude run a tool that will fail (e.g., `Bash` to `false`). |
| `Stop` | End the session. |

After the session, audit `.pyfars/event-log/<today>.jsonl`:

1. Each event produced exactly one JSONL line (no duplicates, no drops).
2. Each line carries the bilattice axes the substrate hook record declared.
  The `PostToolUseFailure` line should have `truth: 0.0, evidence: 1.0` — that asymmetry is the whole leverage of bilattice witnessing.
3. Each line names the actor and the operator (`tool_use` for the tool events, etc.) per the substrate record's `witness:` block.
4. `pyfars ledger tally --weight-by evidence` and `pyfars ledger tally --min-truth 0.5` produce different aggregate views — failures are visible in the first, hidden in the second.

The asymmetric weighting is the integration's load-bearing demonstration: a flat 0/1 "exit code" view of Claude-Code activity loses the truth/evidence distinction; the bilattice substrate keeps it.

## Acceptance

- [ ] One JSONL witness per event, of the expected kinds, in the expected count.
- [ ] Bilattice axes match the substrate-record-declared values.
- [ ] Evidence-weighted and truth-weighted aggregates differ in the expected direction (failure events show in the first, are filtered out by the second).
- [ ] No event-log line is hand-written — every line came through `pyfars hook-dispatch`.

## Progress cells

*(empty — task not yet started)*
