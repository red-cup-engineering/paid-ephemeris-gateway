"""EngineProgram — the long-running engine program.

Per ``concepts/program.md``: a program of the **engine class**. Loads
a system from a directory, ticks the closure-and-dispatch loop on a
heartbeat, supervises sub-services declared in the system, serves
cell reads / witness writes to other programs over its UDS at
``<root>/.pyfars/run.sock``, and spawns child programs
(HarnessProgram / ScriptProgram) when dispatch detects new
Assignments.

A directory has at most one engine program running at a time. Other
programs (CLI invocations, federation peers, HarnessProgram instances)
reach the engine through ``pyfars.client``.

The lifecycle is a simple sequence:

    validate → boot → start UDS → tick loop (until halt) → stop UDS → halt

Per-tick dispatch (closure-rule firing → assignment reading → spawn)
uses a LangGraph in ``dispatch.py``; the engine lifecycle itself is
plain async because it's a sequence with one self-loop, not a state
machine worth encoding as a graph.

Child program lifecycle:

  - dispatch emits a ``spawn_requests`` list each tick
  - the engine creates one ``asyncio.Task`` per request, holding it
    in ``self.active_programs`` keyed by assignment slug
  - completed tasks are reaped each tick; one witness per completion
  - on halt, the engine cancels every active child task before
    stopping the UDS server
"""
from __future__ import annotations

import asyncio
import os
import signal
from pathlib import Path
from typing import Any

from pyfars.kernel.operator.kind import (
    discover_active_operator_kinds,
    register_operator_kinds,
    reset_operator_kinds,
)
from pyfars.kernel.witness import make_witness
from pyfars.programs.base import Program, ProgramResult, _now_iso
from pyfars.programs.engine.dispatch import run_tick
from pyfars.programs.engine.server import UDSServer
from pyfars.programs.harness import HarnessProgram
from pyfars.programs.script import ScriptProgram


