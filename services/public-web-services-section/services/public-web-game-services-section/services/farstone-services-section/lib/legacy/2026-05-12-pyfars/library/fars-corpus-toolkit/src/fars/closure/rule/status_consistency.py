"""A ``proved`` note must not depend on a ``draft``/``sketch``/``wip`` note.

Otherwise the proved claim is conditional on unproved work — a hidden
gap in the proof DAG.
"""
from __future__ import annotations

from typing import Iterator, Mapping

from fars.convention import UNPROVED
from fars.substrate.types.diagnostic import Diagnostic
from fars.substrate.flatfile import Flatfile


def check(notes: list[Flatfile],
          by_slug: Mapping[str, list[Flatfile]]) -> Iterator[Diagnostic]:
    for n in notes:
        if n.fm.get("status") != "proved":
            continue
        for dep in (n.fm.get("depends-on") or []):
            if not isinstance(dep, str):
                continue
            dep_notes = by_slug.get(dep, [])
            if not dep_notes:
                continue
            dep_status = dep_notes[0].fm.get("status")
            if dep_status in UNPROVED:
                yield Diagnostic(
                    code="status-inconsistency",
                    severity="error",
                    message=f"`{n.slug}` (proved) depends on `{dep}` ({dep_status})",
                    path=n.path,
                    extra={"slug": n.slug, "dep": dep, "dep_status": dep_status},
                )
