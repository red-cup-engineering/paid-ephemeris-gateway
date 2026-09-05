"""``fars plan <path>`` — research-demand views over the frontmatter graph.

Question readiness, enablement frontier, demand clusters, realization
gaps, split candidates, load-bearing pillars, isolated morphisms.

Each section is a flag for the human to consider; the graph proposes,
the mathematician disposes.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fars.analyze.demand_clusters import find as find_demand_clusters
from fars.analyze.enablement_frontier import find as find_frontier
from fars.analyze.isolated_morphisms import find as find_isolated_morphisms
from fars.analyze.load_bearing_pillars import find as find_pillars
from fars.analyze.loose_concepts import find as find_loose
from fars.analyze.question_clusters import find as find_qclusters
from fars.analyze.question_readiness_view import view as view_readiness
from fars.analyze.realization_gaps import find as find_realization_gaps
from fars.analyze.split_candidates import find as find_splits
from fars.analyze.unnamed_ancestor_candidates import find as find_ancestors
from fars.cli._runner import as_directory
from fars.render.json_dump import dump as render_json
from fars.render.plan_report import render as render_report
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="plan",
    description="Research-demand views: question readiness, enablement frontier, realization gaps.",
    example="fars plan library/domains/humanities/.../predication-categories",
    notes="Writes <root>/research-program.md by default.",
    output="Markdown report with tiered question readiness + frontier + demand clusters; --json mirrors the data.",
    parameters=(
        Parameter(name="path", kind="positional", required=False, default=".",
                  description="directory to plan (default: CWD)"),
        Parameter(name="out", kind="flag", type=Path, default=None,
                  description="report path (default: <root>/research-program.md)"),
        Parameter(name="json", kind="store_true",
                  description="emit JSON instead of markdown"),
    ),
)


def run(*, path: Path | str = ".") -> dict | None:
    """Compute every plan view. ``None`` if path is invalid."""
    rooted = as_directory(path, "fars plan")
    if rooted is None:
        return None
    from fars.substrate.store import Substrate
    ws = Substrate(root=rooted)
    primitives, loose = find_loose(ws.notes, by_slug=ws.by_slug,
                                   in_edges=ws.in_edges)
    return {
        "ws": ws,
        "readiness": view_readiness(ws.notes, by_slug=ws.by_slug,
                                    in_edges=ws.in_edges),
        "qclusters": find_qclusters(ws.notes, by_slug=ws.by_slug,
                                    in_edges=ws.in_edges),
        "frontier": find_frontier(ws.notes, by_slug=ws.by_slug,
                                  in_edges=ws.in_edges),
        "clusters": find_demand_clusters(ws.notes, by_slug=ws.by_slug,
                                         in_edges=ws.in_edges),
        "realization": find_realization_gaps(ws.notes),
        "splits": find_splits(ws.notes),
        "ancestors_view": find_ancestors(ws.notes),
        "primitives": primitives,
        "loose": loose,
        "pillars": find_pillars(ws.notes, by_slug=ws.by_slug,
                                in_edges=ws.in_edges),
        "isolated": find_isolated_morphisms(ws.notes, by_slug=ws.by_slug,
                                            in_edges=ws.in_edges),
    }


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    r = run(path=args.path)
    if r is None:
        return 2
    ws = r["ws"]

    if args.json:
        payload = {
            "n_notes": len(ws.notes),
            "readiness": {tier: [(slug, blockers) for slug, blockers in items]
                          for tier, items in r["readiness"].items()},
            "question_clusters": [
                {"questions": sorted(c["questions"]),
                 "shared_blockers": [(b, sorted(qs)) for b, qs in c["shared_blockers"]]}
                for c in r["qclusters"]],
            "enablement_frontier": r["frontier"],
            "demand_clusters": [
                {"entity": e, "questions": sorted(qs), "firmness": f, "leverage": lev}
                for e, qs, f, lev in r["clusters"]],
            "realization_gaps": r["realization"],
            "split_candidates": r["splits"],
            "primitives": r["primitives"],
            "loose_concepts": r["loose"],
            "load_bearing_pillars": r["pillars"],
            "isolated_morphisms": r["isolated"],
        }
        sys.stdout.write(render_json(payload, meta={"root": str(ws.root)}))
        return 0

    report = render_report(
        ws.notes,
        by_slug=ws.by_slug,
        in_edges=ws.in_edges,
        readiness=r["readiness"],
        qclusters=r["qclusters"],
        frontier=r["frontier"],
        clusters=r["clusters"],
        realization=r["realization"],
        splits=r["splits"],
        ancestors_view=r["ancestors_view"],
        primitives=r["primitives"],
        loose=r["loose"],
        pillars=r["pillars"],
        isolated=r["isolated"],
    )
    out_path = args.out or (ws.root / "research-program.md")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(report, encoding="utf-8")

    counts = {t: len(v) for t, v in r["readiness"].items()}
    print(f"fars plan: {len(ws.notes)} notes — "
          f"{counts['answerable']} answerable / "
          f"{counts['blocked']} blocked / "
          f"{counts['needs-construction']} needs-construction / "
          f"{counts['unanchored']} unanchored",
          file=sys.stderr)
    print(f"  report: {out_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
