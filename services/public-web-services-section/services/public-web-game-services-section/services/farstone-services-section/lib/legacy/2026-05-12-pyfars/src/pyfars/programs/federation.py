"""FederationProgram — native PyFARS-to-PyFARS bridge.

Per the ``federation-convergence`` theorem: two systems sharing the
same closure-rule system, value-domain, predicate category, and
entity scope converge to the same state under bidirectional envelope
exchange in any order. This bridge is the program that runs the loop:

  1. Discover peer-records in the system.
  2. For each peer admitting inbound: poll the peer's inbox (per the
     peer's transport binding), parse envelopes, call the kernel's
     ``admit_envelope`` operator, witness the outcome.
  3. For each peer with pending outbound: load the queued envelopes,
     send via the peer's transport, mark them delivered.

Transports honored in this cut:

  - ``filesystem`` — envelopes appear as ``.json`` files in
    ``<root>/.pyfars/federation/inbox/<peer_id>/``; outbound writes
    to a path the peer reads.
  - ``http`` / ``https`` — POST envelopes to the peer's address;
    GET from the peer's address for inbound.

Per ``transport-tolerance-of-federation``, the algebra converges
regardless of which transport carries which envelope.

This bridge is *native* — it assumes both peers share the value-
domain (FOUR), so cells go through verbatim. For ActivityPub/a2a
peers, use ``ActivityPubBridge`` / ``A2ABridge`` instead — those
realize the federation-bridge vocabulary translation.
"""
from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any

import httpx

from pyfars.kernel.operator.federation import (
    AdmissionOutcome,
    admit_envelope,
    emit_envelope,
)
from pyfars.sdk.entities.federation_envelope import (
    FederationCell,
    FederationEnvelope,
)
from pyfars.sdk.entities.peer import PeerRecord, TransportBinding
from pyfars.programs.bridge import BridgeProgram


