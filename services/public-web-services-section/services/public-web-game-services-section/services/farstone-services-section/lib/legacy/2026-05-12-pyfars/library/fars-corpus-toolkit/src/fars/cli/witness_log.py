"""``fars witness-log [--tail N] [--json]`` — show the FARS event log.

Reads the witness chain from ``<root>/.fars/event-log/`` and prints
recent entries. Default: last 20 witnesses, one per line.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fars.runtime.event_log import EventLog
from fars.runtime.profile import discover_profile
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="witness-log",
    description="Tail the FARS event log (witness chain).",
    example="fars witness-log --tail 50",
    output="One line per witness: `<timestamp>  <operator>  <target>  agent=<...>`.",
    parameters=(
        Parameter(name="tail", kind="flag", type=int, default=20,
                  short="-n",
                  description="how many witnesses to show (default 20)"),
        Parameter(name="json", kind="store_true",
                  description="emit JSONL instead of human format"),
    ),
)


def run(*, tail: int = 20, json: bool = False) -> int:
    profile = discover_profile(Path.cwd())
    if profile is None:
        print("fars: no FARS profile found", file=sys.stderr)
        return 2
    log = EventLog(root=profile.root)
    witnesses = log.tail(tail)
    if not witnesses:
        print("(event log is empty)")
        return 0
    for w in witnesses:
        if json:
            print(w.to_json())
        else:
            agent = f"agent={w.agent}" if w.agent else "agent=-"
            print(f"{w.timestamp}  {w.operator:24s}  {w.target}  {agent}")
    return 0


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    return run(tail=args.tail, json=args.json)


if __name__ == "__main__":
    sys.exit(main())
