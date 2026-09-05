"""A2ABridge — PyFARS ↔ a2a (agent-to-agent protocol).

A *federation-bridge*: a2a peers speak Google's agent-to-agent JSON
RPC; we speak FOUR-valued predication cells. Translation is lossy in
both directions; the convergence theorem does not hold across this
boundary.

a2a is built around a few core message shapes:

  - **Task.** Caller asks the agent to perform some work. Includes a
    task-id, parameters, and a callback.
  - **TaskUpdate.** Agent reports progress or completion on a task,
    citing the task-id.
  - **AgentCard.** Discovery document declaring the agent's
    capabilities, endpoints, and metadata.

The bridge's translations:

  - **Inbound Task** → cells: ``(task:id, kind, a2a-task)``,
    ``(task:id, caller, peer:src)``, ``(task:id, parameters, json)``,
    ``(task:id, status, pending)``.
  - **Inbound TaskUpdate** → cells: ``(task:id, status, ...)``,
    ``(task:id, result, ...)``.
  - **Outbound** scans the system for cells declaring ``a2a-outbound``
    tasks / updates; translates back and POSTs.

Like ``ActivityPubBridge``, the translation depth is skeletal but the
shape is complete — HTTP server, JSON-RPC dispatch, vocabulary
translation hooks, persistence to filesystem inbox/outbox.
"""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Request
from pypredcalc import BilatticeValue, PredicationCell
from uvicorn import Config, Server

from pyfars.programs.bridge import BridgeProgram


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(
        timespec="seconds",
    ).replace("+00:00", "Z")


