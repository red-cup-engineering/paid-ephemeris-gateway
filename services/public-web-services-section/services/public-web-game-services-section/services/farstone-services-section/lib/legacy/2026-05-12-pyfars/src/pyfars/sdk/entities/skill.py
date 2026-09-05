"""Skill records — invocable system-resident procedures.

Per FARS ``objects/skill-record.md``: a Skill is an invocable procedure
that an agent can run at a scope, with declared preconditions, body,
postconditions, and witness format. The system's *skill registry*
IS the set of Skill records — not a privileged compiled list.

Skills carry a *formality* declaration (F0–F3 per
``concepts/formality-progression.md``) that tells the runtime what
shape of body to expect and what cost-tier to run it at:

- **F3** — body is a closure-rule reference; invocation runs the rule.
- **F2** — body is a deterministic tool reference (script, function,
  database query); invocation runs the tool.
- **Composed** — body is a runbook reference; invocation runs the
  runbook.
- **F1** — body is prose specification; LLM reads-and-summarizes.
- **F0** — body is unset / pure prose; not yet runnable.

The class accepts both the live frontmatter shape (kind, work-type,
required-capabilities, scope-bound, enables-capabilities) and the
forward-looking spec shape (preconditions, postconditions,
witness-format, formality).
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


SkillKind = Literal[
    "query",
    "governance",
    "mutation",
    "analysis",
    "learning",
    "meta",
    "composed",
]
"""Maps onto the seven-channel decomposition: a skill of kind
``mutation`` writes to the mutation channel; ``query`` to the query
channel; etc. ``meta`` and ``composed`` are skills that operate on
other skills."""


Formality = Literal["F0", "F1", "F2", "F3"]
"""Formality progression per ``concepts/formality-progression.md``.

- ``F0`` — unset / prose only; not runnable.
- ``F1`` — prose specification; LLM-flavored body.
- ``F2`` — deterministic tool reference.
- ``F3`` — closure-rule reference; fully formal."""


class Skill(BaseModel):
    """One skill record."""
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    slug: str

    # --- Identity & classification ----------------------------------

    title: str = ""
    name: str = ""
    description: str = ""

    kind: SkillKind | None = None
    work_type: str | None = Field(default=None, alias="work-type")
    formality: Formality | None = None

    status: str = "draft"

    # --- Preconditions / postconditions -----------------------------

    preconditions: list[str] = Field(default_factory=list)
    postconditions: list[str] = Field(default_factory=list)

    # --- Body --------------------------------------------------------

    body_kind: Literal[
        "closure-rule", "tool", "runbook", "prose", "unset"
    ] = Field(default="unset", alias="body-kind")
    """How the body is realized: closure-rule reference (F3), tool
    reference (F2), runbook reference (composed), prose (F1), or
    unset (F0)."""

    body_reference: str | None = Field(default=None, alias="body-reference")
    """Slug or path to the closure-rule / tool / runbook record this
    skill's body resolves to. None for prose-only bodies."""

    body: str = ""
    """Markdown body following the frontmatter — typically the
    skill's prose specification or operational instructions for an
    LLM-flavored invocation."""

    # --- Witness format ---------------------------------------------

    witness_format: str | None = Field(default=None, alias="witness-format")
    channel: str | None = None
    """Channel the skill's primary event lands on. Defaults from
    ``kind`` (kind=query → channel=query, etc.)."""

    # --- Invocation policy ------------------------------------------

    required_capabilities: list[str] = Field(
        default_factory=list, alias="required-capabilities",
    )
    scope_bound: list[str] = Field(default_factory=list, alias="scope-bound")
    enables_capabilities: list[str] = Field(
        default_factory=list, alias="enables-capabilities",
    )

    # --- Settlement-path provenance and promotion gates -------------

    derived_from: list[str] = Field(
        default_factory=list, alias="derived-from",
    )
    """Canonical hashes of source records this skill was promoted
    from (per the settlement-path observation→instinct→skill chain).
    Empty for hand-authored skills not produced via the promote
    operator."""

    body_reducible: bool = Field(default=False, alias="body-reducible")
    """F2→F3 promotion gate: True iff the body has no inference-bearing
    operations remaining and can be demoted to a tool. The promote
    operator refuses skill→tool when this is False."""

    per_invocation_cost: float | None = Field(
        default=None, alias="per-invocation-cost",
    )
    """Per-invocation cost in the layer-cost-monotonicity discipline.
    Used by the promote operator's strict-cost-reduction gate. None for
    hand-authored skills with no measured cost."""

    # --- Skill-pack layout (SKILL.md-in-subdir convention) ----------

    pack: str | None = None
    """Parent pack name when this skill lives in the SKILL.md-in-subdir
    layout (``<root>/<pack>/<slug>/SKILL.md`` plus
    ``<root>/<pack>/<slug>/scripts/<slug>.sh``). None for flat-file
    skills under ``governance/skills/<slug>.md``."""

    script_path: Path | None = Field(default=None, exclude=True)
    """Absolute path to the companion executable for skill-pack-layout
    skills. None for skills with no on-disk script (the runtime resolves
    body via ``body_reference`` instead)."""

    # --- Provenance --------------------------------------------------


    # --- Helpers -----------------------------------------------------

    @property
    def display_name(self) -> str:
        return self.name or self.title or self.slug

    @property
    def effective_channel(self) -> str | None:
        """Channel the skill emits to. Defaults from kind when not set."""
        if self.channel:
            return self.channel
        if self.kind in {
            "query", "mutation", "analysis", "learning", "governance",
        }:
            return self.kind
        return None

    def is_runnable(self) -> bool:
        """True iff body_kind is non-unset AND body_reference is set
        (or body_kind is prose, which doesn't need a reference)."""
        if self.body_kind == "unset":
            return False
        if self.body_kind == "prose":
            return bool(self.body.strip())
        return self.body_reference is not None


__all__ = [
    "Formality",
    "Skill",
    "SkillKind",
]
