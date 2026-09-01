"""LoadDirectoryProgram — the math-pure directory-loading program.

Per the four-frame discipline (FARS theory: ``concepts/program.md``,
``concepts/directory.md``, ``concepts/system.md``), loading a system
from a directory is a *program-frame* operation: each file projection
is a system-resident witness, and the loaded system is the program's
result. This program is what runs that loading explicitly.

When the polity wants the load itself to be auditable — to know
exactly which files were projected, in what order, with what cell
counts, against what errors — it runs ``LoadDirectoryProgram(root)``.
The witness chain becomes the load's manifest. Per
``harness-program.md``'s bootstrap-path note: load-directory + a
harness program runs first in the cold-start sequence, before the
engine attaches; this is the program for the first half of that.

For silent (no-witness) loads — the typical case during a running
engine's boot — use ``System.from_root(root)`` directly. It walks
the same way without emitting witnesses.

The two paths share their walking machinery
(:func:`pyfars.kernel.projector.compound.extract_file` per file plus
:func:`pyfars.kernel.closure.apply_active_rules` for closure), so a
silent load and an auditable load produce *byte-identical* stores
against the same directory.
"""
from __future__ import annotations

from pathlib import Path
from typing import Callable, Optional

from pypredcalc import PredicationStore

from pyfars.kernel.store import System
from pyfars.programs.base import Program, ProgramResult, _now_iso


class LoadDirectoryProgram(Program):
    """One-shot program: walk a directory, project files, emit witnesses,
    return a loaded :class:`System`.

    Override of ``Program.boot``: this program does NOT pre-load a
    system (since loading the system is *its* work). It opens the
    event log so ``self.emit`` works; ``self.system`` becomes available
    after ``run()`` completes.
    """

    def __init__(
        self,
        root: Path,
        *,
        path_filter: Callable[[Path], bool] | None = None,
    ) -> None:
        super().__init__(root)
        self.path_filter = path_filter
        self.files_projected: int = 0
        self.cells_inserted: int = 0
        self.projection_errors: int = 0

    def boot(self) -> None:
        """Open the event log; leave ``_system`` empty for ``run()`` to fill."""
        from pyfars.kernel.event_log import EventLog
        self._log = EventLog(root=self.root)

    async def run(self) -> ProgramResult:
        from pyfars.kernel.closure import apply_active_rules
        from pyfars.kernel.projector.compound import (
            _default_path_filter, extract_file,
        )

        started_at = _now_iso()
        self.validate()
        self.boot()
        self.emit(operator="load_directory_boot",
                  details={"root": str(self.root),
                           "started_at": started_at})

        keep = self.path_filter or _default_path_filter
        root = self.root.resolve()
        all_cells = []

        for path in sorted(root.rglob("*")):
            if not path.is_file():
                continue
            rel = path.relative_to(root)
            if not keep(rel):
                continue
            try:
                cells = list(extract_file(path, root=root))
            except Exception as exc:
                self.projection_errors += 1
                self.emit(operator="file_projection_failed",
                          details={"path": rel.as_posix(),
                                   "error": f"{type(exc).__name__}: {exc}"},
                          kind="observation")
                continue
            all_cells.extend(cells)
            self.files_projected += 1
            self.cells_inserted += len(cells)
            self.emit(operator="file_projected",
                      details={"path": rel.as_posix(),
                               "cell_count": len(cells)},
                      kind="observation")

        store = PredicationStore.from_cells(all_cells)

        closed, _changed = apply_active_rules(store=store)
        self._system = System(root=self.root, store=closed)
        self.halt()

        halted_at = _now_iso()
        self.emit(operator="load_directory_halt",
                  details={"root": str(self.root),
                           "files_projected": self.files_projected,
                           "cells_inserted": self.cells_inserted,
                           "projection_errors": self.projection_errors,
                           "halted_at": halted_at})
        return ProgramResult(
            started_at=started_at,
            halted_at=halted_at,
            extras={
                "files_projected": self.files_projected,
                "cells_inserted": self.cells_inserted,
                "projection_errors": self.projection_errors,
            },
        )


__all__ = ["LoadDirectoryProgram"]
