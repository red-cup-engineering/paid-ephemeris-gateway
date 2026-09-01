"""Serialize corpus data structures to a stable JSON shape.

Handles dataclass instances (Flatfile, Diagnostic, Predication, …), Path objects,
and plain mappings/sequences. Output is one JSON document with a
top-level ``payload`` key plus optional ``meta`` for per-call context.
"""
from __future__ import annotations

import dataclasses
import json
from pathlib import Path
from typing import Any


def _default(obj: Any):
    if dataclasses.is_dataclass(obj):
        return dataclasses.asdict(obj)
    if isinstance(obj, Path):
        return str(obj).replace("\\", "/")
    if isinstance(obj, set):
        return sorted(obj)
    raise TypeError(f"not JSON-serializable: {type(obj).__name__}")


def dump(payload: Any, *, meta: dict | None = None, indent: int = 2) -> str:
    doc: dict = {"payload": payload}
    if meta is not None:
        doc["meta"] = meta
    return json.dumps(doc, default=_default, indent=indent, ensure_ascii=False)
