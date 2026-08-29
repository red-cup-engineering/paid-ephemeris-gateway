"""Program — the program-frame base class.

A program is a process executing FARS operators on a system (FARS
theory: ``concepts/program.md``). Each concrete program class realizes
one binding of the program frame to a substrate primitive: the engine
class binds program to a long-running tick/dispatch loop over UDS; the
harness-program class binds program to one-shot system→directory
materialization.

Concrete programs subclass ``Program`` and implement ``run``. The base
supplies the validate / boot / halt skeleton and a witness-emission
helper; the program's protocol surface lives in ``run``.
"""
from __future__ import annotations

import abc
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from pyfars.kernel.event_log import EventLog
from pyfars.kernel.store import System
from pyfars.kernel.witness import make_witness


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class ProgramRootInvalid(Exception):
    """Raised when ``root`` does not name a valid system-image directory."""


@dataclass
class ProgramResult:
    """Outcome of one program run; subclasses add program-specific fields."""
    started_at: str
    halted_at: str
    extras: dict[str, Any] = field(default_factory=dict)


class Program(abc.ABC):
    """Abstract program-frame class.

    A program binds to one directory ``root`` and runs against the
    system loaded from it. Subclasses define their protocol surface
    via ``run``.
    """

    def __init__(self, root: Path) -> None:
        self.root = Path(root).resolve()
        self._system: Optional[System] = None
        self._log: Optional[EventLog] = None

    @property
    def system(self) -> System:
        if self._system is None:
            raise RuntimeError("system not loaded; call boot() first")
        return self._system

    @property
    def log(self) -> EventLog:
        if self._log is None:
            raise RuntimeError("event log not opened; call boot() first")
        return self._log

    def validate(self) -> None:
        if not self.root.exists():
            raise ProgramRootInvalid(f"root does not exist: {self.root}")
        if not self.root.is_dir():
            raise ProgramRootInvalid(f"root is not a directory: {self.root}")
        if not (self.root / "_index.md").exists():
            raise ProgramRootInvalid(
                f"root lacks _index.md: {self.root}"
            )

    def boot(self) -> None:
        self._system = System.from_root(self.root)
        self._log = EventLog(root=self.root)

    def halt(self) -> None:
        """Default no-op halt. Long-running programs override."""

    def emit(
        self,
        *,
        operator: str,
        details: dict[str, Any],
        kind: str = "mutation",
        origin: str | None = None,
    ) -> None:
        try:
            self.log.append(make_witness(
                operator=operator,
                target=str(self.root),
                before_hash=None,
                after_hash=None,
                details=details,
                kind=kind,
                origin=origin or type(self).__name__,
            ))
        except OSError:
            pass

    @abc.abstractmethod
    async def run(self) -> ProgramResult:
        """Execute the program's protocol surface."""


__all__ = [
    "Program",
    "ProgramResult",
    "ProgramRootInvalid",
    "_now_iso",
]
