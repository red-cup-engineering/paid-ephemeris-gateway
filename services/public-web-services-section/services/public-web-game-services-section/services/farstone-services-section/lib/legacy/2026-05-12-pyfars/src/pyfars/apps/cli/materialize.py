"""``pyfars materialize <slug>`` — run a harness materializer.

A harness projects substrate state into a runtime-specific surface
(``CLAUDE.md`` for Claude Code, ``.openclaw/agents/*.md`` for OpenClaw,
``AGENTS.md`` for the AGENTS.md convention, ``flake.nix`` for Nix, …).
This verb loads the named harness record from the pyfars package,
walks its declared emit rules against the polity's system, and writes
the rendered bytes plus a JSON manifest.

Listing form: ``pyfars materialize`` with no slug prints every harness
shipped under :mod:`pyfars.apps.materializer_templates`.
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from pyfars.programs.harness_materializer import (
    HarnessLoadError,
    HarnessMaterializerProgram,
    list_harnesses,
)
from pyfars.programs.openclaw import OpenClawWorkspaceMaterializer

_NAMED_PROGRAMS: dict[str, type] = {
    "openclaw-workspace": OpenClawWorkspaceMaterializer,
}


def add_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "slug", nargs="?",
        help="harness name (e.g. claude-code, openclaw, agentic). "
             "Omit to list available harnesses.",
    )
    parser.add_argument(
        "--root", type=Path, default=Path("."),
        help="polity directory (default: CWD)",
    )
    parser.add_argument(
        "--prefix", default="pyfars-",
        help="namespace prefix for per-record output names (default: pyfars-)",
    )


def run(args: argparse.Namespace) -> int:
    if args.slug is None:
        for name in sorted(list(_NAMED_PROGRAMS) + list_harnesses()):
            print(name)
        return 0
    if args.slug in _NAMED_PROGRAMS:
        program = _NAMED_PROGRAMS[args.slug](root=args.root.resolve())
        result = asyncio.run(program.run())
        print(f"materialized {args.slug} → {len(result.written)} files")
        return 0
    try:
        program = HarnessMaterializerProgram(
            root=args.root.resolve(),
            harness_slug=args.slug,
            prefix=args.prefix,
        )
    except HarnessLoadError as exc:
        print(f"pyfars materialize: {exc}", file=sys.stderr)
        return 2
    result = asyncio.run(program.run())
    print(
        f"materialized harness:{program.harness.name} → "
        f"{len(result.written)} files"
    )
    return 0
