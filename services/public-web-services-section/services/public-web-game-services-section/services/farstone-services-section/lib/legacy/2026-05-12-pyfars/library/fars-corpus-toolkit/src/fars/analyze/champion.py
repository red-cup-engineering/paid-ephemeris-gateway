"""Rank library term notes by combined quality signals.

    score = inbound × desc × sourced × cited × structured × rubric ×
            density × clean_outbound × no_slop

Each factor is in [0, 1] except ``inbound`` (the volume multiplier).
The product collapses to zero whenever any signal is absent — a strict
"good across every dimension" threshold.
"""
from __future__ import annotations

from fars.closure.valuation.citation_density import score as citation_density
from fars.closure.valuation.clean_outbound import score as clean_outbound
from fars.closure.valuation.density import score as density
from fars.closure.valuation.has_description import score as has_description
from fars.closure.valuation.inbound import score as inbound_count
from fars.closure.valuation.reference_count import score as reference_count
from fars.closure.valuation.rubric_coverage import score as rubric_coverage
from fars.closure.valuation.slop import score as slop
from fars.closure.valuation.structure import score as structure
from fars.substrate.flatfile import Flatfile


def find(notes: list[Flatfile], *,
         in_edges, out_edges, known_slugs,
         path_prefix: str | None = "library",
         path_segment_filter: str | None = "/terms/",
         limit: int = 15,
         ) -> list[dict]:
    out: list[dict] = []
    for n in notes:
        rel = str(n.path).replace("\\", "/")
        if path_prefix and not rel.startswith(path_prefix):
            continue
        if path_segment_filter and path_segment_filter not in rel:
            continue
        in_n = inbound_count(n.slug, in_edges)
        if in_n == 0:
            continue

        f_desc = 1.0 if has_description(n.fm) else 0.3
        f_sourced = min(1.0, reference_count(n.fm) / 5.0) or 0.2
        f_cited = min(1.0, citation_density(n.body) / 3.0) or 0.2
        f_struct = min(1.0, structure(n.body) / 5.0) or 0.2
        f_rubric = rubric_coverage(n.body) or 0.2
        f_density = density(n.body)
        f_clean = clean_outbound(n.slug, out_edges, known_slugs)
        f_slop = 0.6 if slop(n.body) else 1.0

        score = in_n * f_desc * f_sourced * f_cited * f_struct * f_rubric \
                * f_density * f_clean * f_slop

        out.append({
            "score": score,
            "slug": n.slug,
            "path": n.path,
            "inbound": in_n,
            "body_chars": len(n.body.strip()),
            "n_refs": reference_count(n.fm),
            "h2": structure(n.body),
            "rubric_hits": int(round(f_rubric * 6)),
            "has_description": has_description(n.fm),
            "clean_outbound": f_clean,
            "slop": slop(n.body),
        })
    out.sort(key=lambda r: -r["score"])
    return out[:limit]
