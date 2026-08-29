"""A citation entry — what a note declares it cites."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class Reference:
    key: str
    type: str
    fields: dict[str, Any] = field(default_factory=dict)
    source_path: str | None = None
    declared_inline: bool = False
