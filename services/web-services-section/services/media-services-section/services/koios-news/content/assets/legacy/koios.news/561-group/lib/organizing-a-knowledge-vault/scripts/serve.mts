#!/usr/bin/env node
/**
 * organize-knowledge-vault-serve  -  HTTP/OpenAPI/MCP/web projection.
 */
import { fileURLToPath } from "node:url";
import { induceBins, serve } from "@emsenn/relating";
import { actions } from "../src/actions.mjs";

function pathArg(argv: readonly string[]): string | undefined {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--path") return argv[i + 1];
    const eq = arg.match(/^(?:--path|path)=(.*)$/);
    if (eq) return eq[1];
  }
  return undefined;
}

function main(): void {
  const vault = pathArg(process.argv.slice(2)) ?? process.env["ORGANIZING_KNOWLEDGE_VAULT_PATH"] ?? "content";
  process.env["ORGANIZING_KNOWLEDGE_VAULT_PATH"] = vault;
  const port = Number(process.env["PORT"] ?? 8789);
  const dataRoot = process.env["ORGANIZING_KNOWLEDGE_VAULT_DATA"];
  const induced = induceBins(actions, { packageName: "@emsenn/organizing-a-knowledge-vault" });
  const server = serve(actions, {
    induced,
    title: "@emsenn/organizing-a-knowledge-vault",
    ...(dataRoot === undefined ? {} : { dataRoot }),
    caller: { transport: "http" },
  });
  server.listen(port, () => {
    process.stdout.write(`organize-knowledge-vault-serve: ${induced.actions.length} operations over vault ${JSON.stringify(vault)} on http://localhost:${port}/\n`);
  });
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
