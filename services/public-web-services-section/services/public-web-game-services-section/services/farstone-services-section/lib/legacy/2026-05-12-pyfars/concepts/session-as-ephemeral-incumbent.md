---
type: concept
status: draft
revised: 2026-05-09
authored: 2026-05-09
authored-under-cycle: 2026-05-09-session-bootstrap-as-installation
derives-from-claim: session-bootstrap-as-installation
realizes:
  - incumbent  # PredGov object — applied here at the persona level, not directly at session level
  - agential-self-generation  # PredComp concept — every operative element is a substrate entity
theory-basis:
  - incumbent
  - office-as-double-settlement
  - settling-monotonicity
  - agential-self-generation
---

# Session-as-ephemeral-incumbent

The substrate-algebraic reading of a Claude Code session running against a polity.
The session is a *body-natural* in PredGov's two-body sense, but the body-politic it wears is **not the office directly** — it is a *persona-agent* (per [`agential-self-generation`](../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/concepts/agential-self-generation.md)) that holds the office.
PredGov's body-politic/body-natural distinction stacks twice:

```
office:<slug>             ← body-politic of the institutional position
  ↓ held-by (incumbency, durable, settled at one-time persona-investiture)
persona:<slug>            ← body-natural of office; itself body-politic of the persona-agent
  ↓ wears (per-session watch-takeover, ephemeral)
session:<uuid>            ← body-natural of persona; ephemeral, lives one tick
```

