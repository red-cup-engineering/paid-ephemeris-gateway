#!/usr/bin/env node
/**
 * compute-serve — computing's HTTP/OpenAPI/MCP/web-UX transport over its actions.
 *
 * The four transports are functorial images of the one relating `induceBins` apex:
 * CLI is the `compute` dispatcher; this binds the same actions to a node:http server
 * via relating's `serve` (GET / web index, GET/POST /:verb, GET /openapi.json,
 * POST /mcp). Every POST runs through `dispatch`, so HTTP/MCP/form calls are
 * EAVT-witnessed like CLI calls.
 *
 *   compute-serve            # or: PORT=8789 COMPUTING_DATA=.tmp/data compute-serve
 */
import { fileURLToPath } from "node:url";
import { induceBins, serve } from "@emsenn/relating";
import { actions } from "../src/actions.mjs";

function main(): void {
  const port = Number(process.env["PORT"] ?? 8789);
  const dataRoot = process.env["COMPUTING_DATA"];
  const induced = induceBins(actions, { packageName: "@emsenn/computing" });
  const server = serve(actions, {
    induced,
    title: "@emsenn/computing",
    ...(dataRoot === undefined ? {} : { dataRoot }),
    caller: { transport: "http" },
  });
  server.listen(port, () => {
    process.stdout.write(`compute-serve: ${induced.actions.length} operations on http://localhost:${port}/\n`);
  });
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
