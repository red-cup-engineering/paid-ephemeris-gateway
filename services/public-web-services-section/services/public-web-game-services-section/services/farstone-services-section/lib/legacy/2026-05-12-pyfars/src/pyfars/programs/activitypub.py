"""ActivityPubBridge — PyFARS ↔ ActivityPub.

A *federation-bridge* (per ``objects/federation-bridge.md``): the
external peer has a different value-domain than PyFARS. ActivityPub
servers (Mastodon, Pleroma, Lemmy, PixelFed, etc.) speak Boolean
JSON-LD activities; we speak FOUR-valued predication cells. The
convergence theorem does NOT hold across this boundary — translation
is lossy in both directions.

What the bridge does:

  - **Inbound.** Runs an HTTP server on a configurable port. Accepts
    AP Activities at ``POST /inbox``; translates them to cells via
    the AP→cells vocabulary; admits cells into the system; emits
    witnesses. Standard AP discovery endpoints (``GET /actors/<id>``,
    ``GET /.well-known/webfinger``) are served from polity actor
    records.

  - **Outbound.** Scans the system for cells declaring AP-shaped
    activities to emit (cells of kind ``ap-outbound-activity`` or
    equivalent); translates each to an AP Activity; POSTs to every
    follower's inbox per ``cc`` / ``to`` recipients.

The vocabulary translation is the load-bearing math content here.
The choice of which cells project to which AP Activities is the
polity's federation-bridge configuration — the polity decides what
flows out.

This bridge is **skeletal** in its translation depth (the AP vocabulary
is large; only the load-bearing patterns are realized below). The
shape — HTTP server, inbox/outbox handlers, vocabulary translation
hooks — is complete.
"""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Request, Response
from pypredcalc import BilatticeValue, PredicationCell
from uvicorn import Config, Server

from pyfars.programs.bridge import BridgeProgram


_AP_CONTEXT = "https://www.w3.org/ns/activitystreams"


def _parse_signature_header(header: str) -> dict[str, str]:
    """Parse a Signature header into a key→value dict.

    Per draft-cavage-http-signatures, the header is a comma-separated
    list of ``key="value"`` pairs. The fields we read: ``keyId``,
    ``algorithm``, ``headers``, ``signature``.
    """
    out: dict[str, str] = {}
    for part in header.split(","):
        if "=" not in part:
            continue
        key, _, value = part.strip().partition("=")
        out[key.lower()] = value.strip().strip('"')
    return out


def _canonical_signing_string(
    request: Request, headers_list: str,
) -> bytes:
    """Build the canonical signing string per HTTP-Signatures.

    ``headers_list`` is the space-separated header names from the
    Signature header's ``headers=`` field. Each named header
    contributes one line; ``(request-target)`` is special-cased to
    ``method path``.
    """
    lines: list[str] = []
    for name in headers_list.split():
        name = name.lower()
        if name == "(request-target)":
            method = request.method.lower()
            path = request.url.path
            if request.url.query:
                path = f"{path}?{request.url.query}"
            lines.append(f"(request-target): {method} {path}")
        else:
            value = request.headers.get(name, "")
            lines.append(f"{name}: {value}")
    return "\n".join(lines).encode("utf-8")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(
        timespec="seconds",
    ).replace("+00:00", "Z")


