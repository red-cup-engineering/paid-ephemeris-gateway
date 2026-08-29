"""Channel records — system-resident named routing conduits.

Per ``pyfars/objects/channel.md``: a Channel is a system-resident
ordered stream of messages. Channels host messages sent through them;
subscribers listen on a channel and receive arrivals. Channels are
PyFARS's mechanism for system-mediated point-to-point and broadcast
communication.

Two related but distinct things both go through this entity type:

1. **Operation-typology channels** — the seven canonical channels per
   ``operator/kind.py``: observation, guard, accounting, query,
   mutation, analysis, learning. Witnesses tag themselves with one of
   these via the ``channel:`` field. They double as the seven kinds
   in the operation-kinds-completeness theorem.

2. **Messaging channels** — system-mediated streams between agents
   and offices: work-queue, audit, inter-office, external-bridge,
   coordination, and others. The polity authors these as needed.

A single :class:`Channel` class covers both via the ``kind`` field.
The seven standard channel records (Pass 1.F.2) are
``operation-typology`` channels; messaging channels are
``messaging`` kind by default.

Subscriber-set, message-ordering, and per-channel retention are
runtime concerns — system cells produced by closure rules on the
channel's slug. The Channel class itself is just the system
declaration of the conduit.
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Iterable, Literal

from pydantic import BaseModel, ConfigDict, Field


if TYPE_CHECKING:
    pass


ChannelKind = Literal[
    "operation-typology",  # one of the seven operator kinds
    "messaging",            # general system-resident message stream
    "external-bridge",      # mediates a non-system world
    "coordination",         # cross-instance synchronization
    "work-queue",           # workitem-dispatch messages
    "audit",                # audit-finding messages
    "inter-office",         # office-to-office command/response
]


RetentionDiscipline = Literal["durable", "ephemeral", "bounded"]


SEVEN_OPERATION_TYPOLOGY_CHANNELS: tuple[str, ...] = (
    "observation",
    "guard",
    "accounting",
    "query",
    "mutation",
    "analysis",
    "learning",
)
"""The canonical seven channels per operation-kinds-completeness.
Match the ``OperationKind`` literal in ``operator/kind.py``."""


class Channel(BaseModel):
    """One system-resident channel record.

    Mirrors the frontmatter shape used by records under
    ``objects/channels/<slug>.md``. Hyphenated keys are accepted via
    Pydantic field aliases.
    """
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    slug: str

    name: str = ""
    """Human-readable name. Defaults to slug if empty."""

    description: str = ""

    kind: ChannelKind = "messaging"
    """The channel's kind. ``operation-typology`` for the seven
    canonical operator-kind channels (observation/.../learning);
    other kinds for messaging channels per the polity's needs."""

    # --- Schema and policy ------------------------------------------

    message_schema: str | None = Field(default=None, alias="message-schema")
    """Optional shape predicate for messages. Loose channels accept
    any payload; tight channels validate against a named schema."""

    emit_policy: str | None = Field(default=None, alias="emit-policy")
    """Who is authorized to send. Free-form predicate or office-set
    reference. Out-of-policy sends produce audit-rejected witnesses."""

    read_policy: str | None = Field(default=None, alias="read-policy")
    """Who is authorized to subscribe. Out-of-policy reads produce
    audit-rejected witnesses."""

    # --- Retention --------------------------------------------------

    retention: RetentionDiscipline = "durable"
    """``durable`` — keep all messages indefinitely (audit-trail).
    ``ephemeral`` — evict after a window. ``bounded`` — keep a
    fixed-size message stream."""

    retention_window_seconds: int | None = Field(
        default=None, alias="retention-window-seconds",
    )
    """For ``ephemeral`` retention: window length. None = use polity
    default."""

    retention_size_messages: int | None = Field(
        default=None, alias="retention-size-messages",
    )
    """For ``bounded`` retention: max messages held. None = use
    polity default."""

    # --- Ordering ---------------------------------------------------

    ordering: Literal["total", "causal", "partial"] = "total"
    """Total order by send-moment is the default; causal-ordered and
    partially-ordered channels are admissible per concept doc."""

    # --- Body --------------------------------------------------------

    body: str = ""

    # --- Helpers -----------------------------------------------------

    @property
    def display_name(self) -> str:
        return self.name or self.slug

    def is_operation_typology(self) -> bool:
        """True iff this channel is one of the seven operator-kind
        canonical channels (its slug appears in
        :data:`SEVEN_OPERATION_TYPOLOGY_CHANNELS`)."""
        return (
            self.kind == "operation-typology"
            or self.slug in SEVEN_OPERATION_TYPOLOGY_CHANNELS
        )


__all__ = [
    "Channel",
    "ChannelKind",
    "RetentionDiscipline",
    "SEVEN_OPERATION_TYPOLOGY_CHANNELS",
]
