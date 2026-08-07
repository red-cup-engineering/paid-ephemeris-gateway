#!/usr/bin/env node
/**
 * content-gate — the gatekeeping read: project a settled section reading to its
 * editorial-gate verdicts.
 *
 * A pure filter over `content-read`'s output: reads `{subject, predicate,
 * object, charge}` records (stdin, or a path) and keeps the gate cells — the
 * `content.clears-gate` and `content.rejected-by-gate` predicates. It does not
 * re-settle; settling is `content-read`'s job, so `content-read | content-gate`
 * is the whole pipeline.
 *
 * Rejection is the contrary claim's OWN cell, never a polarity against
 * clears-gate. A gate clearing AND a gate rejecting the same content are two
 * live cells, held side by side — `stable`, never an error. So this exits 0
 * whenever a reading was projected; use `--fail-on=potential --on=rejected`
 * (or `--fail-on=stable`) to gate a pipeline like `git diff --exit-code`.
 *
 *   content-read log.jsonl | content-gate
 *   content-read log.jsonl | content-gate --on=cleared --charge=potential
 *   content-read log.jsonl | content-gate --on=rejected --fail-on=potential && echo clean
 *
 * Parameters: --content= (keep one content subject),
 *             --gate= (keep one gate object),
 *             --on=cleared|rejected|both (default both),
 *             --charge=potential|active|stable|absurd (keep one bin),
 *             --output=jsonl|json|table (default jsonl),
 *             --fail-on=potential|active|stable|absurd (gate exit code).
 */
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import {
  clearsGatePredicate,
  rejectedByGatePredicate,
} from "../topology/index.mjs";
import { canonical } from "@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/json/jsonl";
import {
  parseArgs,
  readStdin,
  readRecords,
  formatRecords,
  type Args,
  type SectionRecord,
  type ChargeValueName,
  type JsonValue,
} from "./wire.mjs";

const matches = (value: unknown, want: string | undefined): boolean =>
  want === undefined || canonical(value as JsonValue) === want || String(value) === want;

const CLEARS = clearsGatePredicate();
const REJECTED = rejectedByGatePredicate();

async function main(argv: readonly string[]): Promise<number> {
  const args: Args = parseArgs(argv);
  const content = args.flags.get("content");
  const gate = args.flags.get("gate");
  const on = args.flags.get("on") ?? "both";
  const charge = args.flags.get("charge") as ChargeValueName | undefined;
  const output = args.flags.get("output") ?? "jsonl";
  const failOn = args.flags.get("fail-on") as ChargeValueName | undefined;
  const path = args.positionals[0];

  const wantPredicate = (predicate: unknown): boolean => {
    const value = String(predicate);
    if (on === "cleared") return value === CLEARS;
    if (on === "rejected") return value === REJECTED;
    return value === CLEARS || value === REJECTED;
  };

  const text = path !== undefined ? await readFile(path, "utf8") : await readStdin();
  const kept: SectionRecord[] = readRecords(text).filter((record) =>
    wantPredicate(record.predicate)
    && matches(record.subject, content)
    && matches(record.object, gate)
    && (charge === undefined || record.charge === charge));

  process.stdout.write(formatRecords(kept, output));

  if (failOn !== undefined && kept.some((record) => record.charge === failOn)) return 1;
  return 0;
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((error: unknown) => {
      process.stderr.write(`content-gate: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}
