"""IdentityProviderBridge — the bridge that *issues* credentials.

A long-running :class:`BridgeProgram` that mounts the polity's OAuth
Authorization Server endpoints over HTTP. External clients (Claude.ai,
ChatGPT, IDEs, the operator UI) speak OAuth/OIDC to this bridge to
log in via Google; on return, this bridge looks up the upstream
(issuer, oauth_subject) pair as a ``kind: credential`` record
(``kind: oauth-account``) and mints a polity access token bound to
the substrate subject the credential resolves to.

The token is then presented to other bridges (Web, MCP, A2A) at their
request boundary. Those bridges verify the token against this
bridge's :meth:`validate_access_token` and run their own
``handle_call`` gate against the resolved subject.

Unlike other bridges, this one does NOT call ``handle_call`` per
request — there is no incoming credential to gate (the AS is the
thing producing credentials). OAuth's own protocol-level auth (PKCE,
registered redirect URIs, client secrets) governs the AS endpoints.
"""
from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from uvicorn import Config, Server

from pyfars.programs.bridge import BridgeProgram
from pyfars.programs.identity.fastapi_router import install_oauth_routes
from pyfars.programs.identity.google_federation import GoogleFederation
from pyfars.programs.identity.oauth_server import PolityOAuthServer


class IdentityProviderBridge(BridgeProgram):
    """OAuth Authorization Server, hosted as a long-running bridge program.

    Construction:

        bridge = IdentityProviderBridge(
            root,
            host="0.0.0.0", port=8002,
            public_base_url="https://auth.example.org",
            google_client_id=..., google_client_secret=...,
            google_discovery_url=...,
        )
        await bridge.run()

    Other bridges that need to verify tokens issued by this AS reach
    in via :attr:`oauth_server` and call its
    :meth:`PolityOAuthServer.validate_access_token`. The MCP provider
    adapter (:mod:`mcp_provider`) is the canonical wrapper for the
    MCP SDK's TokenVerifier protocol.
    """

    def __init__(
        self,
        root: Path,
        *,
        host: str = "127.0.0.1",
        port: int = 8002,
        public_base_url: str,
        google_client_id: str,
        google_client_secret: str,
        google_discovery_url: str,
        state_dir: Path | None = None,
        scopes_supported: list[str] | None = None,
    ) -> None:
        super().__init__(root)
        self.host = host
        self.port = port
        self.public_base_url = public_base_url
        self.state_dir = state_dir or (root / ".pyfars" / "identity")
        self.state_dir.mkdir(parents=True, exist_ok=True)

        self.federation = GoogleFederation(
            client_id=google_client_id,
            client_secret=google_client_secret,
            discovery_url=google_discovery_url,
            redirect_uri=f"{public_base_url.rstrip('/')}/oauth/google/callback",
        )
        self.oauth_server = PolityOAuthServer(
            federation=self.federation,
            substrate_root=root,
            state_dir=self.state_dir,
            scopes_supported=scopes_supported or [],
        )
        self._server: Server | None = None

    def _build_app(self) -> FastAPI:
        app = FastAPI(title="PyFARS identity provider")
        install_oauth_routes(
            app, server=self.oauth_server,
            public_base_url=self.public_base_url,
        )
        return app

    async def serve(self) -> None:
        app = self._build_app()
        config = Config(
            app, host=self.host, port=self.port, log_level="warning",
        )
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
    """Uvicorn server that doesn't install signal handlers — the bridge
    owns SIGINT/SIGTERM via its ``halting`` event."""

    def install_signal_handlers(self) -> None:
        return


__all__ = ["IdentityProviderBridge"]
