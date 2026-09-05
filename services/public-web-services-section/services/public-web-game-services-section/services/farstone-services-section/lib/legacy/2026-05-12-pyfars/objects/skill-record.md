---
type: definition
class: system-entity
status: draft
realizes: [skill-record, skill]
depends-on: [predication-cell, jsonl-event-log, dispatch-closure-rule-system, eligibility-by-skills]
implementation: pyfars.governance.skill
---

# Skill record

The PyFARS-realization of upstream [skill-record](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/skill-record.md): a markdown file under `governance/skills/<verb-phrase>.md` whose frontmatter binds the skill's invocation surface, required capabilities, provided capability, and dispatch-eligibility predicates as system cells.

A skill record is *what an agent can do*, named at the F3 formality tier — deterministic, callable, with a stable invocation contract.
Skills are the third rung of the formality progression *observation → instinct → skill → tool*.

## Markdown shape

```markdown
---
slug: dispatching-substrate-workitem
type: skill-record
verb-phrase: dispatching a substrate workitem
provides-capability: dispatch.workitem
requires-capabilities: [substrate.read, substrate.write, dispatch.queue.write]
requires-skills: []
input-shape: {workitem: workitem-record-ref}
output-shape: {assignment: assignment-cell}
description: Two-sentence description per the M1 housekeeping discipline
---

# Skill body

The body is the SKILL itself — instructions an agent reads to perform the skill.
It is human-and-agent-readable prose: imperative, action-oriented, naming the
system operations and morphisms the skill composes.
```

## Cells

A skill record's frontmatter projects to:

- `(slug, type, "skill-record") = t`
- `(slug, verb-phrase, <gerund-phrase>) = t`
- `(slug, provides-capability, <cap>) = t` — what this skill makes available
- `(slug, requires-capabilities, <cap>) = t` — one cell per capability needed
- `(slug, requires-skills, <skill-slug>) = t` — composition: skills this skill calls
- `(slug, input-shape, <type-ref>) = t` and `(slug, output-shape, <type-ref>) = t`
- `(slug, description, <two-sentence-text>) = t`

## Read by dispatch

The dispatch closure-rule-system reads skill records every tick: - [`eligibility-by-skills`](eligibility-by-skills.md) checks that a workitem's `requires-skills:` is satisfied by some agent's `provides-skill:` set, where each agent's provided set is the union of its directly-listed skills plus the skills its offices' duties qualify it to invoke. - [`eligibility-by-capabilities`](eligibility-by-capabilities.md) checks that the skill's `requires-capabilities:` is held by the dispatchable.

## Authored mid-tick — picked up next tick

The discipline of "skill records authored mid-tick are dispatchable next tick" rests on three properties: 1. **Substrate scan is per-tick** — the projector framework re-loads the corpus into `pypredcalc.
PredicationStore` each tick (per [corpus-as-flatfile](corpus-as-flatfile.md)).
New files appearing between ticks are visible the next tick.
2. **Eligibility rules are substrate-authored** — they read whatever cells the projector emitted, with no hardcoded skill list.
3. **No restart needed** — the engine never caches the skill set across ticks; the cache is rebuilt each tick.

This is M5's `new-skill-records-dispatchable-next-tick` goal in formal terms.

## Discussion

The pyfars-side skill-record is *thinner* than the upstream `skill-record` because much of the upstream content (the skill's *body* — what to do) lives in the markdown's body rather than as structured frontmatter cells.
The substrate carries the *dispatch surface*; the skill's *content* is read by the agent at invocation time per the four-layer rule architecture (substrate / schema / behavior / surface — skill-body lives at behavior).

A skill is *not* a Python function.
Skills are markdown; the agent invoking the skill reads the markdown and executes its instructions.
This is why skill-records-authored-mid-tick are immediately dispatchable: there is no compilation step, no module-load step, no plugin-registration step — the skill is text the agent reads at invocation.
