"""PeerRecord — system entity holding one federation peer from this node's perspective.

Per ``peer-record``: a peer's existence in this node's federation is
*the existence of this PeerRecord*; revoking a peer is an edit on the
record, admitting a new peer is the creation of a new record. There
is no out-of-band peer-table.

The record carries identity, a ``credential`` reference (the
:class:`Credential` slug whose ``public-key`` cell holds the verifying
key), agreed-vocabulary, per-pair monotonic ordinal counters,
pending-outbound queue, and transport-records — every state a
federation program needs to verify, dedup, merge, and route envelopes
for one peer. The verifying key itself lives on the
:class:`Credential` record; per-peer authorization (whether to admit
inbound from this peer at all) lives in the system as
:class:`JuralRelation` cells over the peer's holdings — not as a
``trust_grade`` field on this record.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict


VocabularyMismatchPolicy = Literal["reject", "bridge", "quarantine", "renegotiate"]


class TransportBinding(BaseModel):
    """One transport binding declaring how to reach this peer.

    Inline rather than a separate TransportRecord entity for now;
    promote when peer-records need to share transports.
    """
    model_config = ConfigDict(extra="forbid")

    scheme: str
    """Transport scheme: ``http``, ``https``, ``filesystem``, ``libp2p``,
    ``activitypub``, ``a2a``, etc."""

    address: str
    """Scheme-specific address — URL, multiaddr, filesystem path, etc."""

    enabled: bool = True


class PeerRecord(BaseModel):
    """One federation peer's record at this node.

    ``peer_id`` is the canonical content-hash of the peer's identity
    (per ``peer-record``); for early use, an opaque slug is acceptable
    until identity-records land.
    """
    model_config = ConfigDict(extra="forbid")

    peer_id: str
    title: str = ""
    description: str = ""

    credential: str = ""
    """Slug of the :class:`Credential` (``kind: signing-key``) whose
    ``public-key`` cell verifies inbound envelope signatures from this
    peer. Empty when signatures are deferred."""

    agreed_vocabulary: tuple[str, ...] = ()
    """Predicate-ids this node admits from this peer. Empty rejects
    all cells envelopes per ``vocabulary_mismatch_policy``."""

    vocabulary_mismatch_policy: VocabularyMismatchPolicy = "reject"

    last_handshake_witness_hash: str = ""

    last_merged_ordinal: int = 0
    last_emitted_ordinal: int = 0
    pending_outbound: tuple[str, ...] = ()
    """Envelope-ids queued for delivery when the peer is unreachable."""

    transports: tuple[TransportBinding, ...] = ()

    def first_transport(
        self, *, scheme: str | None = None,
    ) -> TransportBinding | None:
        for t in self.transports:
            if not t.enabled:
                continue
            if scheme is None or t.scheme == scheme:
                return t
        return None


__all__ = [
    "PeerRecord",
    "TransportBinding",
    "VocabularyMismatchPolicy",
]
