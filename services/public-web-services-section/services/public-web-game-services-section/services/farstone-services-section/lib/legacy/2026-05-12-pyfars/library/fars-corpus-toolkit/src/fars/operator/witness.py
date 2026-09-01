"""Witness records — every operator emits one when it touches the substrate.

A ``Witness`` records what an operator did: the canonical hash of the
target before, the operator and its arguments, the canonical hash of
the target after, and a timestamp. Witnesses are the audit primitive of
the substrate: an auditor replaying the witness chain reconstructs the
state evolution.

This module defines the ``Witness`` dataclass and helpers for hashing
and serialization. Operators in ``fars.operator.*`` produce witnesses
via ``make_witness``; the runtime ``fars.runtime.event_log`` appends
them to an event log.

The design is deliberately minimal — a witness is a flat record, not a
typed hierarchy of operator-specific subclasses. ``details`` is a free
dict carrying operator-specific arguments (key, value, source/dest path
for moves, etc.). This keeps the audit format stable while operators
evolve.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping


@dataclass(frozen=True)
class Witness:
    """A single operator invocation, recorded.

    Fields:
      operator: canonical name of the operator (e.g. "fm_add", "move_note").
      target: path operated on (relative to substrate root, as a string).
      before_hash: SHA-256 of the target's content before the operation,
        or ``None`` if the target did not exist.
      after_hash: SHA-256 of the target's content after, or ``None`` if
        the target was removed.
      details: operator-specific arguments (key, value, source/dest, ...).
        Must be JSON-serializable.
      timestamp: ISO-8601 UTC timestamp.
      agent: optional name of the agent invoking the operator.
    """
    operator: str
    target: str
    before_hash: str | None
    after_hash: str | None
    details: Mapping[str, Any] = field(default_factory=dict)
    timestamp: str = ""
    agent: str | None = None

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        # Force details to a plain dict for stable JSON serialization
        d["details"] = dict(self.details)
        return d

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), sort_keys=True, ensure_ascii=False)

    @classmethod
    def from_dict(cls, d: Mapping[str, Any]) -> "Witness":
        return cls(
            operator=d["operator"],
            target=d["target"],
            before_hash=d.get("before_hash"),
            after_hash=d.get("after_hash"),
            details=dict(d.get("details") or {}),
            timestamp=d.get("timestamp", ""),
            agent=d.get("agent"),
        )


def hash_content(content: str | bytes | None) -> str | None:
    """SHA-256 hex digest of content, or None for missing content."""
    if content is None:
        return None
    if isinstance(content, str):
        content = content.encode("utf-8")
    return hashlib.sha256(content).hexdigest()


def hash_path(path: Path) -> str | None:
    """SHA-256 of file content at path, or None if the file is missing."""
    try:
        return hash_content(path.read_bytes())
    except FileNotFoundError:
        return None


def now_iso() -> str:
    """ISO-8601 UTC timestamp for witness records."""
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def make_witness(
    operator: str,
    target: Path | str,
    before_hash: str | None,
    after_hash: str | None,
    *,
    details: Mapping[str, Any] | None = None,
    agent: str | None = None,
) -> Witness:
    """Construct a Witness with a current timestamp.

    Operators in ``fars.operator.*`` are the canonical caller; they
    capture the before-hash before mutating, the after-hash after, and
    pass operator-specific arguments through ``details``.
    """
    return Witness(
        operator=operator,
        target=str(target),
        before_hash=before_hash,
        after_hash=after_hash,
        details=dict(details or {}),
        timestamp=now_iso(),
        agent=agent,
    )
