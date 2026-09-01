"""Witness records — every operator emits one when it touches the system.

A ``Witness`` records what an operator did: the canonical hash of the
target before, the operator and its arguments, the canonical hash of
the target after, and a timestamp. Witnesses are the audit primitive of
the system: an auditor replaying the witness chain reconstructs the
system's state evolution.

This module defines the ``Witness`` Pydantic model and helpers for
hashing and serialization. Operators in ``pyfars.kernel.operator.*``
produce witnesses via ``make_witness``; ``pyfars.kernel.event_log``
appends them to the on-disk JSONL log. Witness composes with
``pyfars.sdk.entities.event`` as its semantic dual (the typed view
the polity reads).

The design is deliberately minimal — a witness is a flat record, not a
typed hierarchy of operator-specific subclasses. ``details`` is a free
dict carrying operator-specific arguments (key, value, source/dest path
for moves, etc.). This keeps the audit format stable while operators
evolve.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

from pydantic import BaseModel, ConfigDict, Field, field_validator

from pyfars.kernel.operator.kind import OperationKind, classify, is_valid_kind


class Witness(BaseModel):
    """A single operator invocation, recorded.

    Fields:
      operator: canonical name of the operator (e.g. "fm_add", "move_note").
      target: path operated on (relative to system root, as a string).
      before_hash: SHA-256 of the target's content before the operation,
        or ``None`` if the target did not exist.
      after_hash: SHA-256 of the target's content after, or ``None`` if
        the target was removed.
      details: operator-specific arguments. Must be JSON-serializable.
      timestamp: ISO-8601 UTC timestamp.
      agent: optional name of the agent invoking the operator.
      acting_office: office the agent was occupying when the operator
        ran. ``check-authorization``'s working-fiber composition draws
        scope contributions from the agent's office; recording the
        office on the witness lets the audit chain reconstruct which
        office's authority gated the action.
      channel: named event stream (PAM event-log channels / FARS
        messaging-and-events analysis).
      origin: producing office/hook/process (LPMud's ``ORIGIN_*`` tag).
      truth, evidence: bilattice-valued belief axes in [0, 1].
      kind: one of the seven operation-kinds (per
        ``pyfars.kernel.operator.kind.OperationKind``).
    """
    model_config = ConfigDict(frozen=True, extra="forbid")

    operator: str
    target: str
    before_hash: str | None = None
    after_hash: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)
    timestamp: str = ""
    agent: str | None = None
    acting_office: str | None = None
    channel: str | None = None
    origin: str | None = None
    truth: float = 1.0
    evidence: float = 1.0
    kind: OperationKind = "mutation"

    @field_validator("truth", "evidence")
    @classmethod
    def _validate_bilattice_axis(cls, v: float) -> float:
        if not (0.0 <= float(v) <= 1.0):
            raise ValueError(
                f"value={v!r} out of range; "
                f"bilattice axes must lie in [0, 1]"
            )
        return float(v)

    @field_validator("kind")
    @classmethod
    def _validate_kind(cls, v: str) -> str:
        if not is_valid_kind(v):
            raise ValueError(
                f"kind={v!r} is not one of the seven "
                f"operation kinds (observation, guard, accounting, "
                f"query, mutation, analysis, learning)"
            )
        return v

    def to_dict(self) -> dict[str, Any]:
        d = self.model_dump(mode="python")
        d["details"] = dict(self.details)
        for optional in ("channel", "origin", "acting_office", "agent"):
            if d.get(optional) is None:
                d.pop(optional, None)
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
            acting_office=d.get("acting_office"),
            channel=d.get("channel"),
            origin=d.get("origin"),
            truth=float(d.get("truth", 1.0)),
            evidence=float(d.get("evidence", 1.0)),
            kind=d["kind"],
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
    acting_office: str | None = None,
    channel: str | None = None,
    origin: str | None = None,
    truth: float = 1.0,
    evidence: float = 1.0,
    kind: OperationKind | None = None,
) -> Witness:
    """Construct a Witness with a current timestamp.

    Operators in ``pyfars.kernel.operator.*`` are the canonical caller; they
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
        acting_office=acting_office,
        channel=channel,
        origin=origin,
        truth=truth,
        evidence=evidence,
        kind=kind if kind is not None else classify(operator, channel),
    )


def make_diagnosis_witness(
    target: Path | str,
    *,
    cause: str,
    failed_operator: str,
    suggested_response: str | None = None,
    related: Mapping[str, Any] | None = None,
    agent: str | None = None,
    origin: str | None = None,
) -> Witness:
    """Witness recording *why* a system operation failed.

    The Reflexion / FARS failure-diagnosis pattern: a failure produces a
    structured predication (``cause``, ``failed_operator``, optional
    ``suggested_response``) that the next dispatch can compose against,
    not just an opaque error code.
    """
    details: dict[str, Any] = {
        "failed_operator": failed_operator,
        "diagnosed_cause": cause,
    }
    if suggested_response:
        details["suggested_response"] = suggested_response
    if related:
        details["related"] = dict(related)
    return make_witness(
        operator="diagnose",
        target=target,
        before_hash=None,
        after_hash=None,
        details=details,
        agent=agent,
        channel="learning",
        origin=origin,
    )


def make_lesson_witness(
    pattern: str,
    *,
    suggested_action: str,
    evidence_count: int = 1,
    source_witnesses: list[str] | None = None,
    agent: str | None = None,
    origin: str | None = None,
) -> Witness:
    """Witness recording a *lesson* distilled from recurring observation.

    ``evidence_count`` populates the witness's ``evidence`` axis as
    ``1 - 1/(1+evidence_count)`` — monotonically increasing toward 1.0
    as more confirmations arrive — so consumers can sort lessons by
    strength of backing.
    """
    details: dict[str, Any] = {
        "pattern": pattern,
        "suggested_action": suggested_action,
        "evidence_count": int(evidence_count),
    }
    if source_witnesses:
        details["source_witnesses"] = list(source_witnesses)
    evidence = 1.0 - 1.0 / (1.0 + max(0, int(evidence_count)))
    return make_witness(
        operator="lesson",
        target=f"lesson/{pattern}",
        before_hash=None,
        after_hash=None,
        details=details,
        agent=agent,
        channel="learning",
        origin=origin,
        truth=1.0,
        evidence=evidence,
    )
