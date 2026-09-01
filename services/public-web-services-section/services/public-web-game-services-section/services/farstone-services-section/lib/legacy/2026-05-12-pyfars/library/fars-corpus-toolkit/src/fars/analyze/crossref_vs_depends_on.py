"""Per-note classification of body links vs. ``depends-on`` declarations.

For each note, partition the slugs cited in its (load-bearing) body into:

  - **direct**: in ``depends-on`` (not returned — those are correct).
  - **descendant**: a transitive dependent of the note (forward-pointer,
    dropped when ``drop_descendants`` is True).
  - **ancestor**: a transitive ancestor of the note via ``depends-on``
    (the dependency is implicit, so it's a soft signal).
  - **sibling**: reachable from one of the note's direct deps but neither
    ancestor nor descendant (often a "see also" cite — usually benign).
  - **unrelated**: none of the above. Highest signal: most likely a real
    missing ``depends-on`` entry or an arbitrary cross-reference.

Plus ``deps_not_in_body``: deps declared in frontmatter that the body
never actually cites — possibly stale or over-declared.
"""
from __future__ import annotations

from typing import Iterable, Mapping

from fars.operator.traversal.ancestors import ancestors
from fars.operator.traversal.descendants import descendants
from fars.closure.valuation.load_bearing_links import all_body_link_slugs, score as load_bearing
from fars.substrate.flatfile import Flatfile


def analyze(notes: Iterable[Flatfile], *,
            depends_on: Mapping[str, list[str]],
            dependents: Mapping[str, list[str]],
            section_filter: bool = True,
            drop_descendants: bool = True,
            drop_siblings: bool = True,
            drop_kinds: tuple[str, ...] = ("narrative", "question"),
            skip_citing_kinds: tuple[str, ...] = (
                "narrative", "question", "reference"),
            ) -> dict[str, dict]:
    notes = list(notes)
    by_slug = {n.slug for n in notes}
    out: dict[str, dict] = {}
    for n in notes:
        if skip_citing_kinds and n.kind in skip_citing_kinds:
            continue
        slug = n.slug
        body_slugs = (load_bearing if section_filter else all_body_link_slugs)(
            n.body, self_slug=slug,
        )
        body_slugs = {b for b in body_slugs if b in by_slug}
        if drop_kinds:
            kinds = {m.slug: m.kind for m in notes}
            body_slugs = {b for b in body_slugs if kinds.get(b) not in drop_kinds}

        deps = set(depends_on.get(slug, ())) & by_slug

        anc = ancestors(slug, depends_on) if drop_descendants else set()
        descs = descendants(slug, dependents) if drop_descendants else set()

        sibling_closure: set[str] = set()
        if drop_siblings:
            for d in deps:
                sibling_closure |= descendants(d, dependents)
            sibling_closure.discard(slug)
            sibling_closure -= descs

        through_ancestor: list[str] = []
        sibling: list[str] = []
        unrelated: list[str] = []

        for m in body_slugs - deps:
            if drop_descendants and m in descs:
                continue
            if m in anc:
                through_ancestor.append(m)
            elif drop_siblings and m in sibling_closure:
                sibling.append(m)
            else:
                unrelated.append(m)

        deps_not_in_body = sorted(deps - body_slugs)
        if unrelated or sibling or through_ancestor or deps_not_in_body:
            out[slug] = {
                "body_not_in_deps_unrelated": sorted(unrelated),
                "body_not_in_deps_sibling": sorted(sibling),
                "body_not_in_deps_ancestor": sorted(through_ancestor),
                "deps_not_in_body": deps_not_in_body,
                "body_not_in_deps": sorted(unrelated + sibling + through_ancestor),
            }
    return out
