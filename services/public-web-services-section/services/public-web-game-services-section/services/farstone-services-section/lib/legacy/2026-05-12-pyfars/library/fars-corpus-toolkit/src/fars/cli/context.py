"""``fars context <slug> [--depth N] [--budget chars]`` — bounded subgraph blob.

Walks ``depends-on`` outward from ``<slug>``, BFS-ordered, accumulating
each visited note's body verbatim. Stops when ``--depth`` or
``--budget`` is hit. Emits one concatenated markdown blob suitable for
LLM context injection.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fars.analyze.context_walk import walk
from fars.cli._runner import as_directory
from fars.render.context_blob import render as render_blob
from fars.render.json_dump import dump as render_json
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="context",
    description="Bounded-budget BFS subgraph from a slug for LLM context injection.",
    example="fars context bilattice --depth 2 --budget 8000",
    notes="Use this to load a slug + its dep neighborhood as one prompt blob.",
    output="Concatenated markdown of visited notes, or JSON with body text per note.",
    parameters=(
        Parameter(name="slug", kind="positional", required=True,
                  description="seed slug to walk from"),
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="depth", kind="flag", type=int, default=2,
                  description="max BFS depth (default: 2)"),
        Parameter(name="budget", kind="flag", type=int, default=8000,
                  description="char budget for cumulative bodies (default: 8000)"),
        Parameter(name="json", kind="store_true",
                  description="emit JSON instead of markdown"),
    ),
)


def run(slug: str, *, root: Path | str = ".",
        depth: int = 2, budget: int = 8000) -> list | None:
    """Walk the subgraph and return visited notes (in BFS order)."""
    rooted = as_directory(root, "fars context")
    if rooted is None:
        return None
    from fars.substrate.store import Substrate
    ws = Substrate(root=rooted)
    return walk(slug, by_slug=ws.by_slug, depends_on=ws.depends_on,
                depth=depth, budget_chars=budget)


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    visited = run(args.slug, root=args.root, depth=args.depth, budget=args.budget)
    if visited is None:
        return 2
    if not visited:
        print(f"fars context: no note matched seed slug {args.slug!r}",
              file=sys.stderr)
        return 1

    if args.json:
        payload = [{"slug": n.slug, "kind": n.kind,
                    "path": str(n.path).replace("\\", "/"),
                    "body": n.body} for n in visited]
        sys.stdout.write(render_json(payload, meta={
            "seed": args.slug, "n": len(visited),
            "body_chars": sum(len(n.body) for n in visited),
            "budget": args.budget,
        }))
    else:
        sys.stdout.write(render_blob(args.slug, visited, budget_chars=args.budget))
    print(f"fars context: {len(visited)} notes, "
          f"{sum(len(n.body) for n in visited):,} chars",
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
