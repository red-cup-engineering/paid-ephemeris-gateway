"""FederationEnvelope / FederationCell — wire-portable cell records.

Per ``federation-envelope-record`` and ``federation-envelope``, the
envelope is *the only shape in which system content crosses a
sovereign-node boundary*. It is itself a system entity at both ends:
the sender reifies it before transmission; the receiver reifies it
after admission. The wire bytes are the canonical-JSON of the
envelope, and the envelope-id is the canonical-JSON SHA-256.

Cells carried in an envelope use the canonical (subject, predicate,
object) shape — same as ``pypredcalc.PredicationCell`` — so admitted
cells go directly into the receiver's ``PredicationStore`` via
``insert`` without re-keying.

Hash discipline: ``envelope_id`` is the SHA-256 of canonical-JSON
over the id-fields *only* (from_peer_id, to_peer_id, ordinal,
payload, emitted_at). Receiver-side fields (admitted_at, signature
verification status) are excluded so two byte-equivalent envelopes
from byte-equivalent emit calls always produce the same id.

Signatures are not yet implemented (Ed25519 key custody is its own
substrate work); the ``signature`` field is present as a schema slot
for when keys land, and is excluded from the id-fields so adding
signatures later doesn't shift existing envelope-ids.
"""
from __future__ import annotations

import hashlib
import json
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pypredcalc import BilatticeValue, PredicationCell


PayloadKind = Literal[
    "cells",
    "vocabulary-manifest",
    "vocabulary-agreement",
    "request-operand",
    "operand-response",
    "retraction",
]


_CANONICAL_JSON_KW: dict[str, Any] = {
    "sort_keys": True,
    "separators": (",", ":"),
    "ensure_ascii": True,
}


def canonical_json(obj: Any) -> bytes:
    """Canonical-JSON bytes for hashing per ``canonical-form``."""
    return json.dumps(obj, **_CANONICAL_JSON_KW).encode("ascii")


def sha256_hex(data: bytes) -> str:
    """Hex SHA-256 — the canonical hash function for envelope-ids."""
    return hashlib.sha256(data).hexdigest()


