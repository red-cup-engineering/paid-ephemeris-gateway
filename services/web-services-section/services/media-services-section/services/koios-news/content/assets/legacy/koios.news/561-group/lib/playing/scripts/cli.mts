#!/usr/bin/env node
/**
 * play — playing's CLI dispatcher binary, the only interactive CLI in scripts/.
 *
 * It binds the process boundary (argv, stdin, stdout, stderr, exit) to the pure
 * relating `dispatch` over playing's actions (the Design grain design/dualize, the
 * cut interact, and the *-autonomous category + logic + topology surface). The
 * domain logic lives in `../src/actions.mts` as cocone legs on relating's `acting` boundary;
 * this file owns transport, once. Witnessing is enabled by PLAYING_DATA (the data
 * root for the term-addressed invocation ledger); unset disables it.
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
  const { dispatch } = induceBins(actions, { packageName: "@emsenn/playing" });
  const stdin = await readStdin();
  const dataRoot = process.env["PLAYING_DATA"];
  const caller = {
    transport: "cli",
    ...(process.env["USER"] === undefined ? {} : { user: process.env["USER"] }),
  };
  const result = dispatch(process.argv.slice(2), stdin, {
    program: "play",
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
      process.stderr.write(`play: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}
