#!/usr/bin/env node
/**
 * Executable transport for `posit()`.
 *
 * Domain: stdin containing a JSON resource for a `PredicationSite`.
 * Codomain: canonical JSON for the resulting `PositPresheaf`.
 */
import { fileURLToPath } from "node:url";
import { posit, type PredicationSite } from "../src/index.mjs";
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
  const resource = posit(parseJson(text) as unknown as PredicationSite);
  process.stdout.write(`${canonical(jsonResource(resource, "posit presheaf"))}\n`);
  return 0;
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      process.stderr.write(`posit-predication-site: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}
