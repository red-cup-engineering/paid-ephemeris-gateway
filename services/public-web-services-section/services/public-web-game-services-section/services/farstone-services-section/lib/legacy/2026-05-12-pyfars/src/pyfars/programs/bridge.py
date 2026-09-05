"""BridgeProgram — long-running, bidirectional, protocol-translating program.

Per ``concepts/program.md`` (program-class taxonomy):

    Program
    ├── EngineProgram         long-running, UDS-serving, dispatch loop
    ├── MaterializerProgram   one-shot, system → directory bytes
    ├── HarnessProgram        long-running, agentic-loop scaffolding
    ├── BridgeProgram         long-running, bidirectional, protocol-translating
    └── QueryProgram          one-shot, read-only

A bridge program *unifies* the program class for any long-running
protocol-translator between PyFARS and an external surface:

  - ``FederationProgram`` — PyFARS ↔ PyFARS native (the
    federation-convergence theorem applies; envelope-bytes carry
    cells verbatim).
  - ``ActivityPubBridge`` — PyFARS ↔ ActivityPub (vocabulary-bridging;
    lossy at the value-domain boundary).
  - ``A2ABridge`` — PyFARS ↔ a2a (vocabulary-bridging).
  - ``McpBridge`` — PyFARS ↔ MCP (Model Context Protocol) for
    external frontier-model agents (Claude.ai, ChatGPT, IDEs).
  - ``WebBridge`` — PyFARS ↔ HTTP (FastAPI proxy over the engine's
    UDS for browser inspection and REST access).
  - ``IdentityProviderBridge`` — PyFARS ↔ OAuth-AS (the bridge whose
    protocol *issues* credentials others verify).

The base provides the validate → boot → serve → halt skeleton, a halt
event for cooperative cancellation, and ``handle_call`` — the shared
authenticate-and-authorize pipeline every bridge runs at its request
boundary. Concrete bridges implement ``serve`` (the long-running
coroutine), do bridge-specific credential extraction + verification at
the request boundary, then call ``handle_call(credential_lookup,
action)`` to resolve the subject and check authorization. Witness
emission for boot/halt is handled by the base; each serve cycle is the
bridge's responsibility.
"""
from __future__ import annotations

import abc
import asyncio
import hashlib
import signal
from dataclasses import dataclass
from typing import Any

from pyfars.kernel.operator.auth import (
    Action,
    Decision,
    RequiredPredicate,
    check_authorization,
    compute_working_fiber,
)
from pyfars.sdk.entities.credential import (
    Credential,
    CredentialKind,
    find_credential,
)
from pyfars.programs.base import Program, ProgramResult, _now_iso


@dataclass(frozen=True)
class CredentialLookup:
    """The keys a bridge passes to ``handle_call`` after verifying a credential.

    The bridge does kind-appropriate verification (JWT signature + claims,
    HTTP-signature against a known public-key, peer-envelope signature),
    then passes the lookup keys for the credential record. The bridge
    does NOT need to know the substrate subject — ``handle_call`` resolves
    that via :func:`find_credential`.
    """
    kind: CredentialKind
    issuer: str | None = None
    subject: str | None = None
    public_key: str | None = None
    fingerprint: str | None = None


@dataclass(frozen=True)
class CallOutcome:
    """The result of one bridge ``handle_call`` invocation."""
    decision: Decision
    subject: str | None
    """The substrate subject resolved from the credential (when admitted)."""
    credential: Credential | None
    """The credential record matched (None if no record matched)."""
    reason: str
    """One-line explanation of the decision (for client-side surfaces)."""

    @property
    def admitted(self) -> bool:
        return self.decision == "admit"


