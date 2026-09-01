---
name: "Authoring a substrate agent record"
description: "Creates an agent record under governance/agents/ that is read by the claude-code harness and projected into a Claude-Code-flavored agent file. Use when bringing a new agent into the substrate dispatch graph or when promoting a hand-shaped agent definition into substrate-tracked form."
---


## Requirements

- The agent's role and scope are nameable in one to three sentences.
- The agent's model tier is decided (`opus`, `sonnet`, `haiku`, or unspecified to inherit).
- Every skill listed in the record's `skills:` list already has a record under [`governance/skills/`](.) — referencing a skill that does not exist breaks the projection and the dispatch eligibility predicates.
- Every capability listed in `provides-capabilities:` and `requires-capabilities:` (if used) is named in the substrate's capability vocabulary.
- The polity-root carries an active records-root configured in `.pyfars/config.toml` (default `records/`); the agents directory `governance/agents/` exists or can be created.

## Steps

1. **Identify the slug.** Lowercase, hyphenated, role-shaped (e.g., `architect`, `code-reviewer`, `pyfars-developer`).
  The slug is the filename stem and the dispatch handle Claude Code uses after projection.
2. **Author frontmatter** at `governance/agents/<slug>.md`:
   - `title:` — human title (e.g., `"Architect"`).
   - `description:` — one to three sentences naming the role and the autonomous-vs-escalates boundary in plain prose.
     The [`harness:claude-code`](../../src/pyfars/harnesses/claude-code/_index.md) projection truncates this for the Claude-Code dispatcher; keep the load-bearing distinction in the first sentence.
   - `model:` — `opus` | `sonnet` | `haiku`.
     Omit to let the projection inherit the parent agent's model.
   - `role:` — high-level role family (e.g., `engineering`, `governance`, `theory`).
   - `reports-to:` — slug of the office or agent this agent reports to (e.g., `first-officer`).
   - `duties:` — list of duty slugs from [`governance/duties/`](../duties/) the agent carries.
   - `powers:` — list of power slugs the agent holds.
   - `privileges:` — list of privilege slugs (e.g., `read-all`).
   - `immunities:` — list of immunity slugs (e.g., `no-implementation-required`).
   - `skills:` — list of skill slugs from [`governance/skills/`](.) the agent can invoke.
     Every skill must exist as a record.
   - `provides-capabilities:` — list of capability slugs the agent provides; consumed by the dispatch closure-rule-system per [`eligibility-by-capabilities`](../../objects/eligibility-by-capabilities.md).
   - `charter-bindings:` — sub-record naming the rules and guidelines this agent is bound by; structures the agent's normative envelope.
   - `work-types:` — list of work-type slugs (e.g., `derivation`, `inquiry`, `implementation`) the agent is dispatchable against.
   - `jurisdiction:` — sub-record naming `read:` and `write:` paths the agent's powers extend over.
   - `autonomous:` — list of bullet points naming what the agent decides without escalation.
   - `escalates:` — list of bullet points naming what the agent must escalate up.
3. **Author the body.** One to three short paragraphs giving the agent's role-shape, the kind of work it does, and the autonomous-vs-escalate boundary.
  The body is what Claude-Code's dispatcher reads beyond frontmatter; keep it dense and operational, not biographical.
4. **Verify referenced skills and capabilities exist.** Every `skills:` entry must resolve to a `governance/skills/<slug>.md` file; every `provides-capabilities:` and `requires-capabilities:` entry must be a known capability slug.
  Authoring an agent that names a missing skill produces a broken projection (the agent file lands but the dispatch system rejects it).
5. **Cross-check the agent's office.** If a `governance/offices/<role>.md` record exists for this agent's office, ensure the office's `incumbents:` list (or equivalent) names this agent or its incumbent-record.
  The office binds standing; the agent record binds the dispatchable.

## Outcomes

- `governance/agents/<slug>.md` exists in the substrate.
  The next [`harness:claude-code`](../../src/pyfars/harnesses/claude-code/_index.md) install (or re-install) projects it as `.claude/agents/<slug>.md`, and the next dispatch tick can route work to it.
- The agent appears in the substrate's predication graph as `(slug, type, agent) = t` plus one cell per frontmatter field, picked up by closure rules per [`corpus-as-flatfile`](../../objects/corpus-as-flatfile.md).
- Skills the agent provides become reachable via `eligibility-by-skills`; capabilities the agent requires gate work-routing.

## Discipline notes

- **Substrate-purity ([decision](../decisions/substrate-purity.md)).** The substrate-side agent record is the source of truth.
  The `.claude/agents/<slug>.md` file is *projected* (per [`markdown-as-projection`](../decisions/markdown-as-projection.md)) — never hand-edit the projected file expecting it to round-trip.
- **One record per agent, one agent per record.** If an agent has multiple modes or roles, that is multiple agents (and multiple records).
  The dispatch graph cannot disambiguate within a single record.
- **Reference example.** See e.g. `governance/agents/architect.md` (or any sibling) for the full frontmatter shape in use.
- **The 561 polity carries 36 records of this shape** under `governance/agents/`.
  The harness reads them in place; no migration is required.
