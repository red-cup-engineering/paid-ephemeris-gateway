#!/usr/bin/env node
/**
 * Executable transport for `induceRelation()`.
 *
 * Domain: stdin containing two newline-separated opaque Mark payloads, token
 * first and claim second. Codomain: canonical JSON for the resulting
 * `SettlementFiltration`.
 */
import { fileURLToPath } from "node:url";
import { induceRelation, mark, utterance } from "../src/index.mjs";
import { canonical, requireJsonValue } from "../src/codecs/path/object/attribute/file/flatfile/serialization/json/index.mjs";

async function readStdin(): Promise<string> {
  let text = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

function jsonResource(value: unknown, label: string) {
  return requireJsonValue(JSON.parse(JSON.stringify(value)), label);
}

async function main(): Promise<number> {
  const text = await readStdin();
  const separator = text.indexOf("\n");
  if (separator < 0) {
    process.stderr.write("induce-relation: expected two mark payloads separated by a newline\n");
    return 2;
  }

  const tokenPayload = text.slice(0, separator);
  const claimPayload = text.slice(separator + 1);
  const carrier = induceRelation(utterance(mark(tokenPayload), mark(claimPayload)));
  process.stdout.write(`${canonical(jsonResource(carrier, "settlement filtration"))}\n`);
  return 0;
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      process.stderr.write(`induce-relation: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}
