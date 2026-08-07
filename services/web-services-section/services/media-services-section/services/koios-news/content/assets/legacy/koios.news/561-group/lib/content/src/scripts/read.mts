#!/usr/bin/env node
/**
 * content-read — settle a content utterance LOG to its fixed point and read
 * back the settled SECTION (content analysis, Krippendorff's read direction).
 *
 * Reads a content utterance log (stdin, or a path argument) — lines are encoded
 * utterances or `{subject, predicate, object}` cells in content vocabulary —
 * folds it through the descent (articulate → predicate → posit → settle), and
 * writes the settled section: one `{subject, predicate, object, charge}` per
 * line. Charges are DATA, not pass/fail, and DERIVED via `valueOf`: this exits
 * 0 whenever a reading was computed; non-zero is reserved for operational
 * failure. The output re-admits as input, so `content-read | content-read`
 * composes — content induced on content.
 *
 *   content-read log.jsonl
 *   cat a.jsonl b.jsonl | content-read --order=truth --output=table
 *
 * Parameters: --order=knowledge|truth (default knowledge),
 *             --bound=least|greatest (default least),
 *             --output=jsonl|json|table (default jsonl).
 */
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import {
  parseArgs,
  readStdin,
  readContent,
  recordOf,
  formatRecords,
  sectionOf,
  type Args,
} from "./wire.mjs";

async function main(argv: readonly string[]): Promise<number> {
  const args: Args = parseArgs(argv);
  const order = (args.flags.get("order") ?? "knowledge") as "knowledge" | "truth";
  const bound = (args.flags.get("bound") ?? "least") as "least" | "greatest";
  const output = args.flags.get("output") ?? "jsonl";
  const path = args.positionals[0];

  const text = path !== undefined ? await readFile(path, "utf8") : await readStdin();
  const carrier = readContent(text);
  const readings = carrier.fixedPointReadings;
  const reading = order === "knowledge"
    ? (bound === "least" ? readings.knowledgeLeast : readings.knowledgeGreatest)
    : (bound === "least" ? readings.truthLeast : readings.truthGreatest);
  const section = sectionOf(reading);
  process.stdout.write(formatRecords(section.entries.map(recordOf), output));
  return 0;
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((error: unknown) => {
      process.stderr.write(`content-read: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}
