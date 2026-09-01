"""A lint suggestion: a Diagnostic with an optional auto-fix callable."""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Literal

Severity = Literal["error", "warning", "info"]


@dataclass
class Suggestion:
    code: str
    severity: Severity
    message: str
    path: Path | None = None
    apply: Callable[[], bool] | None = None
    extra: dict[str, Any] = field(default_factory=dict)
