"""Message — ephemeral fiber sent through a Channel.

Per ``pyfars/objects/channel.md`` and ``concepts/event.md``: a Message
is a *query or extension fiber* presented to an entity. Messages are
ephemeral — they may be persisted as :class:`Event` (and thus
:class:`Witness`) records when operationally significant, or they may
flow through a channel and dissolve once consumed.

The system distinction:

- **Witnessed messages** become Events. They are append-only in the
  log; their system residue persists.
- **Ephemeral messages** flow through a :class:`Channel`'s buffer and
  vanish once consumed. The channel's retention discipline (durable /
  ephemeral / bounded) decides which are which.

A Message carries enough provenance to convert into an Event when the
runtime decides to persist it (typically when the channel is durable
or the message is on an audit channel).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _new_message_id() -> str:
    return uuid4().hex[:16]


class Message(BaseModel):
    """One message flowing through a channel."""

    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    id: str = Field(default_factory=_new_message_id)
    """Unique within the channel for the duration the message is
    retained. Uniqueness across-channels not guaranteed."""

    channel: str
    """Slug of the :class:`Channel` this message was sent on."""

    sender: str | None = None
    """Slug of the sending agent / office / external principal.
    None for system-generated messages."""

    recipient: str | None = None
    """Optional target. None = broadcast to every subscriber."""

    sent_at: str = Field(default_factory=_utcnow_iso, alias="sent-at")

    payload: dict[str, Any] = Field(default_factory=dict)
    """The message's content. Channel-specific schema; the channel's
    ``message-schema`` field documents what shape this should hold."""

    in_reply_to: str | None = Field(default=None, alias="in-reply-to")
    """Optional message id this message responds to. Threading
    primitive — channels that carry conversations can reconstruct
    the chain."""

    persisted: bool = False
    """True when the channel's retention discipline has caused this
    message to be persisted as an Event. Set by :class:`ChannelStore`
    on commit; consumers can use this to distinguish 'still in flight'
    from 'committed to the audit trail'."""

    @property
    def is_broadcast(self) -> bool:
        return self.recipient is None


__all__ = ["Message"]
