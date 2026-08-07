#!/usr/bin/env node
/**
 * know — knowing's CLI dispatcher binary.
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
  const { dispatch } = induceBins(actions, { packageName: "@emsenn/knowing" });
  const stdin = await readStdin();
  const dataRoot = process.env["KNOWING_DATA"];
  const result = dispatch(process.argv.slice(2), stdin, {
    program: "know",
    caller: { transport: "cli" },
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
      process.stderr.write(`know: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}
