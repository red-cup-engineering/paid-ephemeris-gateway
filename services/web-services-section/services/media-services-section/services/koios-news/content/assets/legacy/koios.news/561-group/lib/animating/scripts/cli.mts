#!/usr/bin/env node
/**
 * animate — the single dispatcher binary.
 *
 * It binds the process boundary (argv, stdin, stdout, stderr, exit) to the pure
 * `dispatch` over the package's actions. Domain logic lives in the actions; this
 * file owns transport, once. `induceBins` assembles the discovery apex; the same
 * actions are projected to OpenAPI/MCP/web by `serve`. Witnessing is enabled by
 * ANIMATING_DATA (the data root for the term-addressed invocation ledger); unset
 * disables it.
 */
import { fileURLToPath } from "node:url";
import { induceBins } from "@emsenn/relating";
import { actions } from "../src/actions.mjs";

async function readStdin(): Promise<string> {
  let text = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

async function main(): Promise<number> {
  const { dispatch } = induceBins(actions);
  const stdin = await readStdin();
  const dataRoot = process.env["ANIMATING_DATA"];
  const caller = {
    transport: "cli",
    ...(process.env["USER"] === undefined ? {} : { user: process.env["USER"] }),
  };
  const result = dispatch(process.argv.slice(2), stdin, {
    caller,
    ...(dataRoot === undefined ? {} : { dataRoot }),
  });
  if (result.stdout !== "") process.stdout.write(result.stdout);
  if (result.stderr !== "") process.stderr.write(result.stderr);
  return result.code;
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      process.stderr.write(`animate: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}
