"""Gather corpus-wide stats for the ``stats`` overview report.

Returns a dict with keys:

  - ``n_notes``, ``n_kinds``, ``n_domains``
  - ``by_kind`` — {kind: count}
  - ``by_dir`` — {dir: count}, top 10
  - ``edges`` — {total, fm, body, depends_on, broken_internal}
  - ``health`` — {orphans, stubs, wip_theorems, broken_links, broken_citations}
  - ``body_chars`` — {avg, median, total}
  - ``top_load_bearing`` — [(slug, descendant_count), ...] top 10
"""
from __future__ import annotations

import statistics
from collections import Counter
from pathlib import Path
from typing import Iterable

from fars.operator.traversal.descendant_counts import counts as descendant_counts
from fars.substrate.index.by_slug import build as build_by_slug
from fars.substrate.index.dependents import build as build_dependents
from fars.substrate.index.depends_on import build as build_depends_on
from fars.substrate.index.edges import build as build_edges
from fars.substrate.load.bib import load as load_bib
from fars.substrate.parse._slug_target import slug_of
from fars.substrate.parse.citations import parse as parse_citations
from fars.substrate.parse.markdown_links import parse as parse_links
from fars.closure.valuation.body_chars import score as body_chars
from fars.substrate.flatfile import Flatfile


def gather(notes: Iterable[Flatfile], *, root: Path | None = None) -> dict:
    notes = list(notes)
    by_slug = build_by_slug(notes)
    edges = build_edges(notes)
    fm_edges = [e for e in edges if e.source == "fm"]
    body_edges = [e for e in edges if e.source == "body"]
    deps = build_depends_on(edges)
    revdeps = build_dependents(edges)

    known = set(by_slug.keys())
    broken_internal = sum(1 for e in edges if e.dst not in known)

    bib_keys: set[str] = set()
    if root is not None:
        bib_path = root / "references.bib"
        if bib_path.is_file():
            bib_keys = {b.key for b in load_bib(bib_path)}

    broken_links = 0
    broken_cites = 0
    for n in notes:
        for link in parse_links(n.body):
            if link.kind in ("relative", "absolute"):
                slug = slug_of(link.target_raw, require_md=True)
                if slug is None or slug not in known:
                    broken_links += 1
        if bib_keys:
            for c in parse_citations(n.body):
                if c.key not in bib_keys:
                    broken_cites += 1

    char_counts = [body_chars(n.body) for n in notes]
    body_total = sum(char_counts)
    body_avg = body_total // len(char_counts) if char_counts else 0
    body_median = int(statistics.median(char_counts)) if char_counts else 0

    desc_counts = descendant_counts(by_slug.keys(), revdeps)
    top_load = sorted(desc_counts.items(), key=lambda x: -x[1])[:10]

    referenced: set[str] = set()
    for n in notes:
        for k in ("depends-on", "introduces", "recaps", "discusses",
                 "instantiates", "see-also", "realizes", "closes",
                 "chapters", "explores"):
            v = n.fm.get(k)
            if isinstance(v, list):
                referenced.update(s for s in v if isinstance(s, str))
            elif isinstance(v, str):
                referenced.add(v)
        for link in parse_links(n.body):
            if link.kind in ("relative", "absolute"):
                tgt = slug_of(link.target_raw, require_md=True)
                if tgt:
                    referenced.add(tgt)
    orphans = sum(1 for n in notes
                  if n.slug not in referenced and n.dir != "references"
                  and not (n.kind == "narrative" and any(n.fm.get(k) for k in
                                                         ("introduces", "recaps", "discusses", "chapters")))
                  and not (n.kind == "question" and n.fm.get("explores")))
    stubs = sum(1 for n in notes if n.kind != "narrative" and body_chars(n.body) < 200)
    wip = sum(1 for n in notes
              if n.kind in ("theorem", "lemma", "proposition", "corollary", "conjecture")
              and n.fm.get("status") in ("draft", "sketch", "wip"))

    return {
        "n_notes": len(notes),
        "n_kinds": len(set(n.kind for n in notes)),
        "n_domains": len(set(n.dir for n in notes)),
        "by_kind": dict(Counter(n.kind for n in notes).most_common()),
        "by_dir": dict(Counter(n.dir for n in notes).most_common(10)),
        "edges": {
            "total": len(edges),
            "fm": len(fm_edges),
            "body": len(body_edges),
            "depends_on": sum(len(v) for v in deps.values()),
            "broken_internal": broken_internal,
        },
        "health": {
            "orphans": orphans,
            "stubs": stubs,
            "wip_theorems": wip,
            "broken_links": broken_links,
            "broken_citations": broken_cites,
        },
        "body_chars": {
            "avg": body_avg,
            "median": body_median,
            "total": body_total,
        },
        "top_load_bearing": [(s, c) for s, c in top_load if c > 0],
    }
