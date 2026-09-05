---
type: question
status: open
explores: [skill, body, body-kind, body-reference, formality-progression, promote-operator]
---

# What is the canonical shape of a `Skill.body` — single string, list of steps, or runtime-parsed reference?

The pre-decruft `runtime/promote.py:SkillRecord` carried `body: tuple[str, ...]
` (an ordered list of steps the skill performs).
The pydantic `entities/skill.py:Skill` carries `body: str` (the single Markdown body content following the frontmatter).
When the promote operator was migrated to use the pydantic Skill, the body shape collapsed from "tuple of steps" to "single string."

This is a real vocabulary question, not just a typing detail:

- **Single string `body: str`** matches frontmatter convention — what's after the YAML divider in the markdown record.
  It's how every other substrate-resident record describes its body content.
- **List-of-steps `body: list[str]`** matches the dataclass's encoding — a skill is a procedure made of discrete steps; the list shape makes step-by-step iteration trivial; the F2→F3 (skill→tool) demotion was structurally a "verify each step is reducible" walk.
- **Reference-only `body_reference: str`** is what runnable skills actually use — the body is a pointer to a closure rule, a function, or a runbook record.
  Pydantic Skill already has `body_reference: str | None` for this; `body: str` is then the prose explanation, not the executable.

These three shapes encode different relationships between a Skill and what it does.
Holding them all simultaneously (as the pydantic Skill currently does — `body: str` AND `body_reference: str | None` AND `body_kind: Literal[...]
`) is a smell: there are too many fields competing to express one thing.

## What is known

- The pydantic Skill already carries `body_kind: Literal["unset", "prose", "closure-rule", "tool", "runbook", "composed"]`, `body_reference: str | None`, AND `body: str` — three fields encoding "what is this skill's body."
- The `is_runnable()` method on Skill demonstrates the resulting branching: `body_kind` determines whether `body_reference` or `body.strip()` is the operative content.
- The promote operator post-migration treats `body` as a string and passes it through `instinct.suggested_response` (a single string) → `Skill.body` (single string) → `Tool.body` (single string).
- AOP `skill-record` describes a skill as having "body operations" (plural) — implying a multi-step structure.
  But the FARS substrate convention is one body per record (the markdown content after frontmatter).

## What would settle it

A claim that selects one of:

1. **Body-as-prose-with-reference**: `body: str` is the prose specification (what humans read, what an LLM is given for F1-flavored execution); `body_reference: str` is the executable pointer for F2/F3 skills.
  The promote operator's "body steps" become a property of the *referenced* runbook/rule, not of the Skill record itself.
  Drop `body_kind` (derive it from whether `body_reference` is set).

2. **Body-as-step-list**: `body: list[str]` is canonical, each entry is a step.
  Frontmatter loaders parse multi-line bodies via a discipline (each non-empty line is a step, or step delimiters, or YAML list in frontmatter).
  Drop `body_reference` (steps that delegate to other skills cite them inline).
  Drop `body_kind` (derive from step shape).

3. **Body-is-the-frontmatter-body-content** (the "minimal" reading): `body: str` matches the substrate convention exactly.
  Steps, references, and execution shape are all *inside* the body or in separate fields the operator reads.
  Skill carries no opinion about what "body" means structurally — the runtime parser inspects `body_kind` to decide.

The decision interacts with the [identifying-entities-by-predication-shape](identifying-entities-by-predication-shape.md) direction: under structural-fitness, "this body satisfies the runnable-skill predication-shape" is itself a closure rule, and the body's encoding is whatever the rule consumes.

## Where the answer would live

A claim in `claims/` named something like `skill-body-canonical-shape`, plus possibly an object record in `objects/` if a new structural type is needed.
The claim should:

- Name which of the three shapes (or a hybrid) is canonical.
- Settle whether `body_kind`, `body_reference`, and `body` are three distinct fields or whether two collapse into the third.
- State the migration path for existing skill records under `governance/skills/` (which currently use the prose+reference combo).

## Provenance

Filed 2026-05-10 during the settlement-path entity-migration pass that consolidated `runtime/promote.py`'s six dataclass record types into pydantic entities under `entities/`.
The dataclass encoded body as `tuple[str, ...]
` (steps); the pydantic encoding is `str` (prose).
The migration preserved the pydantic shape and routed the question here for proper resolution.
