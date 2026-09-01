"""Federation operators — pure (store, inputs) → (store', outputs).

Per ``morphisms/emit-federation-envelope`` and
``morphisms/admit-federation-envelope`` in the FARS theory tree:

  - ``emit_envelope`` constructs an envelope from a peer-record and a
    payload-spec, assigns the next per-pair ordinal, computes the
    envelope-id, and returns the envelope alongside an updated
    peer-record (advanced ``last_emitted_ordinal``). The actual
    transport hand-off and on-disk reification are the program's job.

  - ``admit_envelope`` verifies envelope-id, deduplicates by id,
    vocabulary-checks per the peer-record's policy, folds cells into
    the store via knowledge-join, advances ``last_merged_ordinal``,
    and returns an outcome plus the updated peer-record.

Both operators are pure — no filesystem I/O, no witness-emission, no
event log. The calling program is responsible for:

  1. Reifying the envelope's canonical-JSON to disk (per
     ``event-sourcing`` file-first discipline).
  2. Emitting the witnesses the morphisms declare.
  3. Updating the peer-record in the system.

Keeping operators pure satisfies the kernel's invariant that operator
machinery doesn't reach into engine-side concerns; the program owns
those.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable, Literal

from pypredcalc import PredicationStore

from pyfars.sdk.entities.federation_envelope import (
    FederationCell,
    FederationEnvelope,
    FederationPayload,
)
from pyfars.sdk.entities.peer import PeerRecord


AdmissionOutcome = Literal[
    "admitted",
    "deduplicated",
    "rejected-wrong-recipient",
    "rejected-envelope-id-mismatch",
    "rejected-vocabulary-mismatch",
    "rejected-by-bridge-gate",
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(
        timespec="microseconds"
    ).replace("+00:00", "Z")


def emit_envelope(
    *,
    from_peer_id: str,
    peer: PeerRecord,
    cells: Iterable[FederationCell],
    operator_name: str = "",
    operand_content_hashes: Iterable[str] = (),
    rule_system_version: str = "",
    emitted_at: str | None = None,
    ordinal: int | None = None,
) -> tuple[FederationEnvelope, PeerRecord]:
    """Construct an outbound envelope; return it + updated peer-record.

    Assigns ``peer.last_emitted_ordinal + 1`` when ``ordinal`` is None;
    advances the peer's counter to ``max(current, ordinal)`` either
    way. The envelope-id is computed at construction.
    """
    cells_t = tuple(cells)
    next_ord = (
        peer.last_emitted_ordinal + 1 if ordinal is None else int(ordinal)
    )
    payload = FederationPayload(
        kind="cells",
        cells=cells_t,
        operator=operator_name,
        operand_content_hashes=tuple(operand_content_hashes),
        rule_system_version=rule_system_version,
    )
    envelope = FederationEnvelope(
        from_peer_id=from_peer_id,
        to_peer_id=peer.peer_id,
        ordinal=next_ord,
        payload=payload,
        emitted_at=emitted_at or _now_iso(),
    )
    new_peer = peer.model_copy(update={
        "last_emitted_ordinal": max(peer.last_emitted_ordinal, next_ord),
    })
    return envelope, new_peer


def admit_envelope(
    *,
    store: PredicationStore,
    envelope: FederationEnvelope,
    peer: PeerRecord,
    receiver_peer_id: str,
    seen_envelope_ids: set[str],
) -> tuple[PredicationStore, PeerRecord, AdmissionOutcome, int]:
    """Verify, dedup, merge cells, return (store', peer', outcome, n).

    ``n`` is the number of cells whose value *changed* under
    knowledge-join. The caller is responsible for:
      - Mutating ``seen_envelope_ids`` with the admitted id (this
        operator only reads it for the dedup check).
      - Witnessing each per-cell merge if needed.
      - Reifying the envelope's canonical-JSON to disk if needed.
    """
    # Step 0 — recipient routing gate.
    if envelope.to_peer_id != receiver_peer_id:
        return store, peer, "rejected-wrong-recipient", 0

    # Step 1 — verify envelope-id.
    if envelope.envelope_id != envelope.compute_envelope_id():
        return store, peer, "rejected-envelope-id-mismatch", 0

    # Per-peer authority gating happens *before* this operator, at the
    # bridge boundary via ``BridgeProgram.authorize_peer`` →
    # ``check-authorization`` against JuralRelation cells. The kernel
    # operator assumes the caller has already passed that gate.

    # Step 2 — dedup by envelope-id.
    if envelope.envelope_id in seen_envelope_ids:
        return store, peer, "deduplicated", 0

    # Step 3 — vocabulary check (for ``cells`` payloads).
    if envelope.payload.kind == "cells" and peer.agreed_vocabulary:
        allowed = set(peer.agreed_vocabulary)
        for cell in envelope.payload.cells:
            if cell.predicate not in allowed:
                if peer.vocabulary_mismatch_policy == "reject":
                    return store, peer, "rejected-vocabulary-mismatch", 0
                # bridge / quarantine / renegotiate paths handled by
                # the caller; this operator's job ends here.

    # Step 4 — merge cells via PredicationStore.insert (which is the
    # knowledge-join behavior pypredcalc guarantees per
    # closure-merge commutation lemma).
    cells_changed = 0
    new_store = store
    for cell in envelope.payload.cells:
        pred_cell = cell.to_predication_cell()
        before = new_store.get(pred_cell.subject,
                                pred_cell.predicate,
                                pred_cell.object)
        new_store = new_store.insert(pred_cell)
        after = new_store.get(pred_cell.subject,
                               pred_cell.predicate,
                               pred_cell.object)
        if after != before:
            cells_changed += 1

    # Step 5 — advance peer's last_merged_ordinal monotonically.
    new_peer = peer.model_copy(update={
        "last_merged_ordinal": max(
            peer.last_merged_ordinal, envelope.ordinal,
        ),
    })
    return new_store, new_peer, "admitted", cells_changed


__all__ = [
    "AdmissionOutcome",
    "admit_envelope",
    "emit_envelope",
]
