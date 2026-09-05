"""MCP bridge — serves a FastMCP surface over the engine's UDS API.

The MCP server exposes the polity's substrate operations as MCP tools
so external frontier-model agents (Claude.ai, ChatGPT, IDE clients)
can engage the polity through their native tool-call protocol. The
bridge talks to the engine via ``pyfars.client.uds`` — it does not
read the filesystem or invoke kernel projectors directly.

    from pyfars.programs import McpBridge

    bridge = McpBridge(Path("/path/to/directory"), port=8001)
    await bridge.run()

Package layout:

  - ``bridge.py``   The :class:`McpBridge` class.
  - ``server.py``   :func:`build_mcp_app` — the FastMCP factory.
  - ``tools.py``    System operations registered as MCP tools.
"""
from pyfars.programs.mcp.bridge import McpBridge
from pyfars.programs.mcp.server import build_mcp_app, build_test_mcp_server

__all__ = ["McpBridge", "build_mcp_app", "build_test_mcp_server"]
