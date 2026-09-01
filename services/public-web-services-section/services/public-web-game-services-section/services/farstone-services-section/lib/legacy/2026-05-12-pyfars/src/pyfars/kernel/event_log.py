"""Append-only JSONL log of witnesses.

Witness storage is kernel-level: every program that emits witnesses
(engine, harnesses, bridges) writes them here. One line per witness
in ``<root>/.pyfars/events.jsonl``. Replay it to reconstruct system
state.

Single-writer-at-a-time in normal operation (the engine process owns
the file while it runs; one-shot harness programs write while the
engine is halted). POSIX append-line atomicity is enough for the
single-writer discipline; concurrent multi-writer is not supported.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

from pyfars.kernel.witness import Witness


@dataclass
class EventLog:
    root: Path

    @property
    def path(self) -> Path:
        return self.root / ".pyfars" / "events.jsonl"

    def append(self, w: Witness) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("a", encoding="utf-8") as f:
            f.write(w.model_dump_json() + "\n")

    def read_all(self) -> Iterator[Witness]:
        if not self.path.exists():
            return
        with self.path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                yield Witness.model_validate_json(line)

    def tail(self, n: int) -> list[Witness]:
        return list(self.read_all())[-n:]


__all__ = ["EventLog"]
