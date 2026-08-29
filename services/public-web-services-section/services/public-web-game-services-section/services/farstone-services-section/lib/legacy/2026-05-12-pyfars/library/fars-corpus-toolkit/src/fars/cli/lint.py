"""``fars lint [--fix]`` — auto-fixable corpus suggestions.

Default: list every suggestion grouped by code, no changes. Pass
``--fix`` to apply the auto-fixers (only suggestions whose ``apply``
callable is non-None will run; those without a fix are listed verbatim).
"""
from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path

from fars.cli._runner import as_directory
from fars.closure.lint.compose_lint import run as run_lint
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="lint",
    description="List or auto-fix common corpus problems (missing depends-on, empty description, key casing, ...).",
    example="fars lint --fix --code missing-trailing-newline",
    notes="Without --fix, just lists. With --code X, runs only that linter.",
    output="Markdown sections grouped by lint code; --fix mutates files in place.",
    parameters=(
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="fix", kind="store_true",
                  description="apply auto-fixes; otherwise just list"),
        Parameter(name="code", kind="append", default=[],
                  description="run only the listed codes (repeatable)"),
    ),
)


def run(*, root: Path | str = ".",
        codes: list[str] | None = None) -> list | None:
    """Return the lint suggestion list (filtered by ``codes`` if given)."""
    rooted = as_directory(root, "fars lint")
    if rooted is None:
        return None
    from fars.substrate.store import Substrate
    ws = Substrate(root=rooted)
    suggestions = run_lint(ws.notes, root=ws.root)
    if codes:
        wanted = set(codes)
        suggestions = [s for s in suggestions if s.code in wanted]
    return suggestions


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    suggestions = run(root=args.root, codes=args.code or None)
    if suggestions is None:
        return 2

    if not suggestions:
        print("fars lint: nothing to suggest")
        return 0

    by_code: dict[str, list] = {}
    for s in suggestions:
        by_code.setdefault(s.code, []).append(s)

    for code, items in sorted(by_code.items()):
        print(f"## {code} ({len(items)})")
        for s in items[:30]:
            loc = f"`{s.path}`: " if s.path else ""
            print(f"- {loc}{s.message}")
        if len(items) > 30:
            print(f"  (+{len(items) - 30} more)")
        print()

    if args.fix:
        applied = 0
        skipped = 0
        for s in suggestions:
            if s.apply is None:
                skipped += 1
                continue
            try:
                if s.apply():
                    applied += 1
            except Exception as e:
                print(f"  fix failed for {s.path}: {e}", file=sys.stderr)
        print(f"fars lint: applied {applied} fixes, skipped {skipped}",
              file=sys.stderr)
    else:
        codes = Counter(s.code for s in suggestions)
        print(f"fars lint: {len(suggestions)} suggestions: " +
              ", ".join(f"{n} {c}" for c, n in sorted(codes.items())),
              file=sys.stderr)
        print("  pass --fix to apply", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
