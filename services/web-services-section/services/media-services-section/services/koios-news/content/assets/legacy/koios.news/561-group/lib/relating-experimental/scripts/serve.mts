#!/usr/bin/env node
/**
 * relate-serve — the HTTP/OpenAPI/MCP/web-UX transport over the package's actions.
 *
 * The four transports are functorial images of the one `induceBins` apex: CLI is
 * the `relate` dispatcher; this binds the same actions to a `node:http` server
 * exposing `GET /` (web index), `GET /:verb` (HTML form), `POST /:verb`
 * (body→stdin→stdout), `GET /openapi.json`, and `POST /mcp`. Every POST runs
 * through `dispatch`, so HTTP/MCP/form calls are witnessed as EAVT like CLI calls.
 *
 *   PORT=8787 RELATING_DATA=.tmp/data relate-serve
 */
import { fileURLToPath } from "node:url";
import { induceBins, serve } from "../src/acting/index.mjs";
import { actions } from "../src/actions.mjs";

function main(): void {
  const port = Number(process.env["PORT"] ?? 8787);
  const dataRoot = process.env["RELATING_DATA"];
  const induced = induceBins(actions);
  const server = serve(actions, {
    induced,
    title: "@emsenn/relating-experimental",
    ...(dataRoot === undefined ? {} : { dataRoot }),
    caller: { transport: "http" },
  });
  server.listen(port, () => {
    process.stdout.write(`relate-serve: ${induced.actions.length} operations on http://localhost:${port}/\n`);
  });
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
