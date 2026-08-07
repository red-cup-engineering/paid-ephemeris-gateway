#!/usr/bin/env node
/**
 * Pipe transport for `admitGameDocument()`.
 *
 * Domain: stdin containing a JSON gaming request or `[token, claim]` pair.
 * Codomain: stdout containing canonical JSON admission evidence.
 */
import { admitGameDocument } from "./admitting-game.mjs";
import { runDocumentScript } from "./transport.mjs";

runDocumentScript(admitGameDocument)
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    process.stderr.write(`admit-game: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
