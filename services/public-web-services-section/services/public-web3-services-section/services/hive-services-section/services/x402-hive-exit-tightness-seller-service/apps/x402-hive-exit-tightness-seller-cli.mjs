#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";
import { sellHiveExitTightnessResource } from "../src/sell-hive-exit-tightness-resource.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const AAGAARD_SCRIPT = join(HERE, "../../aagaard/scripts/hive-engine-exit-tightness.mjs");
const HIVE_NODES = ["https://api.hive.blog", "https://api.openhive.network"];

/**
 * Composes `sellHiveExitTightnessResource` with the real aagaard read-only probe (invoked as an
 * external command, never imported or modified) and, on a settled sale, the real semantic record
 * journal, wiring both the live default Hive node pair and the sold report's own account/symbol.
 * @param {object} request A `sellHiveExitTightnessResource` request plus `reportRequest` ({account, symbol, quantity?}) and `journalRoot` (the ancestor services-section path the settlement witness is recorded under).
 * @returns {Promise<object>} The `{status, body}` response, with `body.settlement.journal` set to the recorded receipt's `id` on a 200.
 */
export async function serveHiveExitTightnessX402Resource(request) {
  const { reportRequest, journalRoot, ...sellRequest } = request;
  const args = ["--account", reportRequest.account, "--symbol", reportRequest.symbol];
  if (reportRequest.quantity) args.push("--quantity", reportRequest.quantity);
  const response = await sellHiveExitTightnessResource({
    ...sellRequest,
    hiveNodes: sellRequest.hiveNodes ?? HIVE_NODES,
    reportCommand: { command: "node", arguments: [AAGAARD_SCRIPT, ...args], directory: HERE },
  });
  if (response.status === 200 && journalRoot) {
    const journal = createSemanticRecordJournal({
      root: journalRoot,
      objectKind: "red-cup-engineering.x402-hbd-purchase-settlement-record",
    });
    const receipt = journal.record({
      category: "settlement",
      record: response.body.settlement,
      recordedAt: new Date().toISOString(),
      charge: { support: true, refutation: false },
    });
    response.body.settlement = { ...response.body.settlement, journal: { id: receipt.id, objectKind: receipt.objectKind } };
  }
  return response;
}

if (import.meta.main) {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  for (const line of text.split("\n")) {
    if (line.length > 0) process.stdout.write(`${JSON.stringify(await serveHiveExitTightnessX402Resource(JSON.parse(line)))}\n`);
  }
}
