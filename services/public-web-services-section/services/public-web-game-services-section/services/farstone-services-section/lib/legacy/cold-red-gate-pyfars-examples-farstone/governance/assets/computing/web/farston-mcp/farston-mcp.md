---
title: "Farston MCP"
description: "Farston's Model Context Protocol surface — substrate operations exposed as MCP tools for frontier-model agents (Claude.ai, ChatGPT, Cline, MCP Inspector). Resource-server peer of the web service."
kind: website
status: draft
of-polity: farstone
served-by-app: pyfars.mcp.server:build_mcp_app
default-host: "127.0.0.1"
default-port: 8003
service-kind: mcp
access-policy: authenticated
content-source: pyfars-substrate
---


The MCP surface of the Farston example polity.
When the engine boots, it reads this asset cell and spawns an `MCPService` peer of the `WebService`.

The MCP service is **resource-server only** — it does not host its own OAuth endpoints.
Tokens are minted by the polity's Authorization Server (hosted by the web service at `/oauth/token`) and validated here via a shared `PolityOAuthServer` instance carried on the engine's runtime context.

`service-kind: mcp` discriminator routes lifecycle dispatch to `MCPService` rather than `WebService`.
`served-by-app` resolves to `pyfars.mcp.server:build_mcp_app`, which returns a `FastMCP` instance whose `streamable_http_app()` is the ASGI app uvicorn binds.

Tools exposed (read-only first cut):

- `list_records(prefix)` — list substrate records under a path prefix
- `show_record(path)` — read one record's frontmatter + body
- `polity_facts()` — return polity identity facts (title, ship, captain, office count)
- `list_offices()` — list chartered offices

Write tools come once the bilateral-grant model between user-account principals and substrate-write authorization is wired through Arc D's operator-UI work.
