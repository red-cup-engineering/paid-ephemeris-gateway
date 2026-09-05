"""UDS server — engine's outward face.

External processes (CLI, web apps, MCP bridges, federation peers)
reach the engine through ``<root>/.pyfars/run.sock``. FastAPI app
served over a Unix socket by uvicorn. Routes:

  GET  /status                       engine state + tick count
  GET  /cells?subject=<slug>         T-cells at a subject
  GET  /value?s=&p=&o=               one cell's bilattice value
  GET  /subjects-of-type?types=...   subjects whose type is one of types
  POST /witness                      append a witness to the event log
  GET  /events?n=N                   tail N witnesses

The system is read-only over this socket. Mutations come from the
engine's own dispatch loop or from witness submissions; closure rules
in the system decide what witnesses mean (polity-authored).
"""
from __future__ import annotations

import asyncio
import contextlib
from pathlib import Path
from typing import Any

import uvicorn
from fastapi import FastAPI, HTTPException, Query

from pyfars.kernel import query
from pyfars.kernel.store import System
from pyfars.kernel.witness import Witness


def build_app(*, system: System, log, engine: Any) -> FastAPI:
    app = FastAPI(title="pyfars-engine")

    @app.get("/status")
    def status() -> dict[str, Any]:
        return {
            "root": str(system.root),
            "started_at": getattr(engine, "started_at", None),
            "tick_count": getattr(engine, "tick_count", 0),
            "halted_at": getattr(engine, "halted_at", None),
        }

    @app.get("/cells")
    def cells(subject: str = Query(...)) -> list[dict[str, str]]:
        return [
            {"subject": str(s), "predicate": str(p), "object": str(o)}
            for (s, p, o) in query.cells_at(system.store, subject)
        ]

    @app.get("/value")
    def value(s: str = Query(...), p: str = Query(...), o: str = Query(...)) -> dict[str, str]:
        return {"value": query.value(system.store, s, p, o).name}

    @app.get("/subjects-of-type")
    def subjects_of_type(types: str = Query(...)) -> list[str]:
        type_list = [t for t in types.split(",") if t]
        return sorted(
            str(x) for x in query.subjects_of_type(system.store, type_list)
        )

    @app.post("/witness")
    def post_witness(payload: dict) -> dict[str, bool]:
        try:
            w = Witness.model_validate(payload)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        log.append(w)
        return {"ok": True}

    @app.get("/events")
    def events(n: int = 50) -> list[dict]:
        return [w.model_dump(mode="json") for w in log.tail(n)]

    return app


class _NoSignalServer(uvicorn.Server):
    """Uvicorn server that does NOT clobber the asyncio loop's signal
    handlers. The engine's ``run_engine`` owns SIGINT/SIGTERM and
    drives uvicorn shutdown explicitly via ``should_exit``."""

    @contextlib.contextmanager
    def capture_signals(self):  # type: ignore[override]
        yield


class UDSServer:
    """Background uvicorn server bound to a Unix socket. Halt via
    ``await stop()``."""

    def __init__(self, *, system: System, log,
                 sock_path: Path, engine: Any) -> None:
        self.sock_path = sock_path
        sock_path.parent.mkdir(parents=True, exist_ok=True)
        if sock_path.exists():
            sock_path.unlink()
        app = build_app(system=system, log=log, engine=engine)
        self._config = uvicorn.Config(
            app=app, uds=str(sock_path),
            lifespan="off", log_level="warning",
        )
        self._server = _NoSignalServer(self._config)
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        self._task = asyncio.create_task(self._server.serve())

    async def stop(self) -> None:
        self._server.should_exit = True
        if self._task is not None:
            try:
                await self._task
            except Exception:
                pass
        try:
            if self.sock_path.exists():
                self.sock_path.unlink()
        except OSError:
            pass


__all__ = ["UDSServer", "build_app"]
