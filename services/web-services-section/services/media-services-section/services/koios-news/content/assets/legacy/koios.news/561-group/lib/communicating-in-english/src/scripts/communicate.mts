#!/usr/bin/env node
/**
 * communicate — the single communicating dispatcher binary.
 *
 * It binds the process boundary (argv, stdin, stdout, stderr, exit) to the pure
 * `dispatch` over communicating's actions, which are cocone legs on the
 * @emsenn/relating-experimental `acting` boundary. Domain logic lives in the
 * actions; this file owns transport, once. Witnessing is enabled by
 * COMMUNICATING_DATA (the data root for the term-addressed invocation ledger);
 * unset disables it.
 */
import { fileURLToPath } from "node:url";
import { induceBins } from "@emsenn/relating-experimental";
import { actions } from "../actions.mjs";

async function readStdin(): Promise<string> {
  let text = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

async function main(): Promise<number> {
  const { dispatch } = induceBins(actions, { packageName: "@emsenn/communicating-in-english" });
  const stdin = await readStdin();
  const dataRoot = process.env["COMMUNICATING_DATA"];
  const caller = {
    transport: "cli",
    ...(process.env["USER"] === undefined ? {} : { user: process.env["USER"] }),
  };
  const result = dispatch(process.argv.slice(2), stdin, {
    caller,
    program: "communicate",
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
      process.stderr.write(`communicate: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}
