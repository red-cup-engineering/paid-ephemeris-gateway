#!/usr/bin/env node
/**
 * Executable transport for relating two already-carried relations.
 *
 * Domain: stdin containing JSON `[left, right]`, where both entries are
 * `SettlementFiltration` carriers. Codomain: canonical JSON for the
 * `SettlementFiltration` induced by relating them.
 */
import { fileURLToPath } from "node:url";
import { relateRelations, type SettlementFiltration } from "../src/index.mjs";
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

function requireSettlementFiltration(value: unknown, label: string): SettlementFiltration {
  if (
    typeof value !== "object"
    || value === null
    || !("kind" in value)
    || value.kind !== "predication.settlement.filtration"
  ) {
    throw new TypeError(`expected ${label} settlement filtration`);
  }
  return value as SettlementFiltration;
}

function requireSettlementPair(value: unknown): readonly [SettlementFiltration, SettlementFiltration] {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new TypeError("expected [left, right] settlement filtrations");
  }
  return [
    requireSettlementFiltration(value[0], "left"),
    requireSettlementFiltration(value[1], "right"),
  ] as const;
}

async function main(): Promise<number> {
  const [left, right] = requireSettlementPair(parseJson(await readStdin()));
  const relation = relateRelations(left, right);
  process.stdout.write(`${canonical(jsonResource(relation, "relation settlement filtration"))}\n`);
  return 0;
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      process.stderr.write(`relate-relations: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}
