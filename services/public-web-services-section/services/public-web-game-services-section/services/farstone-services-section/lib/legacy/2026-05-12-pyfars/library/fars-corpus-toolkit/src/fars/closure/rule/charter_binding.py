"""Operational charter binding: tasks satisfy the rules that bind them.

The RSC Quiescent charter (in ``operations/command/commands/rsc-quiescent/charter/``)
declares 5 rules and 7 guidelines, each with a ``checkable:`` block of
machine-checkable predicates:

  ``checkable.task-must-have: [field1, field2, ...]``
  ``checkable.task-must-trace-to: [<rel1>, <rel2>, ...]``
  ``checkable.applies-to: [task, dispatch-act, ...]``

This rule reads the charter, finds rules whose ``applies-to`` includes
``task``, and emits diagnostics for any task missing a required field
or trace.

The check is always-on: every task is checked against every rule whose
``applies-to`` includes ``task``. (Per-agent-binding checks happen at
dispatch time via ``fars dispatch`` — this rule is the corpus-wide
audit pass.)
"""
from __future__ import annotations

from typing import Iterator

from fars.substrate.types.diagnostic import Diagnostic
from fars.substrate.flatfile import Flatfile


def _is_charter_rule(n: Flatfile) -> bool:
    return n.fm.get("specialization") in ("rule", "guideline") \
        and "checkable" in n.fm \
        and n.fm.get("implements-charter") == "charter"


def _is_task(n: Flatfile) -> bool:
    return n.fm.get("specialization") == "task" or n.kind == "task"


def _list_of_strs(v) -> list[str]:
    if isinstance(v, list):
        return [s for s in v if isinstance(s, str)]
    if isinstance(v, str):
        return [v]
    return []


TRACE_KEYS = ("charter-bindings", "plan", "serves", "part-of", "contributes-to")


def check(notes: list[Flatfile]) -> Iterator[Diagnostic]:
    rules = [n for n in notes if _is_charter_rule(n)]
    if not rules:
        return

    task_rules = []
    for r in rules:
        applies_to = _list_of_strs((r.fm.get("checkable") or {}).get("applies-to"))
        if "task" in applies_to:
            task_rules.append(r)

    if not task_rules:
        return

    for n in notes:
        if not _is_task(n):
            continue
        for r in task_rules:
            check_block = r.fm.get("checkable") or {}

            # task-must-have: list of fields the task must populate
            for field in _list_of_strs(check_block.get("task-must-have")):
                v = n.fm.get(field)
                if v in (None, "", [], {}):
                    yield Diagnostic(
                        code="charter-binding-violation",
                        severity="error" if r.fm.get("specialization") == "rule" else "warning",
                        message=f"`{r.slug}` requires task to have `{field}`; missing on `{n.slug}`",
                        path=n.path,
                        extra={"rule": r.slug, "field": field, "task": n.slug},
                    )

            # task-must-trace-to: at least one trace relation must be present
            must_trace = _list_of_strs(check_block.get("task-must-trace-to"))
            if must_trace:
                if not any(n.fm.get(k) for k in TRACE_KEYS):
                    yield Diagnostic(
                        code="charter-binding-violation",
                        severity="error" if r.fm.get("specialization") == "rule" else "warning",
                        message=f"`{r.slug}` requires task to declare {TRACE_KEYS} (at least one); none on `{n.slug}`",
                        path=n.path,
                        extra={"rule": r.slug, "task": n.slug},
                    )
