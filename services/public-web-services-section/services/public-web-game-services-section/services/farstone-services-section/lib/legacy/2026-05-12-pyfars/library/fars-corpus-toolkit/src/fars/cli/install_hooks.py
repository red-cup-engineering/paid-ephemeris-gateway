"""``fars install-hooks`` — drop a pre-commit hook running fars diff.

Writes ``.git/hooks/pre-commit`` (or appends if it exists) with a small
shell script that invokes ``python -m fars diff --since HEAD --committed-only``
against the corpus root. The hook fails the commit if validate finds
any error-severity diagnostic among the staged .md files.

Pass ``--uninstall`` to remove the hook.
"""
from __future__ import annotations

import os
import stat
import sys
from pathlib import Path

from fars.cli._runner import as_directory
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="install-hooks",
    description="Drop a pre-commit hook running `fars diff --since HEAD --committed-only`.",
    example="corpus install-hooks",
    notes="`--uninstall` removes the managed block.",
    output="Stderr message confirming where the hook was written / removed.",
    parameters=(
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="pythonpath", kind="flag", default=None,
                  description="PYTHONPATH for the hook (default: <root>/operations/engineering/tools/corpus/src)"),
        Parameter(name="uninstall", kind="store_true",
                  description="remove the managed block"),
    ),
)

_HOOK_MARKER = "# >>> corpus pre-commit >>>"
_HOOK_END = "# <<< corpus pre-commit <<<"
_HOOK_BODY_TEMPLATE = """\
{marker}
# Auto-installed by `fars install-hooks`. Do not edit between these markers.
PYTHONPATH={pythonpath} python -m fars diff --root {root} --since HEAD --committed-only
status=$?
if [ $status -ne 0 ]; then
    echo "corpus pre-commit: diagnostics found (exit $status)" >&2
    exit $status
fi
{end}
"""


def _strip_marker_block(text: str) -> str:
    if _HOOK_MARKER not in text:
        return text
    lines = text.splitlines(keepends=True)
    out: list[str] = []
    skip = False
    for line in lines:
        if _HOOK_MARKER in line:
            skip = True
            continue
        if _HOOK_END in line:
            skip = False
            continue
        if not skip:
            out.append(line)
    return "".join(out)


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    root = as_directory(args.root, "corpus install-hooks")
    if root is None:
        return 2
    git_dir = root / ".git"
    if not git_dir.is_dir():
        print(f"corpus install-hooks: {root} is not a git repo", file=sys.stderr)
        return 2

    hook_path = git_dir / "hooks" / "pre-commit"
    hook_path.parent.mkdir(parents=True, exist_ok=True)
    existing = hook_path.read_text(encoding="utf-8") if hook_path.exists() else ""

    cleaned = _strip_marker_block(existing)

    if args.uninstall:
        if cleaned == existing:
            print("corpus install-hooks: no managed block found",
                  file=sys.stderr)
            return 0
        if cleaned.strip() == "" or cleaned.strip() == "#!/bin/sh":
            hook_path.unlink()
        else:
            hook_path.write_text(cleaned, encoding="utf-8")
        print(f"corpus install-hooks: uninstalled from {hook_path}",
              file=sys.stderr)
        return 0

    pythonpath = args.pythonpath or str(
        root / "operations" / "engineering" / "tools" / "corpus" / "src",
    )
    body = _HOOK_BODY_TEMPLATE.format(
        marker=_HOOK_MARKER, end=_HOOK_END,
        pythonpath=pythonpath, root=str(root),
    )
    if cleaned.strip() == "":
        new = "#!/bin/sh\n\n" + body
    else:
        new = cleaned.rstrip() + "\n\n" + body

    hook_path.write_text(new, encoding="utf-8")
    mode = os.stat(hook_path).st_mode
    os.chmod(hook_path, mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    print(f"corpus install-hooks: wrote {hook_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
