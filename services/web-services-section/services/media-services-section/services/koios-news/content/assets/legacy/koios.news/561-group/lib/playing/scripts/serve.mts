#!/usr/bin/env node
/**
 * play-serve — the HTTP/OpenAPI/MCP/web-UX transport over playing's actions.
 *
 * The four faces are functorial images of the one relating `induceBins` apex: CLI
 * is the `play` dispatcher; this binds the same actions to a node:http server via
 * relating's `serve`, exposing `GET /` (web index), `GET /:verb` (HTML form),
 * `POST /:verb` (body→stdin→stdout), `GET /openapi.json`, and `POST /mcp`. Every
 * POST runs through `dispatch`, so HTTP/MCP/form calls are witnessed as EAVT into
 * playing's own ledger like CLI calls.
 *
 *   PORT=8790 PLAYING_DATA=.tmp/data play-serve
 */
import { fileURLToPath } from "node:url";
import { induceBins, serve } from "@emsenn/relating";
import { actions } from "../src/actions.mjs";

function main(): void {
  const port = Number(process.env["PORT"] ?? 8790);
  const dataRoot = process.env["PLAYING_DATA"];
  const induced = induceBins(actions, { packageName: "@emsenn/playing" });
  const server = serve(actions, {
    induced,
    title: "@emsenn/playing",
    ...(dataRoot === undefined ? {} : { dataRoot }),
    caller: { transport: "http" },
  });
  server.listen(port, () => {
    process.stdout.write(`play-serve: ${induced.actions.length} operations on http://localhost:${port}/\n`);
  });
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