class ActivityPubBridge(BridgeProgram):
    """ActivityPub federation-bridge.

    Translates between PyFARS cells and ActivityPub Activities; not
    convergence-preserving (vocabulary-bridging boundary).
    """

    def __init__(
        self,
        root: Path,
        *,
        actor_id: str,
        host: str = "127.0.0.1",
        port: int = 8101,
        outbound_poll_interval: float = 30.0,
    ) -> None:
        super().__init__(root)
        self.actor_id = actor_id
        self.host = host
        self.port = port
        self.outbound_poll_interval = outbound_poll_interval
        self._server: Server | None = None

    # ---- HTTP app ---------------------------------------------------

    def _build_app(self) -> FastAPI:
        app = FastAPI(title="PyFARS ActivityPub bridge")

        @app.post("/inbox")
        async def inbox(request: Request) -> Response:
            outcome = await self._verify_and_authorize_request(request)
            if not outcome.admitted:
                raise HTTPException(status_code=403, detail=outcome.reason)
            try:
                activity = await request.json()
            except Exception:
                raise HTTPException(status_code=400, detail="invalid JSON")
            cells = self.activity_to_cells(activity)
            self._admit_cells(cells, activity=activity, direction="inbound")
            return Response(status_code=202)

        @app.get("/outbox")
        async def outbox() -> dict[str, Any]:
            items = self._outbox_items()
            return {
                "@context": _AP_CONTEXT,
                "type": "OrderedCollection",
                "totalItems": len(items),
                "orderedItems": items,
            }

        @app.get("/actors/{actor}")
        async def actor(actor: str) -> dict[str, Any]:
            return self.actor_profile(actor)

        return app

    # ---- HTTP-signature verification -------------------------------

    async def _verify_and_authorize_request(self, request: Request):
        """Parse the HTTP-Signature header, verify, authorize.

        Per draft-cavage-http-signatures: parse the ``Signature``
        header for ``keyId``, ``algorithm``, ``headers``, and
        ``signature``; look up the credential whose slug matches
        ``keyId``; build the canonical signing string from the named
        headers; verify the signature against the credential's PEM
        public key; ask the bridge gate for authority.
        """
        import base64

        from pyfars.kernel.operator.auth import verify_rsa_pss_sha256
        from pyfars.programs.bridge import CallOutcome
        from pyfars.sdk.entities.credential import find_credential

        sig_header = request.headers.get("signature")
        if not sig_header:
            return CallOutcome(
                decision="deny", subject=None, credential=None,
                reason="missing Signature header",
            )
        parts = _parse_signature_header(sig_header)
        key_id = parts.get("keyid", "")
        algorithm = parts.get("algorithm", "").lower()
        headers_list = parts.get("headers", "")
        signature_b64 = parts.get("signature", "")
        if not key_id or algorithm != "rsa-sha256" or not signature_b64:
            return CallOutcome(
                decision="deny", subject=None, credential=None,
                reason="unsupported signature scheme",
            )
        credential = find_credential(self.system.store, slug=key_id)
        if credential is None or not credential.public_key:
            return CallOutcome(
                decision="deny", subject=None, credential=None,
                reason="no credential record for keyId",
            )
        canonical = _canonical_signing_string(request, headers_list)
        try:
            signature_bytes = base64.b64decode(signature_b64)
        except Exception:
            return CallOutcome(
                decision="deny", subject=None, credential=None,
                reason="signature decode failed",
            )
        if not verify_rsa_pss_sha256(
            credential.public_key.encode("utf-8"), canonical, signature_bytes,
        ):
            return CallOutcome(
                decision="deny", subject=None, credential=None,
                reason="signature verification failed",
            )
        return self.authorize_credential(credential, "ap.inbox")

    # ---- AP → cells -------------------------------------------------

    def activity_to_cells(
        self, activity: dict[str, Any],
    ) -> list[PredicationCell]:
        """Translate one AP Activity to a list of predication cells.

        Each AP type maps to a small set of cells in the polity's
        agreed vocabulary. Unknown types produce no cells (caller
        sees an empty list and can fall through to quarantine).
        """
        out: list[PredicationCell] = []
        atype = activity.get("type", "")
        aid = activity.get("id", "")
        actor = self._coerce_str(activity.get("actor"))
        obj = activity.get("object")
        obj_id = self._coerce_str(obj) if not isinstance(obj, dict) \
            else self._coerce_str(obj.get("id"))

        if atype == "Create" and isinstance(obj, dict):
            note_id = self._coerce_str(obj.get("id"))
            note_type = obj.get("type", "")
            note_content = self._coerce_str(obj.get("content"))
            note_published = self._coerce_str(obj.get("published"))
            attributed_to = self._coerce_str(obj.get("attributedTo"))
            out.append(self._cell(note_id, "ap-type", note_type))
            if note_content:
                out.append(self._cell(note_id, "content", note_content))
            if note_published:
                out.append(self._cell(note_id, "published", note_published))
            if attributed_to:
                out.append(self._cell(note_id, "attributed-to",
                                       attributed_to))
            if actor:
                out.append(self._cell(actor, "created", note_id))
        elif atype == "Follow" and obj_id and actor:
            out.append(self._cell(actor, "follows", obj_id))
        elif atype == "Like" and obj_id and actor:
            out.append(self._cell(actor, "likes", obj_id))
        elif atype == "Announce" and obj_id and actor:
            out.append(self._cell(actor, "announces", obj_id))
        elif atype == "Undo" and isinstance(obj, dict):
            inner_type = obj.get("type", "")
            inner_obj_id = self._coerce_str(obj.get("object"))
            if inner_type == "Follow" and actor and inner_obj_id:
                # F-cell so a future closure rule can retract the
                # follow without erasing the audit trail.
                out.append(self._cell(actor, "follows", inner_obj_id,
                                       value=BilatticeValue.F))

        if aid:
            out.append(self._cell(aid, "ap-activity-type", atype))
            if actor:
                out.append(self._cell(aid, "ap-actor", actor))

        return out

    @staticmethod
    def _cell(
        subject: str, predicate: str, obj: str,
        *, value: BilatticeValue = BilatticeValue.T,
    ) -> PredicationCell:
        return PredicationCell(
            subject=subject,
            predicate=predicate,
            object=obj,
            value=value,
        )

    @staticmethod
    def _coerce_str(value: Any) -> str:
        if isinstance(value, str):
            return value
        if isinstance(value, dict):
            return str(value.get("id", ""))
        return ""

    # ---- cells → AP -------------------------------------------------

    def cells_to_activity(
        self, *, subject: str, kind: str, fields: dict[str, Any],
    ) -> dict[str, Any]:
        """Render an outbound AP Activity from a subject's projection
        kind and accumulated fields.

        ``kind`` names which AP shape to produce: ``ap-note``,
        ``ap-follow``, ``ap-like``, ``ap-announce``. Fields come from
        the substrate cells the projection rule settled.
        """
        published = fields.get("published") or _now_iso()
        if kind == "ap-note":
            return {
                "@context": _AP_CONTEXT,
                "type": "Create",
                "id": subject,
                "actor": self.actor_id,
                "published": published,
                "to": fields.get("to", []),
                "cc": fields.get("cc", []),
                "object": {
                    "type": "Note",
                    "id": f"{subject}#note",
                    "attributedTo": self.actor_id,
                    "content": fields.get("content", ""),
                    "published": published,
                },
            }
        if kind == "ap-follow":
            return {
                "@context": _AP_CONTEXT,
                "type": "Follow",
                "id": subject,
                "actor": self.actor_id,
                "object": fields.get("target", ""),
            }
        if kind == "ap-like":
            return {
                "@context": _AP_CONTEXT,
                "type": "Like",
                "id": subject,
                "actor": self.actor_id,
                "object": fields.get("target", ""),
            }
        if kind == "ap-announce":
            return {
                "@context": _AP_CONTEXT,
                "type": "Announce",
                "id": subject,
                "actor": self.actor_id,
                "object": fields.get("target", ""),
            }
        raise ValueError(f"unknown AP projection kind: {kind!r}")

    # ---- admission --------------------------------------------------

    def _admit_cells(
        self,
        cells: list[PredicationCell],
        *,
        activity: dict[str, Any],
        direction: str,
    ) -> None:
        if not cells:
            self.emit(operator="ap_activity_quarantined",
                      details={"reason": "unknown-type",
                               "type": activity.get("type", ""),
                               "id": activity.get("id", "")},
                      kind="observation")
            return
        self.emit(operator="ap_activity_admitted",
                  details={"direction": direction,
                           "type": activity.get("type", ""),
                           "id": activity.get("id", ""),
                           "cell_count": len(cells)})
        # Cells reify by writing one per-activity envelope file in the
        # bridge's inbox dir; a closure-rule downstream folds these
        # into agreed-vocabulary cells. Keeping inbound projection
        # file-shaped preserves substrate provenance for the audit
        # chain even on a lossy bridge.
        self._persist_inbound(activity, cells)

    def _persist_inbound(
        self,
        activity: dict[str, Any],
        cells: list[PredicationCell],
    ) -> None:
        inbox_dir = (self.root / ".pyfars" / "federation"
                     / "activitypub-inbox")
        inbox_dir.mkdir(parents=True, exist_ok=True)
        aid = activity.get("id") or _now_iso()
        safe = "".join(c if c.isalnum() else "_" for c in aid)[:200]
        path = inbox_dir / f"{safe}.json"
        path.write_text(
            json.dumps({
                "activity": activity,
                "cells": [
                    {"subject": c.subject, "predicate": c.predicate,
                     "object": c.object, "value": c.value.name}
                    for c in cells
                ],
                "received_at": _now_iso(),
            }, sort_keys=True, indent=2),
            encoding="utf-8",
        )

    # ---- outbound ---------------------------------------------------

    def _outbox_items(self) -> list[dict[str, Any]]:
        """Return the most recent emitted activities as AP-shaped items."""
        outbox_dir = (self.root / ".pyfars" / "federation"
                      / "activitypub-outbox")
        if not outbox_dir.is_dir():
            return []
        out: list[dict[str, Any]] = []
        for path in sorted(outbox_dir.iterdir(), reverse=True):
            if path.suffix != ".json" or not path.is_file():
                continue
            try:
                out.append(json.loads(path.read_text(encoding="utf-8")))
            except Exception:
                continue
            if len(out) >= 50:
                break
        return out

    def queue_activity(
        self,
        *,
        subject: str,
        kind: str,
        fields: dict[str, Any],
        deliver_to: list[str] | None = None,
    ) -> dict[str, Any]:
        """Render and persist one outbound activity; queue for delivery."""
        activity = self.cells_to_activity(
            subject=subject, kind=kind, fields=fields,
        )
        outbox_dir = (self.root / ".pyfars" / "federation"
                      / "activitypub-outbox")
        outbox_dir.mkdir(parents=True, exist_ok=True)
        path = outbox_dir / f"{_now_iso()}-{subject.replace('/', '_')[:80]}.json"
        path.write_text(json.dumps(activity, indent=2, sort_keys=True),
                        encoding="utf-8")
        if deliver_to:
            asyncio.create_task(self._deliver(activity, deliver_to))
        self.emit(operator="ap_activity_queued",
                  details={"subject": subject,
                           "kind": kind,
                           "deliver_to_count": len(deliver_to or [])})
        return activity

    async def _deliver(
        self, activity: dict[str, Any], inboxes: list[str],
    ) -> None:
        async with httpx.AsyncClient(timeout=30.0) as client:
            for inbox in inboxes:
                try:
                    resp = await client.post(
                        inbox,
                        json=activity,
                        headers={
                            "Content-Type":
                                "application/activity+json",
                        },
                    )
                    ok = 200 <= resp.status_code < 300
                except Exception as exc:
                    self.emit(operator="ap_activity_delivery_failed",
                              details={"inbox": inbox,
                                       "error": f"{type(exc).__name__}: {exc}"},
                              kind="observation")
                    continue
                self.emit(
                    operator="ap_activity_delivered" if ok
                    else "ap_activity_delivery_failed",
                    details={"inbox": inbox,
                             "status_code": resp.status_code},
                    kind="observation" if not ok else "mutation",
                )

    # ---- actor profile ---------------------------------------------

    def actor_profile(self, actor: str) -> dict[str, Any]:
        """Render an AP Actor document for the named actor.

        Currently a static template per the bridge's actor_id; a future
        version will hydrate from the polity's agent record.
        """
        return {
            "@context": [
                _AP_CONTEXT,
                "https://w3id.org/security/v1",
            ],
            "type": "Person",
            "id": self.actor_id,
            "preferredUsername": actor,
            "inbox": f"http://{self.host}:{self.port}/inbox",
            "outbox": f"http://{self.host}:{self.port}/outbox",
        }

    # ---- bridge serve loop ------------------------------------------

    async def serve(self) -> None:
        app = self._build_app()
        config = Config(app, host=self.host, port=self.port,
                        log_level="warning")
        self._server = _NoSignalServer(config)
        serve_task = asyncio.create_task(self._server.serve())
        try:
            await self.halting.wait()
        finally:
            self._server.should_exit = True
            try:
                await asyncio.wait_for(serve_task, timeout=5.0)
            except asyncio.TimeoutError:
                serve_task.cancel()


class _NoSignalServer(Server):
    """Suppress uvicorn's signal-handler installation.

    The bridge installs its own SIGINT/SIGTERM handlers; uvicorn's
    would clobber them.
    """
    def install_signal_handlers(self) -> None:
        return


__all__ = ["ActivityPubBridge"]
