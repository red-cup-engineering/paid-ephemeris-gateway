#!/usr/bin/env node
/**
 * gaming-serve — the HTTP/OpenAPI/MCP/web-UX transport over gaming's actions.
 *
 * The four transports are functorial images of the one `induceBins` apex: CLI is
 * the `gaming` dispatcher; this binds the same actions to a `node:http` server
 * exposing `GET /` (web index), `GET /:verb` (HTML form), `POST /:verb`
 * (body→stdin→stdout), `GET /openapi.json`, and `POST /mcp`. Every POST runs
 * through `dispatch`, so HTTP/MCP/form calls are witnessed as EAVT like CLI calls.
 *
 *   PORT=8789 GAMING_DATA=.tmp/data gaming-serve
 */
import { fileURLToPath } from "node:url";
import { induceBins, serve } from "@emsenn/relating";
import { actions } from "../src/actions.mjs";

function main(): void {
  const port = Number(process.env["PORT"] ?? 8789);
  const dataRoot = process.env["GAMING_DATA"];
  const induced = induceBins(actions, { packageName: "@emsenn/gaming" });
  const server = serve(actions, {
    induced,
    title: "@emsenn/gaming",
    ...(dataRoot === undefined ? {} : { dataRoot }),
    caller: { transport: "http" },
  });
  server.listen(port, () => {
    process.stdout.write(`gaming-serve: ${induced.actions.length} operations on http://localhost:${port}/\n`);
  });
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
