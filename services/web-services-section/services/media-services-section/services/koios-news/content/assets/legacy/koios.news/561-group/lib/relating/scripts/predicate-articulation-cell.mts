#!/usr/bin/env node
/**
 * Executable transport for `predicate()`.
 *
 * Domain: stdin containing a JSON resource for an `ArticulationCell`.
 * Codomain: canonical JSON for the resulting `PredicationSite`.
 */
import { fileURLToPath } from "node:url";
import { predicate, type ArticulationCell } from "../src/index.mjs";
import { canonical, parse as parseJson, requireJsonValue } from "../src/codecs/path/object/attribute/file/flatfile/serialization/json/index.mjs";

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
  const resource = predicate(parseJson(text) as unknown as ArticulationCell);
  process.stdout.write(`${canonical(jsonResource(resource, "predication site"))}\n`);
  return 0;
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      process.stderr.write(`predicate-articulation-cell: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}
