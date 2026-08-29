"""Classify a question's ``explores:`` entities by their firmness.

Returns a dict with four buckets:
  - ``firm``:    list of slugs that are proved theorems or characterized anchors.
  - ``sketch``:  list of ``(slug, status)`` tuples for theorem-likes that aren't proved.
  - ``loose``:   list of slugs for anchors with no characterizing theorems.
  - ``missing``: list of slugs for explored entities with no note in the fars.
"""
from __future__ import annotations

from typing import Iterable, Mapping

from fars.closure.valuation.firmness import score as firmness
from fars.substrate.predication import Predication
from fars.substrate.flatfile import Flatfile


def find(question: Flatfile, *,
         by_slug: Mapping[str, list[Flatfile]],
         in_edges: Mapping[str, Iterable[Predication]],
         ) -> dict[str, list]:
    out: dict[str, list] = {"firm": [], "sketch": [], "loose": [], "missing": []}
    for ent in (question.fm.get("explores") or []):
        if not isinstance(ent, str):
            continue
        f = firmness(ent, by_slug=by_slug, in_edges=in_edges)
        if f == "missing":
            out["missing"].append(ent)
        elif f == "sketch":
            cand = by_slug.get(ent, [])
            status = (cand[0].fm.get("status") if cand else None) or "open"
            out["sketch"].append((ent, status))
        elif f == "loose":
            out["loose"].append(ent)
        else:
            out["firm"].append(ent)
    return out
