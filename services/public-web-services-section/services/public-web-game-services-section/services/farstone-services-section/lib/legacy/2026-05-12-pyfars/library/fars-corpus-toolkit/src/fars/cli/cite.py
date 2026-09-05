"""``fars cite <path>`` — generate a merged BibTeX file from frontmatter.

Loads notes recursively from the path, merges every inline ``references:``
block plus any ``references/<key>.md`` annotation files, and writes the
result to ``<root>/references.bib`` (or ``--out FILE``). Use ``--check``
to validate without writing.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fars.cli._runner import as_directory
from fars.substrate.index.references import build as build_references
from fars.render.bibtex_file import render as render_bib
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="cite",
    description="Generate references.bib from inline `references:` blocks + annotation files.",
    example="fars cite . --check",
    notes="`--check` validates without writing.",
    output="Writes <root>/references.bib (or `--out`); exits 1 on any error-severity diagnostic.",
    parameters=(
        Parameter(name="path", kind="positional", required=False, default=".",
                  description="directory to harvest references from (default: CWD)"),
        Parameter(name="out", kind="flag", type=Path, default=None,
                  description="write bib here (default: <root>/references.bib)"),
        Parameter(name="check", kind="store_true",
                  description="validate without writing; exit 1 on errors"),
    ),
)


def run(*, path: Path | str = ".") -> tuple | None:
    """Build the merged reference index. Returns
    ``(refs_dict, diagnostics, root)``, or ``None`` if path is invalid."""
    rooted = as_directory(path, "fars cite")
    if rooted is None:
        return None
    from fars.substrate.store import Substrate
    ws = Substrate(root=rooted)
    refs, ref_diags = build_references(ws.notes)
    diagnostics = list(ws.parse_diagnostics) + list(ref_diags)
    return refs, diagnostics, ws.root


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    result = run(path=args.path)
    if result is None:
        return 2
    refs, diagnostics, root = result

    has_errors = any(d.severity == "error" for d in diagnostics)
    print(f"fars cite: {len(refs)} references, {len(diagnostics)} diagnostics",
          file=sys.stderr)
    for d in diagnostics:
        prefix = f"{d.severity}: "
        loc = f"{d.path}: " if d.path else ""
        print(f"  {prefix}{loc}{d.message}", file=sys.stderr)

    if args.check:
        return 1 if has_errors else 0

    out_path = args.out or (root / "references.bib")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(render_bib(refs.values()), encoding="utf-8")
    print(f"  wrote: {out_path}", file=sys.stderr)
    return 1 if has_errors else 0


if __name__ == "__main__":
    sys.exit(main())