class FederationProgram(BridgeProgram):
    """Native PyFARS federation engine.

    Convergence-preserving per ``federation-convergence``; transport-
    pluggable per ``transport-tolerance-of-federation``.
    """

    def __init__(
        self,
        root: Path,
        *,
        peer_id: str,
        peers: list[PeerRecord] | None = None,
        poll_interval: float = 5.0,
    ) -> None:
        super().__init__(root)
        self.peer_id = peer_id
        self.peers: list[PeerRecord] = list(peers or ())
        self.poll_interval = poll_interval
        self._seen_envelope_ids: set[str] = set()

    # ---- directory layout -------------------------------------------

    def _inbox_dir(self, peer_id: str) -> Path:
        return self.root / ".pyfars" / "federation" / "inbox" / peer_id

    def _outbox_dir(self, peer_id: str) -> Path:
        return self.root / ".pyfars" / "federation" / "outbound" / peer_id

    def _archive_dir(self, peer_id: str) -> Path:
        return self.root / ".pyfars" / "federation" / "archive" / peer_id

    # ---- inbound ----------------------------------------------------

    async def _poll_peer_inbox(self, peer: PeerRecord) -> None:
        for envelope_bytes in self._read_inbox(peer):
            try:
                envelope = FederationEnvelope.from_canonical_json(
                    envelope_bytes,
                )
            except Exception as exc:
                self.emit(operator="federation_envelope_parse_failed",
                          details={"peer_id": peer.peer_id,
                                   "error": f"{type(exc).__name__}: {exc}"},
                          kind="observation")
                continue
            self._admit(envelope, peer)

    def _read_inbox(self, peer: PeerRecord) -> list[bytes]:
        out: list[bytes] = []
        for binding in peer.transports:
            if not binding.enabled:
                continue
            if binding.scheme == "filesystem":
                out.extend(self._read_filesystem_inbox(peer))
            # http/https inbox is server-shaped — incoming requests
            # land via the running HTTP server; not polled. The HTTP
            # serving variant is realized in ``ActivityPubBridge`` and
            # below for a future native-HTTP transport.
        return out

    def _read_filesystem_inbox(self, peer: PeerRecord) -> list[bytes]:
        inbox = self._inbox_dir(peer.peer_id)
        if not inbox.is_dir():
            return []
        out: list[bytes] = []
        for path in sorted(inbox.iterdir()):
            if path.suffix != ".json" or not path.is_file():
                continue
            try:
                out.append(path.read_bytes())
            except OSError as exc:
                self.emit(operator="federation_inbox_read_failed",
                          details={"peer_id": peer.peer_id,
                                   "path": str(path),
                                   "error": str(exc)},
                          kind="observation")
                continue
            self._archive_envelope(peer.peer_id, path)
        return out

    def _archive_envelope(self, peer_id: str, path: Path) -> None:
        archive = self._archive_dir(peer_id)
        archive.mkdir(parents=True, exist_ok=True)
        try:
            path.rename(archive / path.name)
        except OSError:
            pass

    def _admit(
        self, envelope: FederationEnvelope, peer: PeerRecord,
    ) -> AdmissionOutcome:
        sig = envelope.signature
        if not sig.value or not sig.key_id or sig.scheme != "ed25519":
            self.emit(operator="federation_envelope_rejected",
                      details={"envelope_id": envelope.envelope_id,
                               "from_peer_id": envelope.from_peer_id,
                               "reason": "envelope missing or unsupported signature"},
                      kind="observation")
            return "rejected-by-bridge-gate"
        from pyfars.kernel.operator.auth import verify_ed25519
        if not verify_ed25519(
            sig.key_id, envelope.envelope_id.encode("utf-8"), sig.value,
        ):
            self.emit(operator="federation_envelope_rejected",
                      details={"envelope_id": envelope.envelope_id,
                               "from_peer_id": envelope.from_peer_id,
                               "reason": "signature verification failed"},
                      kind="observation")
            return "rejected-by-bridge-gate"
        call = self.authorize_peer(
            sig.key_id,
            "federation.admit_envelope",
            session=envelope.envelope_id,
        )
        if not call.admitted:
            self.emit(operator="federation_envelope_rejected",
                      details={"envelope_id": envelope.envelope_id,
                               "from_peer_id": envelope.from_peer_id,
                               "reason": call.reason,
                               "decision": call.decision},
                      kind="observation")
            return "rejected-by-bridge-gate"
        new_store, new_peer, outcome, n = admit_envelope(
            store=self.system.store,
            envelope=envelope,
            peer=peer,
            receiver_peer_id=self.peer_id,
            seen_envelope_ids=self._seen_envelope_ids,
        )
        if outcome == "admitted":
            self._seen_envelope_ids.add(envelope.envelope_id)
            self._update_peer(new_peer)
        operator = {
            "admitted": "federation_envelope_admitted",
            "deduplicated": "federation_envelope_deduplicated",
            "rejected-wrong-recipient": "federation_envelope_rejected",
            "rejected-envelope-id-mismatch": "federation_envelope_rejected",
            "rejected-vocabulary-mismatch": "federation_envelope_rejected",
            "rejected-by-bridge-gate": "federation_envelope_rejected",
        }[outcome]
        truth = 1.0 if outcome in ("admitted", "deduplicated") else 0.0
        self.emit(operator=operator,
                  details={"envelope_id": envelope.envelope_id,
                           "from_peer_id": envelope.from_peer_id,
                           "to_peer_id": envelope.to_peer_id,
                           "ordinal": envelope.ordinal,
                           "cell_count": len(envelope.payload.cells),
                           "cells_merged": n,
                           "outcome": outcome},
                  kind="observation" if outcome != "admitted" else "mutation")
        return outcome

    def _update_peer(self, peer: PeerRecord) -> None:
        for i, p in enumerate(self.peers):
            if p.peer_id == peer.peer_id:
                self.peers[i] = peer
                return
        self.peers.append(peer)

    # ---- outbound ---------------------------------------------------

    def queue_envelope(
        self,
        *,
        peer: PeerRecord,
        cells: list[FederationCell],
        operator_name: str = "",
    ) -> FederationEnvelope:
        """Construct an outbound envelope; persist it; advance the peer.

        Returns the envelope so the caller can hand it to a transport
        (or wait for the bridge's serve loop to drain it).
        """
        envelope, new_peer = emit_envelope(
            from_peer_id=self.peer_id,
            peer=peer,
            cells=cells,
            operator_name=operator_name,
        )
        self._update_peer(new_peer)
        self._persist_outbound(envelope)
        self.emit(operator="federation_envelope_emitted",
                  details={"envelope_id": envelope.envelope_id,
                           "to_peer_id": envelope.to_peer_id,
                           "ordinal": envelope.ordinal,
                           "cell_count": len(envelope.payload.cells)})
        return envelope

    def _persist_outbound(self, envelope: FederationEnvelope) -> None:
        outbox = self._outbox_dir(envelope.to_peer_id)
        outbox.mkdir(parents=True, exist_ok=True)
        path = outbox / f"{envelope.envelope_id}.json"
        path.write_bytes(envelope.to_canonical_json())

    async def _drain_outbound(self, peer: PeerRecord) -> None:
        outbox = self._outbox_dir(peer.peer_id)
        if not outbox.is_dir():
            return
        for path in sorted(outbox.iterdir()):
            if path.suffix != ".json" or not path.is_file():
                continue
            try:
                envelope = FederationEnvelope.from_canonical_json(
                    path.read_bytes(),
                )
            except Exception:
                continue
            if await self._send(peer, envelope):
                try:
                    path.unlink()
                except OSError:
                    pass

    async def _send(
        self, peer: PeerRecord, envelope: FederationEnvelope,
    ) -> bool:
        binding = peer.first_transport()
        if binding is None:
            return False
        if binding.scheme == "filesystem":
            return self._send_filesystem(binding, envelope)
        if binding.scheme in ("http", "https"):
            return await self._send_http(binding, envelope)
        self.emit(operator="federation_transport_unknown",
                  details={"peer_id": peer.peer_id,
                           "scheme": binding.scheme},
                  kind="observation")
        return False

    def _send_filesystem(
        self, binding: TransportBinding, envelope: FederationEnvelope,
    ) -> bool:
        target = Path(binding.address) / f"{envelope.envelope_id}.json"
        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(envelope.to_canonical_json())
            return True
        except OSError as exc:
            self.emit(operator="federation_send_failed",
                      details={"scheme": "filesystem",
                               "address": binding.address,
                               "error": str(exc)},
                      kind="observation")
            return False

    async def _send_http(
        self, binding: TransportBinding, envelope: FederationEnvelope,
    ) -> bool:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    binding.address,
                    content=envelope.to_canonical_json(),
                    headers={
                        "Content-Type":
                            "application/predicated.envelope+json",
                    },
                )
                return 200 <= resp.status_code < 300
        except Exception as exc:
            self.emit(operator="federation_send_failed",
                      details={"scheme": binding.scheme,
                               "address": binding.address,
                               "error": f"{type(exc).__name__}: {exc}"},
                      kind="observation")
            return False

    # ---- bridge serve loop ------------------------------------------

    async def serve(self) -> None:
        while not self.halting.is_set():
            try:
                await asyncio.wait_for(
                    self.halting.wait(), timeout=self.poll_interval,
                )
                return
            except asyncio.TimeoutError:
                pass
            for peer in list(self.peers):
                # Poll every peer's inbox; per-envelope admission is gated
                # at admit-time via the bridge's authorize_peer call, so
                # peers we'd reject just get their envelopes turned away
                # one at a time (and witnessed) rather than skipped here.
                try:
                    await self._poll_peer_inbox(peer)
                except Exception as exc:
                    self.emit(operator="federation_poll_failed",
                              details={"peer_id": peer.peer_id,
                                       "error": f"{type(exc).__name__}: {exc}"},
                              kind="observation")
                try:
                    await self._drain_outbound(peer)
                except Exception as exc:
                    self.emit(operator="federation_drain_failed",
                              details={"peer_id": peer.peer_id,
                                       "error": f"{type(exc).__name__}: {exc}"},
                              kind="observation")


__all__ = ["FederationProgram"]
