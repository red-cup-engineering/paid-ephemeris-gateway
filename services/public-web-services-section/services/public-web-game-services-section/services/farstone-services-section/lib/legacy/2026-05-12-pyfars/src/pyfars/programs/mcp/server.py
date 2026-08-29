"""Build the polity's MCP server.

Constructs a FastMCP instance bound to a :class:`McpBridge` (which
owns the polity root and the event log). System tools registered;
the bridge's :meth:`authorize_bearer` runs at every tool boundary.

The returned FastMCP instance is used by :class:`McpBridge`'s
``serve`` (it serves the streamable-HTTP ASGI form via uvicorn).

:func:`build_test_mcp_server` is the in-process variant for unit
tests: it constructs and boots a real :class:`McpBridge` without
networking, then returns the FastMCP instance ready for
``fastmcp.Client(server)`` use.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, TYPE_CHECKING

from pyfars.programs.mcp.tools import register_system_tools

if TYPE_CHECKING:
    from pyfars.programs.mcp.bridge import McpBridge


def build_mcp_app(
    *,
    bridge: "McpBridge",
    oauth_server: Any | None = None,
    public_base_url: str | None = None,
    server_name: str = "PyFARS substrate MCP",
) -> Any:
    """Construct the FastMCP app for the polity's MCP service.

    Parameters
    ----------
    bridge: the :class:`McpBridge` whose root and event log this MCP
        server runs over. Tools call ``bridge.authorize_bearer`` per
        invocation.
    oauth_server: optional ``IdentityProviderBridge`` (or any object
        implementing the MCP token-verifier protocol) for protocol-
        level bearer-token validation. When None, runs without the
        framework-level token check — per-tool ``authorize_bearer``
        is still enforced; an unauthenticated tool call gets a
        ``decision: deny`` response.
    public_base_url: the AS issuer URL — included in
        ``/.well-known/oauth-protected-resource`` so MCP clients know
        where to do their OAuth dance.
    server_name: human-readable name returned in the MCP server-info
        response.
    """
    from mcp.server.fastmcp import FastMCP

    kwargs: dict[str, Any] = {
        "name": server_name,
        "stateless_http": True,
    }
    if oauth_server is not None:
        from pyfars.programs.identity.mcp_provider import build_mcp_token_verifier
        kwargs["token_verifier"] = build_mcp_token_verifier(oauth_server)
        if public_base_url:
            from mcp.server.auth.settings import AuthSettings
            kwargs["auth"] = AuthSettings(
                issuer_url=public_base_url,
                resource_server_url=f"{public_base_url.rstrip('/')}/mcp",
                required_scopes=[],
            )

    server = FastMCP(**kwargs)
    register_system_tools(server, bridge=bridge)
    return server


def build_test_mcp_server(root: Path | str) -> Any:
    """Construct an in-process FastMCP for unit testing.

    Boots a real :class:`McpBridge` (validates root, opens event log,
    loads system) but does NOT start uvicorn or open a port. The
    returned FastMCP is suitable for direct ``fastmcp.Client(server)``
    use; per-tool ``authorize_bearer`` still runs.
    """
    from pyfars.programs.mcp.bridge import McpBridge
    bridge = McpBridge(Path(root))
    bridge.validate()
    bridge.boot()
    return build_mcp_app(bridge=bridge)