class EngineProgram(Program):
    """Long-running engine — UDS server + dispatch tick loop + child supervisor.

    Construct with the polity's directory root; optionally configure
    the heartbeat tick interval and whether dispatched assignments
    actually spawn child programs (``autonomous_spawn=False`` keeps
    the engine in scheduler-only mode for inspection).
    """

    def __init__(
        self,
        root: Path,
        *,
        tick_interval: float = 20.0,
        autonomous_spawn: bool = False,
    ) -> None:
        super().__init__(root)
        self.tick_interval = tick_interval
        self.autonomous_spawn = autonomous_spawn
        self.halting: asyncio.Event = asyncio.Event()
        self.uds: UDSServer | None = None
        self.started_at: str | None = None
        self.halted_at: str | None = None
        self.tick_count: int = 0
        self.previous_assignment_slugs: list[str] = []
        self.active_programs: dict[str, asyncio.Task] = {}

    # ---- lifecycle --------------------------------------------------

    def install_signal_handlers(self) -> None:
        """Wire SIGINT/SIGTERM to set ``self.halting``."""
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                loop.add_signal_handler(sig, self.halting.set)
            except (NotImplementedError, RuntimeError):
                pass

    async def run(self) -> ProgramResult:
        self._load_secrets_env()
        self.validate()
        self.boot()
        reset_operator_kinds()
        op_map, ch_map = discover_active_operator_kinds(self.system.store)
        register_operator_kinds(
            operator_kinds=op_map, channel_kinds=ch_map,
        )
        self.install_signal_handlers()
        self.started_at = _now_iso()
        self.uds = UDSServer(
            system=self.system,
            log=self.log,
            sock_path=self.root / ".pyfars" / "run.sock",
            engine=self,
        )
        await self.uds.start()
        self.emit(operator="engine_boot",
                  details={"root": str(self.root),
                           "tick_interval_seconds": self.tick_interval,
                           "started_at": self.started_at,
                           "uds_socket":
                               str(self.root / ".pyfars/run.sock")})
        try:
            await self._tick_loop()
        finally:
            await self._cancel_active_programs()
            await self._stop_uds()
            self.halted_at = _now_iso()
            self.emit(operator="engine_halt",
                      details={"root": str(self.root),
                               "started_at": self.started_at,
                               "halted_at": self.halted_at,
                               "ticks": self.tick_count})
        return ProgramResult(
            started_at=self.started_at,
            halted_at=self.halted_at,
            extras={"tick_count": self.tick_count},
        )

    # ---- internals --------------------------------------------------

    async def _tick_loop(self) -> None:
        while not self.halting.is_set():
            try:
                await asyncio.wait_for(
                    self.halting.wait(),
                    timeout=self.tick_interval,
                )
                return
            except asyncio.TimeoutError:
                pass
            await self._tick()

    async def _tick(self) -> None:
        self.tick_count += 1
        self.emit(operator="clock_tick",
                  details={"cadence": "heartbeat",
                           "cadence_position": self.tick_count},
                  kind="observation")
        self._reap_completed_programs()
        try:
            result = await run_tick(
                self.system,
                root=self.root,
                tick=self.tick_count,
                spawn=self.autonomous_spawn,
                previous_assignment_slugs=self.previous_assignment_slugs,
            )
        except Exception as exc:
            self.emit(operator="dispatch_failed",
                      details={"tick": self.tick_count,
                               "error": f"{type(exc).__name__}: {exc}"},
                      kind="observation")
            return
        for w in result.witnesses:
            try:
                self.log.append(w)
            except OSError:
                pass
        self.previous_assignment_slugs = result.current_assignment_slugs
        if self.autonomous_spawn:
            for req in result.spawn_requests:
                self._spawn_child(req)

    def _spawn_child(self, request: dict[str, Any]) -> None:
        slug = request["assignment"]
        if slug in self.active_programs:
            return
        kind = request["kind"]
        workitem = request["workitem"]
        agent = request["agent"]
        if kind == "script":
            child = ScriptProgram(
                self.root, workitem=workitem, agent=agent,
            )
        else:
            child = HarnessProgram(
                self.root, agent=agent, assignment=slug,
            )
        task = asyncio.create_task(child.run(), name=f"program:{slug}")
        self.active_programs[slug] = task
        self.emit(
            operator="program_spawned",
            details={
                "assignment": slug,
                "workitem": workitem,
                "agent": agent,
                "program_kind": kind,
                "tick": self.tick_count,
            },
            kind="mutation",
        )

    def _reap_completed_programs(self) -> None:
        finished = [s for s, t in self.active_programs.items() if t.done()]
        for slug in finished:
            task = self.active_programs.pop(slug)
            error: str | None = None
            try:
                exc = task.exception()
                if exc is not None:
                    error = f"{type(exc).__name__}: {exc}"
            except (asyncio.CancelledError, asyncio.InvalidStateError):
                error = "cancelled"
            self.emit(
                operator="program_completed",
                details={
                    "assignment": slug,
                    "tick": self.tick_count,
                    "error": error,
                },
                kind="observation",
            )

    async def _cancel_active_programs(self) -> None:
        if not self.active_programs:
            return
        for task in self.active_programs.values():
            task.cancel()
        await asyncio.gather(
            *self.active_programs.values(), return_exceptions=True,
        )
        for slug in list(self.active_programs):
            try:
                self.log.append(make_witness(
                    operator="program_cancelled_on_halt",
                    target=f"assignment/{slug}",
                    before_hash=None, after_hash=None,
                    details={"assignment": slug, "tick": self.tick_count},
                    channel="dispatch", kind="observation",
                    origin="EngineProgram",
                ))
            except OSError:
                pass
        self.active_programs.clear()

    async def _stop_uds(self) -> None:
        if self.uds is None:
            return
        try:
            await self.uds.stop()
        except Exception:
            pass

    def _load_secrets_env(self) -> None:
        env_path = self.root / ".pyfars" / "secrets.env"
        if not env_path.is_file():
            return
        for raw in env_path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


__all__ = ["EngineProgram"]
