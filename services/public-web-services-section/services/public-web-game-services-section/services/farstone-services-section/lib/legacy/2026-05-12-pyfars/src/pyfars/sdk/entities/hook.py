"""Hook records — per-runtime intercept declarations.

A hook record under ``engineering/hooks/<slug>.md`` declares one
intercept point on a runtime's hook protocol (Claude Code's
``PreToolUse``, ``PostToolUse``, etc.). The hook harness for that
runtime renders the record into a runtime-specific projection
(settings.json bucket + dispatcher invocation).

Each Hook carries a ``runtime`` cell so a polity can declare hooks for
multiple runtimes side-by-side under the same engineering tree; the
matching harness filters by runtime and ignores records targeting
other runtimes.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class WitnessSpec(BaseModel):
    """Bilattice witness parameters for a hook firing."""
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    operator: str
    truth: float = 1.0
    evidence: float = 1.0
    channel: str = "dispatch"

    @field_validator("truth", "evidence")
    @classmethod
    def _check_axis(cls, v: float) -> float:
        if not 0.0 <= v <= 1.0:
            raise ValueError(
                f"bilattice axis must lie in [0, 1]; got {v!r}"
            )
        return v


class HookPattern(BaseModel):
    """Optional sentinel-pattern declaration on a hook."""
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    regex: str
    label: str = ""


class Hook(BaseModel):
    """One hook record."""
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    slug: str
    runtime: str
    event: str
    matcher: str = ".*"

    witness: WitnessSpec
    channel: str = "dispatch"
    on_truncation: Literal["warn", "block", "passthrough"] = Field(
        default="warn", alias="on-truncation",
    )
    patterns: list[HookPattern] = Field(default_factory=list)

    body: str = ""


__all__ = [
    "Hook",
    "HookPattern",
    "WitnessSpec",
]
