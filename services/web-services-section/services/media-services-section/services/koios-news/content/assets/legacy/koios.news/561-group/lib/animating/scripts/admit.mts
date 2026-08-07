#!/usr/bin/env node
/**
 * animating-admit — package-bin strategy for tool admission facts.
 *
 * Reads a complete EAVT JSONL carrier from stdin and emits the same carrier
 * with derived `scripts.admit` result facts. This is a package-bin morphism,
 * not an interactive CLI.
 */
import { fileURLToPath } from "node:url";
import { runScript } from "./wire.mjs";

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  runScript("scripts.admit")
    .then((code) => process.exit(code))
    .catch((error: unknown) => {
      process.stderr.write(`animating-admit: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}
