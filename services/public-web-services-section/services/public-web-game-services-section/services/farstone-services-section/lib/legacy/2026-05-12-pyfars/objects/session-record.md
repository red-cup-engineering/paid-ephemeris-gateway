---
type: definition
class: system-entity
status: draft
realizes: [session-record, session-as-entity, incumbent]
depends-on: [predication-cell, jsonl-event-log, witness, dispatch-closure-rule-system, incumbent, session-as-ephemeral-incumbent]
related-concepts: [session-as-ephemeral-incumbent, automated-installer]
authored-under-cycle-extension: 2026-05-09-session-bootstrap-as-installation
implementation: pyfars.engine.session
implementation-class: pyfars.runtime.session.Session
---

# Session record

The PyFARS-realization of upstream [session-record](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/session-record.md): a markdown file under `governance/sessions/<slug>.md` whose frontmatter binds the session's identity, investiture, lifecycle state, and event-chain pointers as system cells.
The session IS the record per [`session-as-entity`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/session-as-entity.md).

In PyFARS, a "session" wraps each tick of the engine: opening at the start of `tick_node`, accumulating observations during agent invocation, and closing at the end of the tick.
Sessions are also created for cross-tick contexts (an OpenClaw conversation, a long-running runbook), in which case the session spans many ticks and accumulates state across them.

## Markdown shape

```markdown
---
slug: 2026-05-09T14:32-engine-tick-417
type: session-record
agent: engine
office: pyfars-executive-officer
opened-at: 2026-05-09T14:32:00.000Z
closed-at: 2026-05-09T14:32:01.412Z
state: closed
closure-rule-system-version: 0.7.3
parent-session: null
---
```

## Cells

A session record's frontmatter projects to:

- `(slug, type, "session-record") = t`
- `(slug, agent, <agent-slug>) = t`
- `(slug, office, <office-slug>) = t`
- `(slug, state, <state>) = t` where state ∈ {`open`, `active`, `paused`, `closing`, `closed`}
- `(slug, opened-at, <iso-timestamp>) = t`
- `(slug, closed-at, <iso-timestamp>) = t` (or omitted while open)
- `(slug, closure-rule-system-version, <semver>) = t` — pinned for replay-determinism

State-transition events go to the JSONL event log; `state-history` is a derived cell computed from the log.

## Working memory

Per upstream's three-tier memory: `always-loaded` (office fiber), `session-active` (working memory accumulated during the session), `searchable` (corpus tier accessible by query).
PyFARS realizes `session-active` as cells namespaced under the session's slug — `(session-slug, observed, <observation-cell-slug>) = t` for each observation produced during the session.

## Per-tick session lifecycle

For an engine tick at $\tau$: 1.
`opening-session(tick=$\tau$)` — creates the session-record markdown, emits the `open-session` event, pins the closure-rule-system version.
2.
Agent invocations during the tick produce observation-cells; each cell carries `(observation-slug, derived-during-session, session-slug) = t`.
3.
`closing-session(session)` — sets `state: closed`, sets `closed-at`, emits the `close-session` event with the session's settling-witness.

The per-tick discipline gives every observation a session-bounded provenance: any observation can be traced to exactly one session, and any session's observations can be queried as a cell-set.

## Discussion

Cross-tick sessions (an OpenClaw conversation, a long-running runbook) follow the same shape but with `parent-session:` pointing at the engine-tick session that opened them.
The engine emits per-tick sessions even when no agent is invoked — the empty session is a load-bearing record (it lets replay determine "the engine ticked at $\tau$ and produced no observations" rather than leaving the tick unwitnessed).

## Claude Code session — the ephemeral-incumbent reading

A Claude Code session running against the polity is a session-record specialized to the [`session-as-ephemeral-incumbent`](../concepts/session-as-ephemeral-incumbent.md) pattern, authored under cycle [`2026-05-09-session-bootstrap-as-installation`](../work/cycles/2026-05-09-session-bootstrap-as-installation.md).
It IS the [PredGov incumbency proposition](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/incumbent.md) $\iota$ for the session's binding to its office.

### Additional frontmatter cells (Claude Code sessions)

```yaml
---
slug: claude-session-<uuid>
type: session-record
agent: <session-occupant-slug>           # e.g. "agent:claude-opus-4-7"
office: pyfars-executive-officer         # bound office (recognition + induction predicates target this)
runtime: claude-code                     # runtime kind — distinguishes from engine-tick sessions
session-id: <uuid>                       # the Claude Code SDK session UUID
model: claude-opus-4-7                   # LLM model identity
transport: interactive                   # interactive | cloud-agent | subprocess
installer: agent:claude-session-installer    # the automated-installer entity that fired the install increment
bootstrap-stage: 2026-05-09T18:30:00Z    # τ_boot — when installation increment fired
recognized-as-incumbent-of: pyfars-executive-officer  # PredGov recognition predicate
inducted-into: pyfars-executive-officer               # PredGov induction predicate
parent-incumbency: null                  # for sub-sessions: parent session-id
state: open
opened-at: 2026-05-09T18:30:00Z
closed-at: null                          # settles on session-stop
relieved-by: null                        # next session-id when relief settles
---
```

### File location

For Claude Code sessions, records live at `records/engineering/sessions/<session-id>.md`.
The `governance/sessions/<slug>.md` location named earlier in this document is for engine-tick sessions; the two locations co-exist because they have different audit lifetimes (engine-tick records may be compacted; per-Claude-session records are archived separately).

### Realizes the incumbency tuple

The cells above realize the PredGov [incumbency tuple](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/incumbent.md) $(O, \tau^*, a, \iota)$:

- $O$ = `office:` cell (the bound office)
- $\tau^*$ = `bootstrap-stage:` (and `state-range-bound` derived from `opened-at`/`closed-at`)
- $a$ = `agent:` cell (the body natural)
- $\iota$ = the record itself; its substrate-path serves as the slug

Joint settlement of `recognized-as-incumbent-of:` and `inducted-into:` at $\mathbf{t}$ is dignitas, which triggers [`propagate-office-deontic-profile-to-session`](../morphisms/propagate-office-deontic-profile-to-session.md).
The harness's `.claude/skills/` and `.claude/agents/` projection at install-time is independently determined by [`project-delegable-skills`](../morphisms/project-delegable-skills.md) reading the office's `delegable-skills:` cells.

### `pyfars.runtime.session.Session` extension

The Python dataclass at `pyfars/src/pyfars/runtime/session.py` is extended (under Phase C of the implementation roadmap) to carry the additional fields named above (`session_id`, `model`, `transport`, `installer_slug`, `parent_session_id`, etc.).
The dataclass round-trips to/from the on-disk record via standard frontmatter parse, so a process restart can resume incumbency from the system.
