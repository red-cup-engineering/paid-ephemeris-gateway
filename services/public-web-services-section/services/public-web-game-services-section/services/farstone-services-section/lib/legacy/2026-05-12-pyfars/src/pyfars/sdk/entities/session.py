"""Session — the polity's recorded engagement with a human or external system.

Per ``concepts/polity.md``, a session is a polity entity: it has an
office binding, a duration, and a witness footprint. Per PyFARS's
session-and-memory discipline, a session's working state is *structured*
(named sections), not free-form prose — the Cline Memory-Bank shape
(``product_context``, ``active_context``, ``progress``,
``decision_log``, ``system_patterns``) plus a mutable ``custom`` dict
for per-office extension.

The three memory tiers identified by the discipline live elsewhere in
PyFARS:

  1. always-loaded — the office/agent fiber loaded at investiture.
  2. searchable — the engine's event log (``events.jsonl``) keyed by
     channel / origin / operator.
  3. deep-storage — the polity's directory.

This entity fills the missing piece: an explicit, structured Session
typed-view, save/resume to JSON so a session's working state survives
disconnection. Consolidation (the OpenClaw "dreaming" pattern,
``respond(observations, observations) → instincts``) is intentionally
out of scope here; this is the storage primitive on which a
consolidator can later operate.
"""
from __future__ import annotations

import json
import re
from collections.abc import Mapping
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


# Conservative slug: ASCII alnum, dash, underscore, dot allowed but no
# leading dot and no consecutive dots (rules out '.', '..', '.hidden'
# style traversal). The id flows directly into a filename, so this is
# the choke point.
_VALID_ID = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$")


# The five named Memory-Bank sections. Order is the canonical
# read-order at session start; do not reorder casually.
MEMORY_BANK_SECTIONS: tuple[str, ...] = (
    "product_context",
    "active_context",
    "progress",
    "decision_log",
    "system_patterns",
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class Session(BaseModel):
    """A resumable, structured session.

    Fields:
      id: stable session slug. Used in the on-disk filename.
      office: the office slug this session is bound to (what
        investiture loaded). ``None`` means unassigned.
      sections: the named Memory-Bank sections. Five canonical keys
        plus an optional ``custom`` dict for per-office extension.
      started_at: ISO-8601 UTC timestamp set when the session was
        first started.
      saved_at: ISO-8601 UTC timestamp of the most recent save, or
        ``None`` if never saved.

    The Memory-Bank sections are *named*, not free-form: a consumer
    asking ``session.sections["active_context"]`` always knows where
    that lives. The ``custom`` open dict is the explicit escape hatch
    for office-specific predicates the bank shape doesn't cover.
    """
    model_config = ConfigDict(extra="forbid")

    id: str
    office: str | None = None
    sections: dict[str, Any] = Field(default_factory=dict)
    started_at: str | None = None
    saved_at: str | None = None

    @field_validator("id")
    @classmethod
    def _validate_id(cls, value: str) -> str:
        if not isinstance(value, str) or not _VALID_ID.fullmatch(value) \
                or ".." in value:
            raise ValueError(
                f"invalid session id {value!r}: must be a slug "
                "([A-Za-z0-9_.-], no leading dot, no '..', ≤128 chars)"
            )
        return value

    def model_post_init(self, __context: Any) -> None:
        if "custom" in self.sections and not isinstance(
                self.sections["custom"], Mapping):
            raise TypeError(
                "session 'custom' section must be a mapping "
                f"(got {type(self.sections['custom']).__name__})"
            )
        for key in MEMORY_BANK_SECTIONS:
            self.sections.setdefault(key, "")
        self.sections.setdefault("custom", {})

    # ---- lifecycle ---------------------------------------------------

    def start(self) -> None:
        """Mark the session started.

        Idempotent on ``started_at``: a re-start preserves the
        original start timestamp (resuming an existing session is not
        the same as starting a new one).
        """
        if self.started_at is None:
            self.started_at = _now_iso()

    def save(self, path: Path) -> Path:
        """Serialize the session to JSON at ``path``.

        Returns the path written for callers that want to record it.
        """
        target = Path(path)
        self.saved_at = _now_iso()
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(
            json.dumps(self._to_dict(), indent=2, sort_keys=True),
            encoding="utf-8",
        )
        return target

    @classmethod
    def load(cls, path: Path, *, strict: bool = True) -> "Session":
        """Read a session from disk, restoring all named sections.

        With ``strict=True`` (default) the loader validates the
        on-disk shape: ``id`` is required and must be a valid slug,
        ``sections`` must be a mapping, ``custom`` (if present) must
        be a mapping, and any unknown top-level section key raises.
        Use ``strict=False`` to tolerate partial loads during
        migration — but unknown keys will be quarantined under
        ``sections['custom']['_unknown']`` rather than silently
        promoted to first-class state.
        """
        raw = json.loads(Path(path).read_text(encoding="utf-8"))
        if not isinstance(raw, Mapping):
            raise ValueError(f"session file {path} is not a JSON object")
        if "id" not in raw:
            raise ValueError(f"session file {path} missing required 'id'")
        sections_in = raw.get("sections", {})
        if not isinstance(sections_in, Mapping):
            raise ValueError(
                f"session file {path}: 'sections' must be an object"
            )
        if "custom" in sections_in and not isinstance(
                sections_in["custom"], Mapping):
            raise ValueError(
                f"session file {path}: 'sections.custom' must be an "
                f"object (got {type(sections_in['custom']).__name__})"
            )
        allowed = set(MEMORY_BANK_SECTIONS) | {"custom"}
        unknown = {k: v for k, v in sections_in.items()
                   if k not in allowed}
        clean = {k: v for k, v in sections_in.items() if k in allowed}
        if unknown:
            if strict:
                raise ValueError(
                    f"session file {path}: unknown top-level section "
                    f"keys {sorted(unknown)} (allowed: "
                    f"{sorted(allowed)}); use strict=False to "
                    "quarantine them under custom._unknown"
                )
            quarantine = dict(clean.get("custom", {}) or {})
            quarantine.setdefault("_unknown", {}).update(unknown)
            clean["custom"] = quarantine
        return cls(
            id=raw["id"],
            office=raw.get("office"),
            sections=clean,
            started_at=raw.get("started_at"),
            saved_at=raw.get("saved_at"),
        )

    # ---- structured-section access -----------------------------------

    def update_section(self, name: str, value: Any) -> None:
        """Replace one named section's value.

        ``name`` must be one of ``MEMORY_BANK_SECTIONS`` or
        ``"custom"``; the discipline is explicit that memory is
        structured, not free-form, so introducing a new top-level key
        would defeat the point. Use ``set_custom`` to extend within
        ``custom``.
        """
        if name not in MEMORY_BANK_SECTIONS and name != "custom":
            raise KeyError(
                f"unknown memory-bank section: {name!r}. "
                f"Valid: {MEMORY_BANK_SECTIONS + ('custom',)}"
            )
        self.sections[name] = value

    def set_custom(self, key: str, value: Any) -> None:
        """Set one entry in the ``custom`` open dict."""
        custom = self.sections.setdefault("custom", {})
        if not isinstance(custom, Mapping):
            raise TypeError("session 'custom' section is not a dict; "
                            "load corrupted state?")
        custom[key] = value

    # ---- internals ---------------------------------------------------

    def _to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "office": self.office,
            "sections": self.sections,
            "started_at": self.started_at,
            "saved_at": self.saved_at,
        }


__all__ = ["MEMORY_BANK_SECTIONS", "Session"]