The persona is the durable incumbent — its `holds-office:` cell IS the PredGov incumbency relation per [`incumbent.md`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/incumbent.md).
The session is the ephemeral body-natural of the persona — it does not file an installation increment against the office; it files a *watch-takeover* witness against the persona, picking up where the prior session left off (per [`three-tier-memory`](../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/three-tier-memory.md)'s `session-bridging` tier).

In 561 the canonical instance: `office:first-officer` (held-by `persona:calder-underhill` since 2026-04-05) is the captain's interactive-session office; each Claude session that opens against 561/ is an ephemeral body-natural wearing Calder.

## The two stacked body-politic / body-natural relations

PredGov's `incumbent.md` distinguishes a body-politic (cells persistent across stages) from a body-natural (stage-indexed, mortal).
For 561's persona-mediated sessions, the distinction stacks twice:

**Layer 1: persona-as-incumbent-of-office (durable)**

- **Body politic** — the office (e.g., `office:first-officer`).
  Structural cells (`normative-structure`, `action-domain`, `deontic-profile-actions`, `delegable-skills`, `delegable-sub-agents`, `held-by`) persist across all sessions and all personas.
  The office exists whether or not any persona currently holds it.
- **Body natural** — the persona (`persona:calder-underhill`).
  A substrate entity per [`agential-self-generation`](../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/concepts/agential-self-generation.md).
  Holds the office via the `holds-office:` cell.
  Accumulates institutional knowledge across sessions in its own system record.
  Mortal in principle (a persona can be retired, replaced, novated) but typically long-lived.

**Layer 2: session-as-body-natural-of-persona (ephemeral)**

- **Body politic** — the persona (now playing the body-politic role).
  Carries the persona-record's accumulated knowledge, decision history, character.
- **Body natural** — the Claude session, identified by a session-id.
  An ephemeral substrate entity in $E_\mathrm{op}$ — exists from `SessionStart` to `SessionStop`, then ceases.
  The session does not pre-exist the SessionStart hook firing; it does not survive the session-stop event.
  Per `calder-underhill.md`: *"each Claude instance that stands the watch is a body-natural wearing Calder's body-politic; institutional knowledge, character, and judgment accumulate against the persona, not against the runtime instance."*

This is a clean *application* of PredGov to PredComp's persona pattern — PredGov's incumbent quadruple $(O, \tau^*, a, \iota)$ never required $a$ to be atomic.
Here $a$ at Layer 1 is the persona, which is itself the body-politic of Layer 2.

## Why "ephemeral" lives at Layer 2

Layer 1 (persona-holds-office) is durable — Calder's `holds-office: office:first-officer` cell was settled on 2026-04-05 and persists.
The succession morphism would handle relief if the captain ever installs a different persona; absent that, Calder is the incumbent indefinitely.

Layer 2 (session-wears-persona) is ephemeral — each Claude session opens, takes up the watch, and closes.
The session-record persists in the system forever (it's the audit trail of one tick of operation), but the *running session* — the Python process, the LLM stream, the body-natural — exists only between SessionStart and SessionStop.

PredGov's machinery handles both layers without new primitives: - *Layer 1's* installation, capability propagation, succession, revocation are the standard PredGov morphisms applied to the persona-as-occupant. - *Layer 2's* watch-takeover is a *weaker* operation than installation — it does not assert a new investiture; it engages an existing one.
The session asserts $\langle \text{session}, \texttt{wears-persona}, \text{persona}\rangle = \mathbf{t}$ and inherits the persona's deontic profile transitively.

What's new is just the *naming*: "session-as-ephemeral-body-natural-of-persona" is the sub-pattern of body-natural specialized to per-tick AI sessions.

## Cell pattern

A session-as-ephemeral-body-natural-of-persona at stage $\tau^*$ carries:

- $\langle s, \texttt{is-claude-session}, \mathbf{t}\rangle$ — the session entity is a Claude session.
- $\langle s, \texttt{session-id}, \texttt{<uuid>}\rangle$ — the session's identity (the Claude Code SDK's session UUID).
- $\langle s, \texttt{model}, \texttt{<model-slug>}\rangle$ — the LLM model identity (e.g., `claude-opus-4-7`).
- $\langle s, \texttt{transport}, \texttt{<transport>}\rangle$ — `interactive` (captain-driven), `cloud-agent` (autonomous), `subprocess` (sub-session).
- $\langle s, \texttt{wears-persona}, \texttt{persona:<slug>}\rangle = \mathbf{t}$ — **the watch-takeover predicate**.
  Settles at SessionStart when the hook handler looks up the office's `held-by:` cell to find the persona, then asserts this cell.
  Through this cell the session inherits the persona's holds-office relation and (transitively) the office's deontic profile.
- $\langle s, \texttt{office}, \texttt{office:<slug>}\rangle = \mathbf{t}$ — the office whose persona is being worn (a denormalized convenience cell; the canonical chain is `s → wears-persona → holds-office`).
- $\langle s, \texttt{at-stage}, \tau_\mathrm{boot}\rangle = \mathbf{t}$ — bootstrap stage.
- $\langle s, \texttt{stage-range-bound}, [\tau_\mathrm{boot}, \tau_\mathrm{stop})\rangle$ — the explicit ephemeral-occupancy bound.
  Settles when session-stop is observed.
- $\langle s, \texttt{parent-session}, \texttt{session:<uuid>}\rangle$ — present (at $\mathbf{t}$) only for sub-sessions spawned via the `Agent(...)
  ` tool; absent for top-level sessions.
  Does NOT settle a `parent-incumbency` because incumbency is at the persona level; lineage is at the session level.

The session record does NOT carry `recognized-as-incumbent-of:` or `inducted-into:` cells — those settle on the *persona* at investiture, and Calder's record carries them.
Reading "is the session authorized?" walks: `s.wears-persona → persona.holds-office → office's deontic profile`.

## Lifecycle

1. **Pre-bootstrap.** No cells for this session.
  The persona record (e.g., `persona:calder-underhill.md`) and the office record exist; their `holds-office:` and `held-by:` cells are settled.
2. **Watch-takeover fires** ($\tau = \tau_\mathrm{boot}$).
  The SessionStart hook handler reads `office.held-by:` to find the persona slug, authors the session-record, sets `wears-persona:` to the persona at $\mathbf{t}$.
  No installation increment fires (Layer 1 is unchanged); a watch-takeover witness lands instead.
3. **Operational stage** (between $\tau_\mathrm{boot}$ and $\tau_\mathrm{stop}$).
  The session exercises the persona's holds-office authorities via transitive inheritance.
  Each MCP write produces a witness whose `origin` is the session-id but whose `agent` is the persona slug — preserving the discipline that "institutional knowledge, character, and judgment accumulate against the persona, not against the runtime instance."
4. **Session-stop event.** `stage-range-bound`'s upper end settles on the session-record.
  The persona's holds-office relation is unchanged (Layer 1 unaffected).
  The next session for the same persona begins fresh; the persona's accumulated state (per [`three-tier-memory`](../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/three-tier-memory.md)'s `session-bridging` tier) is the bridge.
5. **Post-stop.** The session-record persists as system state (the audit trail records every session that ever wore the persona); the running session is gone.

## Why this is just an instance, not a new primitive

PredGov's existing machinery — installation, capability propagation, succession, jurisdiction-base-change, residuation gates — fires at *Layer 1* (persona-holds-office) exactly as documented.
PredComp's [`agential-self-generation`](../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/concepts/agential-self-generation.md) commits to the persona being a substrate entity, which is what makes Layer 2 coherent.
The two layers compose without new substrate primitives — the cycle authors this concept just to name the *application* operationally so that the SessionStart hook handler, audit queries, and harness install commands can refer to it without each re-deriving the stacking pattern.

## Sub-sessions wear the same persona by default

A sub-session spawned by a parent session via the `Agent(...)
` tool is *also* a body-natural — typically wearing the same persona as the parent (the sub-Claude works on the parent's behalf within the parent's authority envelope).
The lineage cell `parent-session:` records which session spawned it.
If the sub-session is bound to a *different* persona (e.g., a specialized sub-agent persona with narrower scope), it follows the same wears-persona pattern with the narrower persona slug.
Phase 5 of `claude-as-pyfars-runtime` is the recursive application of this concept under [`closure-2-monad`](../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/closure-2-monad.md)'s lax-idempotence.
