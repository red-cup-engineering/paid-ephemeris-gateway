"""McpBridge — PyFARS ↔ MCP (Model Context Protocol).

A bridge program in the BridgeProgram sense: long-running, bidirectional
protocol-translation between PyFARS and external frontier-model agents
that speak MCP (Claude.ai, ChatGPT, Codex, IDE plug-ins, etc.).

The MCP surface is a set of *tools* registered on a FastMCP server.
External agents invoke tools; each tool is a thin wrapper over the
engine's UDS API (``pyfars.client.uds``) — this bridge does not
read the filesystem or call kernel projectors directly, it talks to
the running engine like any other client.

Optionally wires OAuth bearer-token validation through the polity's
``PolityOAuthServer``; when no OAuth server is supplied the bridge
runs unauthenticated (suitable for stdio transport or trusted local
networks).
"""
from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

from uvicorn import Config, Server

from pyfars.programs.bridge import BridgeProgram
from pyfars.programs.mcp.server import build_mcp_app


class McpBridge(BridgeProgram):
    """MCP bridge — serves a FastMCP HTTP surface over the engine's UDS API."""

    def __init__(
        self,
        root: Path,
        *,
        host: str = "127.0.0.1",
        port: int = 8001,
        server_name: str = "PyFARS MCP",
        oauth_server: Any | None = None,
        public_base_url: str | None = None,
    ) -> None:
        super().__init__(root)
        self.host = host
        self.port = port
        self.server_name = server_name
        self.oauth_server = oauth_server
        self.public_base_url = public_base_url
        self._server: Server | None = None

    async def serve(self) -> None:
        fastmcp = build_mcp_app(
            bridge=self,
            oauth_server=self.oauth_server,
            public_base_url=self.public_base_url,
            server_name=self.server_name,
        )
        app = fastmcp.streamable_http_app()
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
    """Uvicorn server that does NOT clobber the asyncio loop's signal
    handlers. The bridge owns SIGINT/SIGTERM via its ``halting`` event."""

    def install_signal_handlers(self) -> None:
        return


__all__ = ["McpBridge"]
