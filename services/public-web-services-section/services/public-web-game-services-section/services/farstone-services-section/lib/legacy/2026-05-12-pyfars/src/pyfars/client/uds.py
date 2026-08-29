"""HTTP-over-UDS client for talking to a running engine.

External processes (CLI verbs, web apps, MCP bridges, federation peers
on the local box) reach the engine through
``<polity-root>/.pyfars/run.sock``. Routes mirror ``engine.server``:

  GET  /status / /cells / /value / /subjects-of-type / /events
  POST /witness

Mutations happen by POSTing a witness; closure rules in the polity
respond. There is no separate "mutate cell" endpoint by design — the
witness IS the mutation request, and the substrate decides what it
means.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Iterable

import httpx


class EngineNotRunning(RuntimeError):
    """Raised when no ``.pyfars/run.sock`` is found on the upward walk."""


def find_socket(start: Path | None = None) -> Path:
    """Walk parents from ``start`` looking for ``.pyfars/run.sock``."""
    cur = (start or Path.cwd()).resolve()
    while True:
        candidate = cur / ".pyfars" / "run.sock"
        if candidate.exists():
            return candidate
        if cur.parent == cur:
            raise EngineNotRunning(
                f"no .pyfars/run.sock found upward from {start or Path.cwd()}"
            )
        cur = cur.parent


def _client(socket_path: Path) -> httpx.Client:
    return httpx.Client(
        transport=httpx.HTTPTransport(uds=str(socket_path)),
        base_url="http://localhost",
        timeout=30.0,
    )


def status(*, start: Path | None = None) -> dict[str, Any]:
    with _client(find_socket(start)) as c:
        r = c.get("/status"); r.raise_for_status()
        return r.json()


def cells(subject: str, *, start: Path | None = None) -> list[dict[str, str]]:
    with _client(find_socket(start)) as c:
        r = c.get("/cells", params={"subject": subject}); r.raise_for_status()
        return r.json()


def value(s: str, p: str, o: str, *, start: Path | None = None) -> str:
    with _client(find_socket(start)) as c:
        r = c.get("/value", params={"s": s, "p": p, "o": o}); r.raise_for_status()
        return r.json()["value"]


def subjects_of_type(types: Iterable[str], *, start: Path | None = None) -> list[str]:
    with _client(find_socket(start)) as c:
        r = c.get("/subjects-of-type", params={"types": ",".join(types)})
        r.raise_for_status()
        return r.json()


def post_witness(witness: dict[str, Any], *, start: Path | None = None) -> dict[str, Any]:
    with _client(find_socket(start)) as c:
        r = c.post("/witness", json=witness); r.raise_for_status()
        return r.json()


def events(n: int = 50, *, start: Path | None = None) -> list[dict[str, Any]]:
    with _client(find_socket(start)) as c:
        r = c.get("/events", params={"n": n}); r.raise_for_status()
        return r.json()


__all__ = [
    "EngineNotRunning",
    "cells",
    "events",
    "find_socket",
    "post_witness",
    "status",
    "subjects_of_type",
    "value",
]