class BridgeProgram(Program, abc.ABC):
    """Abstract long-running bidirectional protocol-translating program.

    Subclasses bind to one external protocol (federation envelopes,
    ActivityPub, a2a, MCP, HTTP, etc.) and implement ``serve`` — the
    coroutine that runs the bridge's listen-and-translate loop until
    the ``halting`` asyncio.Event is set.

    Subclasses call :meth:`handle_call` at every request boundary
    after performing bridge-specific credential verification. The
    method runs the shared resolve-and-authorize pipeline:

      find_credential → subject → compute_working_fiber →
      check_authorization → branch on FOUR → guard-channel witness.

    The no-bypass invariant (per ``check-authorization.md``): a bridge
    SHALL NOT invoke a substrate-mutating operator without first
    running ``handle_call`` and observing ``admitted=True``.
    """

    def __init__(self, root) -> None:
        super().__init__(root)
        self.halting: asyncio.Event = asyncio.Event()

    @abc.abstractmethod
    async def serve(self) -> None:
        """Run the bridge's main loop until ``self.halting`` is set.

        Subclasses MUST honor ``self.halting``: long blocks should
        be wrapped in ``asyncio.wait_for(self.halting.wait(), ...)``
        with a timeout, or use cancellation when the event fires.
        """

    def install_signal_handlers(self) -> None:
        """Wire SIGINT/SIGTERM to set ``self.halting``."""
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                loop.add_signal_handler(sig, self.halting.set)
            except (NotImplementedError, RuntimeError):
                pass

    def handle_call(
        self,
        lookup: CredentialLookup,
        action: Action,
        *,
        office: str | None = None,
        mode: str | None = None,
        session: str | None = None,
    ) -> CallOutcome:
        """Resolve subject + run check-authorization + witness the decision.

        Bridge subclasses call this at every request boundary after
        verifying the incoming credential against the protocol's own
        proof (signature, JWT claims, etc.). The ``lookup`` carries
        the verified keys; the substrate finds the matching
        :class:`Credential` record and the subject it binds to.

        Returns a :class:`CallOutcome`. Callers branch on
        ``outcome.admitted``; on rejection, the bridge surfaces an
        HTTP 401/403 (or protocol-equivalent) with ``outcome.reason``.

        The guard-channel witness is appended to the bridge's event
        log here; subclasses do not need to emit it themselves.
        """
        credential = find_credential(
            self.system.store,
            kind=lookup.kind,
            issuer=lookup.issuer,
            subject=lookup.subject,
            public_key=lookup.public_key,
            fingerprint=lookup.fingerprint,
        )
        if credential is None:
            return self._reject(
                action=action, session=session,
                reason="no credential record matched",
            )

        subject = credential.bound_to
        working_fiber = compute_working_fiber(
            self.system.store,
            agent=subject,
            office=office,
            mode=mode,
        )
        decision, witness = check_authorization(
            working_fiber, action, session=session,
        )
        try:
            self.log.append(witness)
        except OSError:
            pass

        reason = {
            "admit": "authorized",
            "deny": "explicit denial in working fiber",
            "contested": "contested authority — sources disagree",
            "unknown": "no authority info — strict deny",
        }[decision]
        return CallOutcome(
            decision=decision,
            subject=subject if decision == "admit" else None,
            credential=credential,
            reason=reason,
        )

    def authorize_bearer(
        self,
        authorization_header: str | None,
        action_name: str,
        *,
        session: str | None = None,
    ) -> CallOutcome:
        """Bearer-token gate: extract ``Bearer <token>``, SHA-256, run ``handle_call``.

        Shared across every bridge whose carrier is HTTP-style bearer
        tokens (Web, MCP-over-HTTP, A2A). The action's required-
        predicate fiber asks for ``power`` over ``action_name``.
        """
        action = _action_powered_by(action_name)
        if not authorization_header or not authorization_header.lower().startswith(
            "bearer "
        ):
            return self._reject(
                action=action, session=session,
                reason="missing bearer token",
            )
        token = authorization_header[len("Bearer "):].strip()
        fingerprint = hashlib.sha256(token.encode("utf-8")).hexdigest()
        return self.handle_call(
            CredentialLookup(kind="api-key", fingerprint=fingerprint),
            action,
            session=session,
        )

    def authorize_peer(
        self,
        peer_public_key: str | None,
        action_name: str,
        *,
        session: str | None = None,
    ) -> CallOutcome:
        """Peer-signature gate: look up ``signing-key`` credential, run ``handle_call``.

        The bridge SHALL have verified the cryptographic signature
        against ``peer_public_key`` (via
        :func:`pyfars.kernel.operator.auth.verify_ed25519` or
        :func:`pyfars.kernel.operator.auth.verify_rsa_pss_sha256`)
        before calling this method. This gate resolves the verified
        key to a substrate subject and checks authorization; it does
        no crypto.
        """
        action = _action_powered_by(action_name)
        if not peer_public_key:
            return self._reject(
                action=action, session=session,
                reason="missing peer public key",
            )
        return self.handle_call(
            CredentialLookup(kind="signing-key", public_key=peer_public_key),
            action,
            session=session,
        )

    def authorize_credential(
        self,
        credential: Credential | None,
        action_name: str,
        *,
        session: str | None = None,
    ) -> CallOutcome:
        """Authority gate for a bridge that has already resolved the credential.

        Used by bridges whose verification path lands them at a
        :class:`Credential` directly (e.g. AP HTTP-Signature: the
        ``keyId`` is the credential slug, so the bridge does the
        lookup itself, verifies the signature against
        ``credential.public_key``, then asks for authorization on the
        resulting subject without re-looking-up).
        """
        action = _action_powered_by(action_name)
        if credential is None:
            return self._reject(
                action=action, session=session,
                reason="no credential",
            )
        subject = credential.bound_to
        working_fiber = compute_working_fiber(
            self.system.store, agent=subject,
        )
        decision, witness = check_authorization(
            working_fiber, action, session=session,
        )
        try:
            self.log.append(witness)
        except OSError:
            pass
        reason = {
            "admit": "authorized",
            "deny": "explicit denial in working fiber",
            "contested": "contested authority — sources disagree",
            "unknown": "no authority info — strict deny",
        }[decision]
        return CallOutcome(
            decision=decision,
            subject=subject if decision == "admit" else None,
            credential=credential,
            reason=reason,
        )

    def _reject(
        self,
        *,
        action: Action,
        session: str | None,
        reason: str,
    ) -> CallOutcome:
        """Emit a guard witness for a rejection that didn't reach check-authorization."""
        from pyfars.kernel.witness import make_witness
        try:
            self.log.append(make_witness(
                operator="check_authorization",
                target=session or "anonymous",
                before_hash=None,
                after_hash=None,
                details={
                    "action": action.name,
                    "decision": "deny",
                    "reason": reason,
                },
                channel="guard",
                kind="guard",
            ))
        except OSError:
            pass
        return CallOutcome(
            decision="deny", subject=None, credential=None, reason=reason,
        )

    async def run(self) -> ProgramResult:
        started_at = _now_iso()
        self.validate()
        self.boot()
        self.emit(operator="bridge_program_boot",
                  details={"bridge": type(self).__name__,
                           "root": str(self.root),
                           "started_at": started_at})
        try:
            await self.serve()
        finally:
            self.halt()
            halted_at = _now_iso()
            self.emit(operator="bridge_program_halt",
                      details={"bridge": type(self).__name__,
                               "started_at": started_at,
                               "halted_at": halted_at})
        return ProgramResult(
            started_at=started_at,
            halted_at=halted_at,
        )


def _action_powered_by(action_name: str) -> Action:
    """Build a one-predicate Action requiring ``power`` over ``action_name``."""
    return Action(
        name=action_name,
        required_predicates=(
            RequiredPredicate(kind="power", scope_action=action_name),
        ),
    )


__all__ = ["BridgeProgram", "CallOutcome", "CredentialLookup"]
