"""``pyfars run <root>`` — boot the engine program against a directory."""
from __future__ import annotations

import argparse
import asyncio
from pathlib import Path

from pyfars.programs import EngineProgram


def add_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("root", type=Path, help="directory root (the system's image)")
    parser.add_argument(
        "--tick-interval", type=float, default=20.0,
        help="heartbeat seconds between dispatch ticks (default: 20)",
    )
    parser.add_argument(
        "--autonomous", action="store_true",
        help="invoke real agents on dispatch winners (default: dry-tick)",
    )


def run(args: argparse.Namespace) -> int:
    program = EngineProgram(
        root=args.root.resolve(),
        tick_interval=args.tick_interval,
        autonomous_spawn=args.autonomous,
    )
    asyncio.run(program.run())
    return 0
