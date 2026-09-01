"""``fars stats [--root R] [--json]`` — one-shot corpus health overview.

Counts notes by kind/dir, edge density, broken links/citations, orphans,
stubs, body length distribution, and the top 10 load-bearing slugs.

Spec-driven verb: argparse, MCP tool schema, api wrapper, and help all
read from ``SPEC``. ``run`` is the typed entry; ``main`` is the argparse
wrapper.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fars.analyze.stats import gather
from fars.cli._runner import as_directory
from fars.render.json_dump import dump as render_json
from fars.render.stats_report import render as render_report
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="stats",
    description="One-shot corpus health overview (counts, edges, broken links, top load-bearing).",
    example="fars stats --json",
    output="Markdown table dashboard, or JSON object with the same shape under `--json`.",
    parameters=(
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r",
                  description="corpus root (default: CWD)"),
        Parameter(name="json", kind="store_true",
                  description="emit JSON instead of markdown"),
    ),
)


def run(*, root: Path | str = ".", json: bool = False) -> dict | None:
    """Gather and emit stats. Returns the stats dict; emission to stdout
    is the caller's job (``main`` does it for the CLI)."""
    rooted = as_directory(root, "fars stats")
    if rooted is None:
        return None
    from fars.substrate.store import Substrate
    ws = Substrate(root=rooted)
    return gather(ws.notes, root=ws.root)


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    stats_dict = run(root=args.root, json=args.json)
    if stats_dict is None:
        return 2
    if args.json:
        sys.stdout.write(render_json(stats_dict, meta={"root": str(Path(args.root).resolve())}))
    else:
        sys.stdout.write(render_report(stats_dict))
    return 0


if __name__ == "__main__":
    sys.exit(main())
