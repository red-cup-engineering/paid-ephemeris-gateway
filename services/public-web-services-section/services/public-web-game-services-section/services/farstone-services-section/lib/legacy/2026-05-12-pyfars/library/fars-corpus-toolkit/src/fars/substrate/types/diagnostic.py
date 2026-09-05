"""A single problem found by a rule."""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

Severity = Literal["error", "warning"]


@dataclass(frozen=True)
class Diagnostic:
    code: str
    severity: Severity
    message: str
    path: Path | None = None
    line: int | None = None
    extra: dict[str, Any] = field(default_factory=dict)
