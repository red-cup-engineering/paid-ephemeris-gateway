"""Shared CLI scaffold: argparse helpers + root validation + Substrate.

Every CLI imports from here. The intent is to centralize the boilerplate
(--root, --json, --quiet, root-is-directory check, error messages) so
each verb's ``main`` can focus on its actual orchestration logic.

Usage shape:

    def main(argv=None):
        ap = make_parser("corpus example")
        ap.add_argument("slug")
        args = ap.parse_args(argv)
        ws = workspace_from_args(args, "corpus example")
        if ws is None:
            return 2
        ...
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from fars.substrate.store import Substrate


def _verb_from_prog(prog: str) -> str | None:
    """Extract the verb from a prog string like ``fars validate``."""
    parts = prog.strip().split()
    return parts[1] if len(parts) >= 2 and parts[0] == "corpus" else None


def make_parser(prog: str, *, description: str | None = None,
                with_root: bool = True, with_json: bool = False,
                with_quiet: bool = False) -> argparse.ArgumentParser:
    """Build a parser with the standard flags pre-added.

    ``with_root`` adds ``--root/-r`` (default ``.``).
    ``with_json`` adds ``--json`` for read-only verbs that emit data.
    ``with_quiet`` adds ``--quiet`` to suppress per-code summaries.

    When ``description`` is None, looks up the verb in ``cli.help`` so
    ``fars <verb> --help`` and ``fars help <verb>`` agree.
    """
    if description is None:
        verb = _verb_from_prog(prog)
        if verb is not None:
            from fars.cli.help import description_for
            description = description_for(verb)
    ap = argparse.ArgumentParser(prog=prog, description=description)
    if with_root:
        ap.add_argument("--root", "-r", default=".",
                        help="corpus root (default: CWD)")
    if with_json:
        ap.add_argument("--json", action="store_true",
                        help="emit JSON instead of human-readable output")
    if with_quiet:
        ap.add_argument("--quiet", action="store_true",
                        help="suppress per-code summary on stderr")
    return ap


def as_directory(path: str | Path, prog: str) -> Path | None:
    """Resolve ``path`` and verify it's a directory.

    Returns the resolved Path on success, or None after printing an
    error to stderr (caller should ``return 2``). The shared error
    format keeps every verb's "not a directory" message identical.
    """
    root = Path(path).resolve()
    if not root.is_dir():
        print(f"{prog}: not a directory: {root}", file=sys.stderr)
        return None
    return root


def resolve_root(args: argparse.Namespace, prog: str) -> Path | None:
    """Validate ``args.root`` (the standard ``--root`` flag)."""
    return as_directory(args.root, prog)


def workspace_from_args(args: argparse.Namespace,
                        prog: str) -> Substrate | None:
    """Combined ``resolve_root`` + ``Substrate`` for ``--root``-based CLIs.

    Notes are not loaded until the workspace's properties are accessed.
    """
    root = resolve_root(args, prog)
    if root is None:
        return None
    return Substrate(root=root)


def workspace_from_path(path: str | Path,
                        prog: str) -> Substrate | None:
    """``Substrate`` for CLIs that take a positional path instead of ``--root``."""
    root = as_directory(path, prog)
    if root is None:
        return None
    return Substrate(root=root)
