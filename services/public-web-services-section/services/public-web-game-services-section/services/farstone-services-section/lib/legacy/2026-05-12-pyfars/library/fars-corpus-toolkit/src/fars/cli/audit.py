"""``fars audit <path>`` — structural-risk analysis of the depends-on graph.

Reports unrelated body links, top load-bearing notes, foundation-distance
distribution. Default output: ``<root>/dependency-audit.md``.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fars.analyze.crossref_vs_depends_on import analyze
from fars.cli._runner import as_directory
from fars.operator.traversal.descendant_counts import counts as descendant_counts_fn
from fars.operator.traversal.foundation_distance import distance as foundation_distance
from fars.render.audit_report import render as render_report
from fars.render.json_dump import dump as render_json
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="audit",
    description="Structural-risk analysis of the depends-on graph (load-bearing slugs, body-vs-deps mismatches).",
    example="fars audit library/domains/humanities/.../predication-categories",
    notes="Writes <root>/dependency-audit.md by default.",
    output="Markdown report with unrelated-pair signals, top load-bearing slugs, foundation distance.",
    parameters=(
        Parameter(name="path", kind="positional", required=False, default=".",
                  description="directory to audit (default: CWD)"),
        Parameter(name="out", kind="flag", type=Path, default=None,
                  description="report path (default: <root>/dependency-audit.md)"),
        Parameter(name="json", kind="store_true",
                  description="emit JSON instead of markdown (stdout, ignores --out)"),
    ),
)


def run(*, path: Path | str = ".") -> dict | None:
    """Compute the audit data structure. ``None`` if path is invalid."""
    rooted = as_directory(path, "fars audit")
    if rooted is None:
        return None
    from fars.substrate.store import Substrate
    ws = Substrate(root=rooted)
    slugs = [n.slug for n in ws.notes]
    return {
        "ws": ws,
        "crossref": analyze(
            ws.notes, depends_on=ws.depends_on, dependents=ws.dependents,
            section_filter=True, drop_descendants=True, drop_siblings=True,
        ),
        "crossref_aggressive": analyze(
            ws.notes, depends_on=ws.depends_on, dependents=ws.dependents,
            section_filter=False, drop_descendants=False, drop_siblings=False,
        ),
        "descendant_counts": descendant_counts_fn(slugs, ws.dependents),
        "foundation_distance": foundation_distance(
            slugs, ws.depends_on, ws.dependents),
    }


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    result = run(path=args.path)
    if result is None:
        return 2
    ws = result["ws"]
    crossref = result["crossref"]
    crossref_aggressive = result["crossref_aggressive"]
    desc_counts = result["descendant_counts"]
    fdist = result["foundation_distance"]

    if args.json:
        payload = {
            "n_notes": len(ws.notes),
            "crossref": crossref,
            "crossref_aggressive": crossref_aggressive,
            "descendant_counts": dict(sorted(desc_counts.items(),
                                             key=lambda x: -x[1])[:50]),
            "foundation_distance": dict(sorted(fdist.items(),
                                               key=lambda x: -x[1])[:50]),
        }
        sys.stdout.write(render_json(payload, meta={"root": str(ws.root)}))
        return 0

    report = render_report(
        ws.notes,
        crossref=crossref,
        crossref_aggressive=crossref_aggressive,
        descendant_counts=desc_counts,
        foundation=fdist,
        depends_on=ws.depends_on,
    )
    out_path = args.out or (ws.root / "dependency-audit.md")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(report, encoding="utf-8")

    unrelated = sum(len(v["body_not_in_deps_unrelated"]) for v in crossref.values())
    print(f"fars audit: {len(ws.notes)} notes, {unrelated} unrelated-pair signals",
          file=sys.stderr)
    print(f"  report: {out_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
