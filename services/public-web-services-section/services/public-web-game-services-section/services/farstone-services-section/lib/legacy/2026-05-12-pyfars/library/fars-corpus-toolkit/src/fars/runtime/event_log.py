"""Append-only event log of operator witnesses.

The event log is the audit primitive of a running FARS instance. Every
mutation by an ``fars.operator.*`` operator emits a ``Witness`` (see
``fars.operator.witness``); the ``EventLog`` writes those witnesses to
a JSONL file under ``<root>/.fars/event-log/``. An auditor replaying
the log reconstructs the substrate's state evolution.

The on-disk format is one ``Witness`` per line, JSON-encoded. Files are
named ``<YYYY-MM-DD>.jsonl`` so a day's events live in one file and
older files can be archived without affecting the current write.

This module is intentionally minimal:
  - ``EventLog.append(w)`` writes one witness.
  - ``EventLog.read_all()`` iterates the entire log (across all daily
    files, in timestamp order if filenames sort correctly).
  - ``EventLog.tail(n)`` returns the last n witnesses.

No locking; the JSONL append-line semantics are atomic enough on POSIX
for single-writer use. Multi-writer setups would need a more careful
implementation.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator

from fars.operator.witness import Witness


@dataclass
class EventLog:
    """Append-only JSONL event log under ``root``.

    The log lives at ``<root>/.fars/event-log/<YYYY-MM-DD>.jsonl``,
    one file per UTC day. ``root`` is the FARS instance root, typically
    the repo root.
    """
    root: Path

    @property
    def log_dir(self) -> Path:
        return self.root / ".fars" / "event-log"

    def _today_path(self) -> Path:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        return self.log_dir / f"{date}.jsonl"

    def append(self, witness: Witness) -> None:
        """Append a witness to today's log file."""
        path = self._today_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as f:
            f.write(witness.to_json())
            f.write("\n")

    def read_all(self) -> Iterator[Witness]:
        """Iterate every witness in chronological order (filename sort).

        Daily files sort lexicographically and their internal order is
        append-order, so the concatenation is chronological for any
        single-writer log.
        """
        if not self.log_dir.exists():
            return
        for path in sorted(self.log_dir.glob("*.jsonl")):
            with path.open("r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    yield Witness.from_dict(json.loads(line))

    def tail(self, n: int) -> list[Witness]:
        """Return the last n witnesses in chronological order.

        Reads the entire log; for very long logs this is wasteful but
        adequate for the early bootstrap. Optimize later if it bites.
        """
        all_witnesses = list(self.read_all())
        return all_witnesses[-n:] if n > 0 else []

    def count(self) -> int:
        """Number of witnesses in the log."""
        return sum(1 for _ in self.read_all())
