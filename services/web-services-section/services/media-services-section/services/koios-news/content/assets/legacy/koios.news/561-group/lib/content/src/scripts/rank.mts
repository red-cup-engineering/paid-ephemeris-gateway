#!/usr/bin/env node
/**
 * content-rank — the demand reading: rank a demand TRACE by descending
 * agenda-setting charge.
 *
 * Reads a demand trace (stdin, or a path) — JSONL of `{term, value, evidence?}`
 * affirmations, every witnessed unit of demand appended, never folded in place —
 * builds the finitely-additive demand charge by `witnessDemand`, and writes the
 * folded per-term ranking: `{term, value}` per line, descending. The trace is
 * the truth; the ranking is a reading, so this exits 0 whenever a reading was
 * computed; non-zero is reserved for operational failure (malformed input).
 *
 * Demand is a charge in the mathematical sense (a signed finitely-additive set
 * function), distinct from a bilattice charge: values are exact bigints, and a
 * withdrawal of demand is a NEGATIVE entry the witness appends, never a removed
 * one and never a polarity flag. The output `{term, value}` re-admits as a
 * trace entry, so `content-rank` composes with itself and with raw traces.
 *
 *   content-rank demand.jsonl
 *   cat views.jsonl queries.jsonl | content-rank --output=table
 *   content-rank demand.jsonl --top=10
 *
 * Parameters: --top=N (keep the N highest-charge terms; default all),
 *             --output=jsonl|json|table (default jsonl).
 */
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import {
  demandCharge,
  demandEntry,
  witnessDemand,
  demandRanking,
  type DemandChargeCarrier,
  type DemandRankEntry,
} from "../topology/index.mjs";
import {
  parseArgs,
  readStdin,
  readDemandTrace,
} from "./wire.mjs";
import { canonical, serializeLines, type JsonValue } from "@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/json/jsonl";

/** A rank entry rendered for the wire: bigint value as a JSON-safe integer string. */
interface RankRecord {
  readonly term: string;
  readonly value: string;
}

const recordOf = (entry: DemandRankEntry): RankRecord => ({ term: entry.term, value: entry.value.toString() });

function format(records: readonly RankRecord[], output: string): string {
  switch (output) {
    case "json":
      return canonical(records as unknown as JsonValue) + "\n";
    case "table":
      return ["term\tvalue"].concat(records.map((r) => `${r.term}\t${r.value}`)).join("\n") + "\n";
    case "jsonl":
    case "":
      return serializeLines(records as unknown as readonly JsonValue[]);
    default:
      throw new Error(`unknown --output=${output} (expected jsonl, json, or table)`);
  }
}

async function main(argv: readonly string[]): Promise<number> {
  const args = parseArgs(argv);
  const output = args.flags.get("output") ?? "jsonl";
  const topFlag = args.flags.get("top");
  const top = topFlag === undefined ? undefined : Number.parseInt(topFlag, 10);
  if (top !== undefined && (!Number.isSafeInteger(top) || top < 0)) {
    process.stderr.write(`content-rank: --top must be a non-negative integer, got "${topFlag}"\n`);
    return 2;
  }
  const path = args.positionals[0];

  const text = path !== undefined ? await readFile(path, "utf8") : await readStdin();
  // Every entry is a fresh affirmation appended to the append-only trace.
  let charge: DemandChargeCarrier = demandCharge([]);
  for (const record of readDemandTrace(text)) {
    charge = witnessDemand(charge, demandEntry(record.term, record.value, record.evidence));
  }
  const ranked = demandRanking(charge).map(recordOf);
  const kept = top === undefined ? ranked : ranked.slice(0, top);
  process.stdout.write(format(kept, output));
  return 0;
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((error: unknown) => {
      process.stderr.write(`content-rank: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}
