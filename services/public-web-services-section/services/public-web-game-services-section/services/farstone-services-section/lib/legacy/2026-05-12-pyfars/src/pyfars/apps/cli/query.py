"""``pyfars query <subject>`` — read cells from a running engine via UDS."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from pyfars.client import uds


def add_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("subject", help="cell subject (slug)")
    parser.add_argument(
        "--start", type=Path, default=None,
        help="path to start the upward run.sock walk from (default: cwd)",
    )


def run(args: argparse.Namespace) -> int:
    try:
        rows = uds.cells(args.subject, start=args.start)
    except uds.EngineNotRunning as exc:
        print(f"error: {exc}", flush=True)
        return 2
    print(json.dumps(rows, indent=2))
    return 0
