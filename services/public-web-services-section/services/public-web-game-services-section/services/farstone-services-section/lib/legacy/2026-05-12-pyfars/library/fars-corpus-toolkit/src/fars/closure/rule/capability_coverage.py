"""Operational dispatch coverage: every required capability has a provider.

A *capability* is the categorical signature of action domain an agent can
act on (writing, review, code-edit, etc.) — distinct from work-type and
skill. The library defines the term and dictionary at:

  ``library/domains/humanities/domains/sociology/domains/work/terms/capability.md``
  ``library/domains/humanities/domains/sociology/domains/work/texts/capability-dictionary.md``

Operational records use this vocabulary on agents and tasks:

  - An *agent* file declares ``provides-capabilities: [...]``.
  - A *task* file declares ``requires-capabilities: [...]``.
  - A *skill* file declares ``enables-capabilities: [...]``.

This rule emits a diagnostic when a task's required capability has no
agent provider — that means the task is undispatchable as written.
"""
from __future__ import annotations

from collections import defaultdict
from typing import Iterator

from fars.substrate.types.diagnostic import Diagnostic
from fars.substrate.flatfile import Flatfile


def _is_agent(n: Flatfile) -> bool:
    """Heuristic: an agent file has both a model and a provides-capabilities field."""
    return bool(n.fm.get("model")) and "provides-capabilities" in n.fm


def _is_task(n: Flatfile) -> bool:
    return n.fm.get("specialization") == "task" or n.kind == "task"


def _is_skill(n: Flatfile) -> bool:
    return "enables-capabilities" in n.fm


def _list_of_strs(v) -> list[str]:
    if isinstance(v, list):
        return [s for s in v if isinstance(s, str)]
    if isinstance(v, str):
        return [v]
    return []


def check(notes: list[Flatfile]) -> Iterator[Diagnostic]:
    provided: set[str] = set()
    required_by: dict[str, list[Flatfile]] = defaultdict(list)
    enabled: set[str] = set()

    for n in notes:
        if _is_agent(n):
            for c in _list_of_strs(n.fm.get("provides-capabilities")):
                provided.add(c)
        if _is_task(n):
            for c in _list_of_strs(n.fm.get("requires-capabilities")):
                required_by[c].append(n)
        if _is_skill(n):
            for c in _list_of_strs(n.fm.get("enables-capabilities")):
                enabled.add(c)

    if not provided and not required_by:
        # Neither side present in this corpus subtree — rule is irrelevant.
        return

    # Capabilities required but never provided
    for cap in sorted(required_by):
        if cap not in provided:
            for task in required_by[cap]:
                yield Diagnostic(
                    code="capability-uncovered",
                    severity="error",
                    message=f"task requires capability `{cap}` but no agent provides it",
                    path=task.path,
                    extra={"slug": task.slug, "capability": cap},
                )

    # Capabilities provided but no skill enables — soft warning (the agent
    # has the capability but no operational primitive backs it; the agent
    # may still be functional, but the dispatch graph has a hole)
    declared_caps = provided | set(required_by)
    for cap in sorted(declared_caps - enabled):
        yield Diagnostic(
            code="capability-no-enabling-skill",
            severity="warning",
            message=f"capability `{cap}` is declared by agents/tasks but no skill enables it",
            extra={"capability": cap},
        )
