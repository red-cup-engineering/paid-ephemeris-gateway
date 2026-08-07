#!/usr/bin/env node
/**
 * animating-govern — package-bin strategy for governing facts.
 *
 * Reads a complete EAVT JSONL carrier from stdin and emits the same carrier
 * with derived `scripts.govern` result facts. This is a package-bin morphism,
 * not an interactive CLI.
 */
import { fileURLToPath } from "node:url";
import { runScript } from "./wire.mjs";

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  runScript("scripts.govern")
    .then((code) => process.exit(code))
    .catch((error: unknown) => {
      process.stderr.write(`animating-govern: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}
