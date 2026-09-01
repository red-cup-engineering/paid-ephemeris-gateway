"""Event records — the semantic dual of Witness.

Per ``pyfars/concepts/event.md``: every event in the system has an
*act* (what kind of doing), a *moment* (where in time), an *actor*
(who did it), affected *system cells*, and a *witness* (the JSONL
log entry — the system residue of the event). Witness is the
audit-side view (``verify-how``); Event is the semantic-side view
(``what-happened``).

The two are not parallel records; they are dual views of the same
operator invocation. ``Witness`` carries the byte-level replay shape
(operator, hashes, details). ``Event`` carries the interpretive shape
(act, moment, actor, affected cells, category, rationale).

Construction is via :meth:`Event.from_witness` — given a Witness and
the runtime-side context the Witness lacks (closure ordinal, cadence
position, parent-event id), an Event is the interpretation. The
system's JSONL log line for an Event IS its Witness; storing
``Event`` separately is an in-memory affordance, not a second
persistence path.

Categories per the concept doc: ``witness``, ``observation``, ``audit``,
``coordination``, ``control``. The classification mirrors but is
distinct from ``OperationKind`` (the seven channels). An event's
*category* describes its semantic role in the polity's life; its
*kind* (inherited from its Witness) describes its operator-typology
position.
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from pyfars.kernel.witness import Witness


EventCategory = Literal[
    "witness",
    "observation",
    "audit",
    "coordination",
    "control",
]


class Moment(BaseModel):
    """Temporal coordinate locating an event in the system's time.

    The 4-tuple of ``pyfars/concepts/moment.md``. Most events specify
    only ``wall_clock_ts`` and ``event_order_idx``; the closure
    ordinal and cadence position are derived or implicit until a
    closure-aware caller fills them in.
    """
    model_config = ConfigDict(frozen=True, extra="forbid")

    wall_clock_ts: str
    event_order_idx: int | None = None
    closure_ordinal: int = 0
    cadence_position: int | None = None


class Event(BaseModel):
    """An act located at a moment, with a witness, in the system.

    Fields:
      witness: the audit-side record of the same invocation. Acts as
        the canonical persistence path; ``Event`` exists as an
        in-memory semantic view.
      act: the abstract happening — typically the witness's
        ``operator`` name.
      moment: temporal coordinate (4-tuple); see :class:`Moment`.
      actor: the agent (or designated background actor) that caused
        the event. Typically matches ``witness.agent`` but may be
        the polity itself for system events.
      category: semantic classification (witness / observation /
        audit / coordination / control).
      cells: system cells the event introduced or modified, as
        ``(subject, predicate, object)`` triples.
      rationale: optional human-readable reason for the event.
      parent_event: optional identifier of a parent event for
        chained events (e.g. progress events under a process).
    """
    model_config = ConfigDict(frozen=True, extra="forbid")

    witness: Witness
    act: str
    moment: Moment
    actor: str | None = None
    category: EventCategory = "witness"
    cells: list[tuple[str, str, str]] = Field(default_factory=list)
    rationale: str | None = None
    parent_event: str | None = None

    @classmethod
    def from_witness(
        cls,
        witness: Witness,
        *,
        category: EventCategory = "witness",
        cells: list[tuple[str, str, str]] | None = None,
        rationale: str | None = None,
        parent_event: str | None = None,
        event_order_idx: int | None = None,
        closure_ordinal: int = 0,
        cadence_position: int | None = None,
    ) -> "Event":
        moment = Moment(
            wall_clock_ts=witness.timestamp,
            event_order_idx=event_order_idx,
            closure_ordinal=closure_ordinal,
            cadence_position=cadence_position,
        )
        return cls(
            witness=witness,
            act=witness.operator,
            moment=moment,
            actor=witness.agent,
            category=category,
            cells=list(cells or []),
            rationale=rationale,
            parent_event=parent_event,
        )

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump(mode="python")


__all__ = ["Event", "EventCategory", "Moment"]