class FederationCell(BaseModel):
    """One predication cell as it crosses a sovereign-node boundary.

    The triple shape (subject, predicate, object) is the canonical
    cell shape from ``pypredcalc.PredicationCell``; the wire form
    serializes ``value`` as its enum name (``BOT``/``T``/``F``/``TOP``)
    so the canonical bytes depend on the algebra symbol, not on the
    enum's positional index.

    ``provenance`` is the upstream witness/content chain the sender
    claims for this cell — at minimum, the content-hashes of the
    operands the sender's emit operator was applied to.
    """
    model_config = ConfigDict(extra="forbid", frozen=True)

    subject: str
    predicate: str
    object: str
    value: BilatticeValue
    provenance: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return {
            "subject": self.subject,
            "predicate": self.predicate,
            "object": self.object,
            "value": self.value.name,
            "provenance": list(self.provenance),
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "FederationCell":
        return cls(
            subject=str(d["subject"]),
            predicate=str(d["predicate"]),
            object=str(d["object"]),
            value=BilatticeValue[str(d["value"])],
            provenance=tuple(str(p) for p in d.get("provenance", ())),
        )

    def to_predication_cell(self) -> PredicationCell:
        """Lift to the kernel's native cell type for store insertion."""
        return PredicationCell(
            subject=self.subject,
            predicate=self.predicate,
            object=self.object,
            value=self.value,
        )

    @classmethod
    def from_predication_cell(
        cls,
        cell: PredicationCell,
        *,
        provenance: tuple[str, ...] = (),
    ) -> "FederationCell":
        return cls(
            subject=str(cell.subject),
            predicate=str(cell.predicate),
            object=str(cell.object),
            value=cell.value,
            provenance=provenance,
        )


class FederationSignature(BaseModel):
    """Per-envelope signature attribution. Empty until key custody lands."""
    model_config = ConfigDict(extra="forbid", frozen=True)

    scheme: str = ""
    key_id: str = ""
    value: str = ""


class FederationPayload(BaseModel):
    """The envelope's payload: a kind plus the kind-specific content."""
    model_config = ConfigDict(extra="forbid", frozen=True)

    kind: PayloadKind
    cells: tuple[FederationCell, ...] = ()
    operator: str = ""
    operand_content_hashes: tuple[str, ...] = ()
    rule_system_version: str = ""
    content: dict[str, Any] = Field(default_factory=dict)
    """Kind-specific structured content for non-``cells`` payloads."""

    @field_validator("cells")
    @classmethod
    def _cells_only_for_cells_kind(cls, v, info):
        # Pydantic v2 cross-field validators are awkward; the run-time
        # contract is: cells is non-empty iff kind == "cells". We don't
        # enforce here because partial payloads are admissible during
        # handshake; admit_envelope is the load-bearing check.
        return v

    def to_dict(self) -> dict[str, Any]:
        return {
            "kind": self.kind,
            "cells": [c.to_dict() for c in self.cells],
            "operator": self.operator,
            "operand_content_hashes": list(self.operand_content_hashes),
            "rule_system_version": self.rule_system_version,
            "content": self.content,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "FederationPayload":
        return cls(
            kind=d["kind"],
            cells=tuple(
                FederationCell.from_dict(c) for c in d.get("cells", [])
            ),
            operator=str(d.get("operator", "")),
            operand_content_hashes=tuple(
                str(h) for h in d.get("operand_content_hashes", [])
            ),
            rule_system_version=str(d.get("rule_system_version", "")),
            content=dict(d.get("content", {})),
        )


# Fields that participate in envelope-id computation, in canonical
# order. Listed explicitly (not derived from model fields) so adding
# a new field to FederationEnvelope is an intentional hash-discipline
# change rather than a silent break.
ENVELOPE_ID_FIELDS: tuple[str, ...] = (
    "from_peer_id",
    "to_peer_id",
    "ordinal",
    "payload",
    "emitted_at",
)


class FederationEnvelope(BaseModel):
    """A system-level federation envelope.

    Per ``federation-envelope-record``: the wire-portable record of
    one substrate operation crossing a sovereign-node boundary. The
    sender reifies it before transmission; the receiver reifies it
    after admission.

    Invariants:
      - **Hash-stable.** ``envelope_id`` is the canonical-JSON SHA-256
        of ``ENVELOPE_ID_FIELDS`` *excluding* ``envelope_id`` itself,
        ``admitted_at``, and ``signature``. Two byte-equivalent
        envelopes from byte-equivalent emit calls have the same id.
      - **Frozen after construction.** Edits go through new envelopes.
      - **Recipient-routed.** ``to_peer_id`` is a single peer; multi-
        recipient is encoded as multiple envelopes per receiver.
    """
    model_config = ConfigDict(extra="forbid", frozen=True)

    from_peer_id: str
    to_peer_id: str
    ordinal: int
    payload: FederationPayload
    emitted_at: str
    envelope_id: str = ""
    """Canonical-JSON SHA-256 over ``ENVELOPE_ID_FIELDS``. Computed
    when empty; required to match the canonical recomputation when
    supplied."""

    admitted_at: str = ""
    """Receiver-side admission timestamp; not in the id-fields."""

    signature: FederationSignature = FederationSignature()
    """Signature attribution; deferred (empty fields ok for now)."""

    @field_validator("ordinal")
    @classmethod
    def _ordinal_nonneg(cls, v: int) -> int:
        if v < 0:
            raise ValueError(f"ordinal={v} must be >= 0")
        return v

    def model_post_init(self, __context: Any) -> None:
        computed = self.compute_envelope_id()
        if self.envelope_id == "":
            # frozen=True blocks normal assignment; use object.__setattr__
            object.__setattr__(self, "envelope_id", computed)
        elif self.envelope_id != computed:
            raise ValueError(
                f"envelope_id={self.envelope_id!r} does not match "
                f"canonical content-hash {computed!r}"
            )

    def _id_payload(self) -> dict[str, Any]:
        return {
            "from_peer_id": self.from_peer_id,
            "to_peer_id": self.to_peer_id,
            "ordinal": self.ordinal,
            "payload": self.payload.to_dict(),
            "emitted_at": self.emitted_at,
        }

    def compute_envelope_id(self) -> str:
        return sha256_hex(canonical_json(self._id_payload()))

    def to_canonical_json(self) -> bytes:
        d = self._id_payload()
        d["envelope_id"] = self.envelope_id
        if self.signature.value:
            d["signature"] = self.signature.model_dump()
        return canonical_json(d)

    @classmethod
    def from_canonical_json(
        cls, data: bytes | str,
    ) -> "FederationEnvelope":
        d = json.loads(data)
        return cls(
            from_peer_id=str(d["from_peer_id"]),
            to_peer_id=str(d["to_peer_id"]),
            ordinal=int(d["ordinal"]),
            payload=FederationPayload.from_dict(d["payload"]),
            emitted_at=str(d["emitted_at"]),
            envelope_id=str(d.get("envelope_id", "")),
            signature=FederationSignature(**d.get("signature", {})),
        )


__all__ = [
    "ENVELOPE_ID_FIELDS",
    "FederationCell",
    "FederationEnvelope",
    "FederationPayload",
    "FederationSignature",
    "PayloadKind",
    "canonical_json",
    "sha256_hex",
]
