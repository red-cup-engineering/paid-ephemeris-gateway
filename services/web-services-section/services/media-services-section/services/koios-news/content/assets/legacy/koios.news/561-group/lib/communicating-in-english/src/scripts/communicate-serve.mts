#!/usr/bin/env node
/**
 * communicate-serve — the HTTP/OpenAPI/MCP/web-UX transport over communicating's
 * actions, projected from the one `induceBins` apex (no second ontology).
 *
 * The four transports are functorial images of the same actions the `communicate`
 * dispatcher runs: `GET /` (web index), `GET /:verb` (HTML form), `POST /:verb`
 * and `GET /:verb?…` (body/query → stdin → stdout), `GET /openapi.json`, and
 * `POST /mcp`. Every play runs through `dispatch`, so HTTP/MCP/form calls are
 * witnessed as EAVT exactly like CLI calls.
 *
 *   PORT=16868 COMMUNICATING_DATA=.tmp/data communicate-serve
 */
import { fileURLToPath } from "node:url";
import { induceBins, serve } from "@emsenn/relating-experimental";
import { actions } from "../actions.mjs";

function main(): void {
  const port = Number(process.env["PORT"] ?? 16868);
  const dataRoot = process.env["COMMUNICATING_DATA"];
  const induced = induceBins(actions, { packageName: "@emsenn/communicating-in-english" });
  const server = serve(actions, {
    induced,
    title: "@emsenn/communicating-in-english",
    ...(dataRoot === undefined ? {} : { dataRoot }),
    namespace: "@emsenn/communicating-in-english",
    caller: { transport: "http" },
    program: "communicate",
  });
  server.listen(port, () => {
    process.stdout.write(`communicate-serve: ${induced.actions.length} operations on http://localhost:${port}/\n`);
  });
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