class A2ABridge(BridgeProgram):
    """a2a (agent-to-agent) federation-bridge."""

    def __init__(
        self,
        root: Path,
        *,
        agent_id: str,
        agent_name: str = "",
        host: str = "127.0.0.1",
        port: int = 8102,
        capabilities: list[str] | None = None,
    ) -> None:
        super().__init__(root)
        self.agent_id = agent_id
        self.agent_name = agent_name or agent_id
        self.host = host
        self.port = port
        self.capabilities = list(capabilities or [])
        self._server: Server | None = None

    # ---- HTTP app ---------------------------------------------------

    def _build_app(self) -> FastAPI:
        app = FastAPI(title="PyFARS a2a bridge")

        @app.get("/.well-known/agent.json")
        async def agent_card() -> dict[str, Any]:
            return self.agent_card()

        @app.post("/tasks")
        async def create_task(request: Request) -> dict[str, Any]:
            outcome = self.authorize_bearer(
                request.headers.get("authorization"), "a2a.create_task",
            )
            if not outcome.admitted:
                status = 401 if "missing" in outcome.reason else 403
                raise HTTPException(status_code=status, detail=outcome.reason)
            try:
                body = await request.json()
            except Exception:
                raise HTTPException(status_code=400, detail="invalid JSON")
            cells = self.task_to_cells(body)
            self._admit("a2a_task_received", body, cells)
            return {
                "task_id": body.get("task_id", ""),
                "status": "pending",
            }

        @app.post("/tasks/{task_id}/updates")
        async def update_task(
            task_id: str, request: Request,
        ) -> dict[str, Any]:
            outcome = self.authorize_bearer(
                request.headers.get("authorization"), "a2a.update_task",
            )
            if not outcome.admitted:
                status = 401 if "missing" in outcome.reason else 403
                raise HTTPException(status_code=status, detail=outcome.reason)
            try:
                body = await request.json()
            except Exception:
                raise HTTPException(status_code=400, detail="invalid JSON")
            body.setdefault("task_id", task_id)
            cells = self.update_to_cells(body)
            self._admit("a2a_task_update_received", body, cells)
            return {"acknowledged": True}

        return app

    # ---- a2a → cells ------------------------------------------------

    def task_to_cells(
        self, task: dict[str, Any],
    ) -> list[PredicationCell]:
        task_id = str(task.get("task_id", ""))
        caller = str(task.get("caller", ""))
        capability = str(task.get("capability", ""))
        params = task.get("parameters", {})
        if not task_id:
            return []
        out: list[PredicationCell] = [
            self._cell(task_id, "kind", "a2a-task"),
            self._cell(task_id, "status", "pending"),
        ]
        if caller:
            out.append(self._cell(task_id, "caller", caller))
        if capability:
            out.append(self._cell(task_id, "capability", capability))
        if params:
            out.append(self._cell(task_id, "parameters",
                                   json.dumps(params, sort_keys=True)))
        return out

    def update_to_cells(
        self, update: dict[str, Any],
    ) -> list[PredicationCell]:
        task_id = str(update.get("task_id", ""))
        status = str(update.get("status", ""))
        result = update.get("result")
        if not task_id:
            return []
        out: list[PredicationCell] = []
        if status:
            out.append(self._cell(task_id, "status", status))
        if result is not None:
            out.append(self._cell(task_id, "result",
                                   json.dumps(result, sort_keys=True)))
        out.append(self._cell(task_id, "last-update-at", _now_iso()))
        return out

    @staticmethod
    def _cell(
        subject: str, predicate: str, obj: str,
        *, value: BilatticeValue = BilatticeValue.T,
    ) -> PredicationCell:
        return PredicationCell(
            subject=subject,
            predicate=predicate,
            object=obj,
            value=value,
        )

    # ---- cells → a2a ------------------------------------------------

    def cells_to_task(
        self, *, task_id: str, fields: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "task_id": task_id,
            "caller": self.agent_id,
            "capability": fields.get("capability", ""),
            "parameters": fields.get("parameters", {}),
            "created_at": fields.get("created_at", _now_iso()),
        }

    def cells_to_update(
        self, *, task_id: str, fields: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "task_id": task_id,
            "status": fields.get("status", ""),
            "result": fields.get("result"),
            "updated_at": fields.get("updated_at", _now_iso()),
        }

    # ---- admission --------------------------------------------------

    def _admit(
        self,
        operator: str,
        body: dict[str, Any],
        cells: list[PredicationCell],
    ) -> None:
        if not cells:
            self.emit(operator="a2a_quarantined",
                      details={"reason": "no-cells",
                               "body_keys": sorted(body.keys())},
                      kind="observation")
            return
        self._persist_inbound(operator, body, cells)
        self.emit(operator=operator,
                  details={"task_id": body.get("task_id", ""),
                           "cell_count": len(cells)})

    def _persist_inbound(
        self,
        operator: str,
        body: dict[str, Any],
        cells: list[PredicationCell],
    ) -> None:
        inbox_dir = self.root / ".pyfars" / "federation" / "a2a-inbox"
        inbox_dir.mkdir(parents=True, exist_ok=True)
        tid = str(body.get("task_id") or _now_iso())
        safe = "".join(c if c.isalnum() else "_" for c in tid)[:200]
        path = inbox_dir / f"{operator}-{safe}-{_now_iso()}.json"
        path.write_text(
            json.dumps({
                "operator": operator,
                "body": body,
                "cells": [
                    {"subject": c.subject, "predicate": c.predicate,
                     "object": c.object, "value": c.value.name}
                    for c in cells
                ],
                "received_at": _now_iso(),
            }, sort_keys=True, indent=2),
            encoding="utf-8",
        )

    # ---- outbound ---------------------------------------------------

    async def call_task(
        self,
        *,
        peer_address: str,
        task_id: str,
        capability: str,
        parameters: dict[str, Any] | None = None,
    ) -> bool:
        """POST a task to a peer's ``/tasks`` endpoint."""
        body = self.cells_to_task(task_id=task_id, fields={
            "capability": capability,
            "parameters": parameters or {},
        })
        return await self._post(peer_address, "/tasks", body,
                                operator="a2a_task_emitted")

    async def push_update(
        self,
        *,
        peer_address: str,
        task_id: str,
        status: str,
        result: Any = None,
    ) -> bool:
        body = self.cells_to_update(task_id=task_id, fields={
            "status": status,
            "result": result,
        })
        endpoint = f"/tasks/{task_id}/updates"
        return await self._post(peer_address, endpoint, body,
                                operator="a2a_task_update_emitted")

    async def _post(
        self,
        peer_address: str,
        endpoint: str,
        body: dict[str, Any],
        *,
        operator: str,
    ) -> bool:
        url = peer_address.rstrip("/") + endpoint
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, json=body)
                ok = 200 <= resp.status_code < 300
        except Exception as exc:
            self.emit(operator=f"{operator}_failed",
                      details={"url": url,
                               "error": f"{type(exc).__name__}: {exc}"},
                      kind="observation")
            return False
        self.emit(operator=operator if ok else f"{operator}_failed",
                  details={"url": url,
                           "status_code": resp.status_code,
                           "task_id": body.get("task_id", "")},
                  kind="observation" if not ok else "mutation")
        return ok

    # ---- agent card -------------------------------------------------

    def agent_card(self) -> dict[str, Any]:
        return {
            "agent_id": self.agent_id,
            "name": self.agent_name,
            "endpoints": {
                "tasks": f"http://{self.host}:{self.port}/tasks",
            },
            "capabilities": list(self.capabilities),
            "protocol_version": "a2a/0.1",
        }

    # ---- bridge serve loop ------------------------------------------

    async def serve(self) -> None:
        app = self._build_app()
        config = Config(app, host=self.host, port=self.port,
                        log_level="warning")
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
    def install_signal_handlers(self) -> None:
        return


__all__ = ["A2ABridge"]
