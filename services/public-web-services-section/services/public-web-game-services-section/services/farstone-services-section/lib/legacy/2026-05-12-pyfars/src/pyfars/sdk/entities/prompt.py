"""Prompt — transient call-shape, not a system-resident entity.

The system carries Skills the polity authors (records under
``governance/skills/``) and Workitems (records under ``operations/``);
it does NOT carry prompts. A Prompt is the rendered text passed to a
:class:`pydantic_ai.Agent` at invocation time, plus enough source
provenance to make a good audit witness.

Per the upstream agent-skill-recipe-system distinction:
> A prompt asks an agent to behave in a certain way. A recipe specifies
> a bounded operation. The repository treats skills as system
> content, not as private prompt fragments.

So Prompt is small on purpose. It is NOT a Pydantic mirror of any
system-resident frontmatter. It is a value passed across a call boundary.
The Witness emitted at the end of an agent invocation includes the
prompt text in its details — that is the system-side persistence
path, not a separate Prompt record.
"""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class Prompt(BaseModel):
    """A rendered prompt + its source provenance.

    Fields:
      text: the rendered string handed to the agent.
      source: a slug or path identifying what the prompt was
        rendered from (typically a workitem slug, or
        ``"workitem:<slug>"``). Persisted in dispatch witnesses so the
        audit trail can recover what was being invoked.
      kind: a coarse label naming what shaped the prompt — e.g.
        ``"workitem"``, ``"channel-arrival"``, ``"intent"``,
        ``"ad-hoc"``. Subdivides ``source`` for filtering.
    """
    model_config = ConfigDict(frozen=True, extra="forbid")

    text: str
    source: str = ""
    kind: str = "workitem"

    def witness_detail(self) -> dict[str, str]:
        """Return the prompt's audit-detail form for inclusion in a
        Witness's ``details`` dict.

        Truncates the text at 4096 characters so witnesses stay small;
        full prompts can be replayed from the system by re-rendering
        the source workitem (the workitem record is the canonical
        persistent form).
        """
        return {
            "kind": self.kind,
            "source": self.source,
            "text_preview": self.text[:4096],
        }


def render_workitem_prompt(workitem) -> "Prompt":
    """Render a Workitem to a Prompt via :meth:`Workitem.to_prompt`.

    Sugar for the common dispatch path: hand a Workitem in, get back
    a Prompt with provenance set.
    """
    text = workitem.to_prompt()
    return Prompt(
        text=text,
        source=workitem.slug,
        kind="workitem",
    )


__all__ = ["Prompt", "render_workitem_prompt"]
