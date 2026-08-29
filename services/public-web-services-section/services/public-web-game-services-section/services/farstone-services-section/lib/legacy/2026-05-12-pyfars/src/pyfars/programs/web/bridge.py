"""WebBridge — PyFARS ↔ HTTP.

A bridge program: long-running HTTP server that proxies the engine's
UDS surface (``pyfars.client.uds``) over HTTP for browser inspection
and REST access. The bridge does not read the filesystem or invoke
kernel projectors directly; it talks to the running engine like any
other client.

Auth: every API endpoint requires a Bearer token in the
``Authorization`` header. The token's SHA-256 fingerprint looks up an
``api-key`` :class:`Credential` cell; the bound subject's working
fiber must grant power over the action (``api.<endpoint>``).
``/`` (the HTML index) and ``/api/health`` are public.

Surface:

  GET  /                          minimal HTML index (public)
  GET  /api/health                liveness probe (public)
  GET  /api/status                proxies UDS /status
  GET  /api/cells?subject=...     proxies UDS /cells
  GET  /api/value?s=&p=&o=        proxies UDS /value
  GET  /api/subjects-of-type      proxies UDS /subjects-of-type
  POST /api/witness               proxies UDS /witness
  GET  /api/events?n=N            proxies UDS /events

OpenAPI at ``/openapi.json``; Swagger UI at ``/docs``.

This is a *thin* proxy by design — every operation is a single UDS
call. Richer features (search, ranked retrieval, dispatch dashboards)
arrive when concrete consumers ask for them.
"""
from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

from fastapi import Body, Depends, FastAPI, HTTPException, Query, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from uvicorn import Config, Server

from pyfars.client import uds
from pyfars.programs.bridge import BridgeProgram


class WebBridge(BridgeProgram):
    """HTTP bridge — FastAPI server that proxies the engine's UDS."""

    def __init__(
        self,
        root: Path,
        *,
        host: str = "127.0.0.1",
        port: int = 8000,
    ) -> None:
        super().__init__(root)
        self.host = host
        self.port = port
        self._server: Server | None = None

    def _require_subject_factory(self):
        """Return a FastAPI dependency that authenticates and authorizes one call."""
        bridge = self

        def require_subject(request: Request) -> str:
            action_name = f"web.{request.method.lower()}.{request.url.path}"
            outcome = bridge.authorize_bearer(
                request.headers.get("authorization"),
                action_name,
            )
            if not outcome.admitted:
                status = 401 if "missing" in outcome.reason else 403
                raise HTTPException(status_code=status, detail=outcome.reason)
            return outcome.subject  # never None when admitted

        return require_subject

    def _build_app(self) -> FastAPI:
        app = FastAPI(title="PyFARS web bridge")
        templates_dir = Path(__file__).parent / "templates"
        templates = Jinja2Templates(directory=str(templates_dir))
        root = self.root
        require_subject = self._require_subject_factory()

        @app.get("/", response_class=HTMLResponse)
        def index(request: Request):
            engine_state: dict[str, Any] = {}
            engine_running = True
            try:
                engine_state = uds.status(start=root)
            except uds.EngineNotRunning:
                engine_running = False
            return templates.TemplateResponse(
                request, "index.html",
                {
                    "engine_running": engine_running,
                    "engine_state": engine_state,
                    "root": str(root),
                },
            )

        @app.get("/api/health")
        def health() -> dict[str, Any]:
            try:
                uds.status(start=root)
                return {"engine_running": True}
            except uds.EngineNotRunning:
                return {"engine_running": False}

        @app.get("/api/status")
        def status(_subject: str = Depends(require_subject)) -> dict[str, Any]:
            try:
                return uds.status(start=root)
            except uds.EngineNotRunning as exc:
                raise HTTPException(status_code=503, detail=str(exc))

        @app.get("/api/cells")
        def cells(
            subject: str = Query(...),
            _caller: str = Depends(require_subject),
        ) -> list[dict[str, str]]:
            try:
                return uds.cells(subject, start=root)
            except uds.EngineNotRunning as exc:
                raise HTTPException(status_code=503, detail=str(exc))

        @app.get("/api/value")
        def value(
            s: str = Query(...),
            p: str = Query(...),
            o: str = Query(...),
            _caller: str = Depends(require_subject),
        ) -> dict[str, str]:
            try:
                return {"value": uds.value(s, p, o, start=root)}
            except uds.EngineNotRunning as exc:
                raise HTTPException(status_code=503, detail=str(exc))

        @app.get("/api/subjects-of-type")
        def subjects_of_type(
            types: str = Query(..., description="comma-separated"),
            _caller: str = Depends(require_subject),
        ) -> list[str]:
            type_list = [t for t in types.split(",") if t]
            try:
                return uds.subjects_of_type(type_list, start=root)
            except uds.EngineNotRunning as exc:
                raise HTTPException(status_code=503, detail=str(exc))

        @app.post("/api/witness")
        def post_witness(
            witness: dict = Body(...),
            _caller: str = Depends(require_subject),
        ) -> dict[str, Any]:
            try:
                return uds.post_witness(witness, start=root)
            except uds.EngineNotRunning as exc:
                raise HTTPException(status_code=503, detail=str(exc))

        @app.get("/api/events")
        def events(
            n: int = 50,
            _caller: str = Depends(require_subject),
        ) -> list[dict[str, Any]]:
            try:
                return uds.events(n=n, start=root)
            except uds.EngineNotRunning as exc:
                raise HTTPException(status_code=503, detail=str(exc))

        return app

    async def serve(self) -> None:
        app = self._build_app()
        config = Config(
            app, host=self.host, port=self.port, log_level="warning",
        )
        self._server = _NoSignalServer(config)
        serve_task = asyncio.create_task(self._server.serve())
        try:
            await self.halting.wait()
        finally:
            self._server.should_exit = True
            try:
                await asyncio.wait_for(serve_task, timeout=5.0)
            except asyncio.TimeoutError:
                serve_task.cancel()


class _NoSignalServer(Server):
    """Uvicorn server that doesn't install signal handlers — the
    bridge owns SIGINT/SIGTERM via its ``halting`` event."""

    def install_signal_handlers(self) -> None:
        return


__all__ = ["WebBridge"]
