"""``fars validate <path>`` — load, run all default rules, render report.

Default behavior:
  - Loads notes recursively from ``<path>`` (default: CWD).
  - Builds indexes, runs every applicable rule.
  - Writes the markdown report to stdout; per-code summary to stderr.
  - Exits 1 if any error-severity diagnostic was emitted, else 0.
"""
from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path

from fars.cli._runner import as_directory
from fars.render.diagnostics_report import render as render_report
from fars.render.json_dump import dump as render_json
from fars.closure.rule.compose_rules import run as run_rules
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="validate",
    description="Run every default rule and emit a markdown diagnostic report.",
    example="fars validate library/domains/humanities/.../predication-categories",
    notes="Exits 1 if any error-severity diagnostic was emitted.",
    output="Markdown report grouped by rule; --json emits a list of diagnostic dicts.",
    parameters=(
        Parameter(name="path", kind="positional", required=False, default=".",
                  description="directory to validate (default: CWD)"),
        Parameter(name="out", kind="flag", type=Path, default=None,
                  description="write report to this file instead of stdout"),
        Parameter(name="bib", kind="flag", type=Path, default=None,
                  description="explicit references.bib path (default: <root>/references.bib if present)"),
        Parameter(name="min_body_chars", kind="flag", type=int, default=200,
                  description="stub threshold (default: 200)"),
        Parameter(name="json", kind="store_true",
                  description="emit JSON instead of markdown"),
        Parameter(name="quiet", kind="store_true",
                  description="suppress per-code summary on stderr"),
    ),
)


def run(*, path: Path | str = ".", bib: Path | None = None,
        min_body_chars: int = 200) -> tuple | None:
    """Run every default rule and return ``(diagnostics, n_notes, root)``.
    ``None`` if path is not a directory."""
    rooted = as_directory(path, "fars validate")
    if rooted is None:
        return None
    from fars.substrate.store import Substrate
    ws = Substrate(root=rooted)
    diagnostics = list(ws.parse_diagnostics) + run_rules(
        ws.notes, root=ws.root, bib_path=bib, min_body_chars=min_body_chars,
    )
    return diagnostics, len(ws.notes), ws.root


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    result = run(path=args.path, bib=args.bib, min_body_chars=args.min_body_chars)
    if result is None:
        return 2
    diagnostics, n_notes, root = result

    if args.json:
        report = render_json(
            diagnostics,
            meta={"root": str(root), "n_notes": n_notes,
                  "n_diagnostics": len(diagnostics)},
        )
    else:
        report = render_report(
            diagnostics,
            title=f"fars validate — {root.name}",
            n_notes=n_notes, root=root,
        )
    if args.out is not None:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(report, encoding="utf-8")
    else:
        sys.stdout.write(report)

    if not args.quiet:
        codes = Counter(d.code for d in diagnostics)
        print(f"fars validate: {n_notes} notes, {len(diagnostics)} diagnostics",
              file=sys.stderr)
        for code, n in sorted(codes.items()):
            print(f"  {n} {code}", file=sys.stderr)
        if args.out is not None:
            print(f"  report: {args.out}", file=sys.stderr)

    has_errors = any(d.severity == "error" for d in diagnostics)
    return 1 if has_errors else 0


if __name__ == "__main__":
    sys.exit(main())
