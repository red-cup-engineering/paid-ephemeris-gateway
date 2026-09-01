"""What would change if a slug were edited or removed.

Returns the transitive descendants (notes that depend on the slug,
directly or via a chain), bucketed by status and kind. The buckets
surface where breakage would matter most: a proved-theorem dependent
is high-impact (its proof is at risk), a draft-status dependent is
already in flux.
"""
from __future__ import annotations

from collections import Counter
from typing import Mapping

from fars.operator.traversal.descendants import descendants
from fars.substrate.flatfile import Flatfile


def gather(slug: str, *,
           by_slug: Mapping[str, list[Flatfile]],
           dependents: Mapping[str, list[str]]) -> dict:
    desc_slugs = descendants(slug, dependents)
    desc_notes: list[Flatfile] = []
    for s in desc_slugs:
        for n in by_slug.get(s, []):
            desc_notes.append(n)
            break

    proved_theorems = [n for n in desc_notes
                       if n.kind in ("theorem", "lemma", "proposition", "corollary")
                       and n.fm.get("status") == "proved"]
    draft_theorems = [n for n in desc_notes
                      if n.kind in ("theorem", "lemma", "proposition", "corollary")
                      and n.fm.get("status") in ("draft", "sketch", "wip")]
    other_theorems = [n for n in desc_notes
                      if n.kind in ("theorem", "lemma", "proposition", "corollary")
                      and n not in proved_theorems and n not in draft_theorems]
    anchors = [n for n in desc_notes
               if n.kind in ("definition", "concept", "morphism")]
    examples = [n for n in desc_notes if n.kind == "example"]
    other = [n for n in desc_notes
             if n not in proved_theorems and n not in draft_theorems
             and n not in other_theorems and n not in anchors
             and n not in examples]

    return {
        "slug": slug,
        "n_descendants": len(desc_slugs),
        "by_kind": dict(Counter(n.kind for n in desc_notes).most_common()),
        "proved_theorems": [n.slug for n in proved_theorems],
        "draft_theorems": [(n.slug, n.fm.get("status") or "—") for n in draft_theorems],
        "other_theorems": [n.slug for n in other_theorems],
        "anchors": [n.slug for n in anchors],
        "examples": [n.slug for n in examples],
        "other": [n.slug for n in other],
    }
