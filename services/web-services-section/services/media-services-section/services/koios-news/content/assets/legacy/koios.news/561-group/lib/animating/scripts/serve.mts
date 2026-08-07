#!/usr/bin/env node
/**
 * animate-serve — animating's HTTP/OpenAPI/MCP/web transport over its actions.
 *
 * The four transports are functorial images of the one relating `induceBins`
 * apex: CLI is the `animate` dispatcher; this binds the same actions to a
 * node:http server via relating's `serve`, exposing `GET /` (web index),
 * `GET /:verb` (HTML form), `POST /:verb` (body→stdin→stdout), `GET /openapi.json`,
 * and `POST /mcp`. Every POST runs through `dispatch`, so HTTP/MCP/form calls are
 * witnessed as EAVT like CLI calls when ANIMATING_DATA is set.
 *
 *   animate-serve            # or: PORT=8790 ANIMATING_DATA=.data animate-serve
 */
import { fileURLToPath } from "node:url";
import { induceBins, serve } from "@emsenn/relating";
import { actions } from "../src/actions.mjs";

function main(): void {
  const port = Number(process.env["PORT"] ?? 8790);
  const dataRoot = process.env["ANIMATING_DATA"];
  const induced = induceBins(actions, { packageName: "@emsenn/animating" });
  const server = serve(actions, {
    induced,
    title: "@emsenn/animating",
    ...(dataRoot === undefined ? {} : { dataRoot }),
    caller: { transport: "http" },
  });
  server.listen(port, () => {
    process.stdout.write(`animate-serve: ${induced.actions.length} operations on http://localhost:${port}/\n`);
  });
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
