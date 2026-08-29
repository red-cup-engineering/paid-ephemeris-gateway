"""Heartbeat scheduler — selects unsettled flatfiles and emits ticks.

The heartbeat is the loop of a long-running FARS process. Each cycle:
  1. Reload the substrate (cheap; cached parses, mtime-based invalidation).
  2. Apply a *selection policy* to find unsettled flatfiles — by default,
     "fails one or more closure rules."
  3. For each unsettled flatfile, emit a tick to the dispatch table
     under a predicate naming why it's unsettled.

Initial policy is the simplest possible: re-run the closure rule set
and treat any flatfile mentioned in any diagnostic as "unsettled."
Later policies will use rule-firing semantics, predication-fiber
unsettled cells, etc.

This is a structural skeleton. The current implementation runs once
per ``run()`` call and prints ticks to stdout if no dispatch table is
provided. To make it a true daemon, wrap it in a sleep loop or wire it
to a file-watch trigger.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Iterable

from fars.substrate.flatfile import Flatfile
from fars.substrate.store import Substrate
from fars.substrate.types.diagnostic import Diagnostic
from fars.runtime.dispatch import DispatchTable


SelectionPolicy = Callable[[Substrate], "list[tuple[Flatfile, str]]"]
"""A selection policy returns a list of (flatfile, predicate-slug) pairs.
Each pair is one reason a flatfile is unsettled; the heartbeat emits
one tick per pair."""


def diagnostics_policy(rule_runner: Callable[[Substrate], list[Diagnostic]]) -> SelectionPolicy:
    """Build a selection policy that runs a rule set and treats every
    flatfile in any diagnostic as unsettled, with the diagnostic's
    ``code`` as the predicate.
    """
    def policy(substrate: Substrate) -> list[tuple[Flatfile, str]]:
        diagnostics = rule_runner(substrate)
        by_path: dict[Path, Flatfile] = {ff.path: ff for ff in substrate.notes}
        pairs: list[tuple[Flatfile, str]] = []
        for diag in diagnostics:
            if diag.path is None:
                continue
            ff = by_path.get(diag.path)
            if ff is None:
                continue
            pairs.append((ff, diag.code))
        return pairs
    return policy


@dataclass
class Heartbeat:
    """A single-pass heartbeat. Call ``tick()`` per cycle."""
    substrate: Substrate
    selection: SelectionPolicy
    dispatch: DispatchTable | None = None
    on_tick: Callable[[Flatfile, str], None] | None = None

    def tick(self) -> int:
        """Run one cycle. Returns the number of ticks emitted."""
        pairs = self.selection(self.substrate)
        for flatfile, pred in pairs:
            self._emit(flatfile, pred)
        return len(pairs)

    def _emit(self, flatfile: Flatfile, predicate: str) -> None:
        if self.dispatch is not None:
            self.dispatch.dispatch(predicate, flatfile)
        if self.on_tick is not None:
            self.on_tick(flatfile, predicate)
