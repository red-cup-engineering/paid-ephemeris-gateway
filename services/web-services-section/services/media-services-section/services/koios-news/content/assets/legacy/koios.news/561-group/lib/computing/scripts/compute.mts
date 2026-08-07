#!/usr/bin/env node
/**
 * Pipe transport for `computeDocument()`.
 *
 * Domain: stdin containing a JSON computing request.
 * Codomain: stdout containing canonical JSON admission evidence.
 */
import { computeDocument } from "./computing-document.mjs";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function runDocumentScript(): Promise<number> {
  process.stdout.write(computeDocument(await readStdin()));
  return 0;
}

runDocumentScript()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    process.stderr.write(`compute: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
