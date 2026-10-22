import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { querySettlementRecords, recordSettlementRecord } from "@red-cup-engineering/witness-journal-document-service";
import { startWitnessJournalProviderProcess } from "@red-cup-engineering/witness-journal-document-service/test-provider";

import { run as runAagaard } from "../../hive-services-section/services/aagaard/src/contract-fleet-observation.mjs";
import { providerPath, runProcurement } from "../src/procure-hive-fleet-observation.mjs";

const AT = "2026-07-18T21:30:00.000Z";
const AAGAARD = "urn:ame:aagaard";
const AAGAARD_ACCOUNT = "eip155:31337:0xb0dfc2eb77fb622c93f791071c66b039a7ae428d";
const AAGAARD_PROVIDER_PATH = fileURLToPath(new URL(
  "../../hive-services-section/services/aagaard/src/contract-fleet-observation.mjs",
  import.meta.url,
));
let witnessJournal;
test.before(async () => { witnessJournal = await startWitnessJournalProviderProcess(); });
test.after(async () => { await witnessJournal.close(); });

function tick() {
  return { kind: "aagaard.fleet-tick", ts: "2026-07-18T05:42:36.779Z", running: true, live: true, enabled: ["voting", "trading"], accounts: [
    { account: "alpha", voting: { votesPlanned: 1, votesBroadcast: 0, votesSkipped: 1, execution: { errors: 0 } },
      trading: { mode: "propose-only", hive: "2.500 HIVE", hbd: "0.250 HBD", tradesPlanned: 1, tradesExecuted: 0, lpPlanned: 2, lpExecuted: 0, savingsExecuted: false } },
  ] };
}

async function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "agrodao-procurement-test-"));
  const buyerRoot = join(root, "buyer");
  t.after(() => rmSync(root, { recursive: true, force: true }));
  await recordSettlementRecord({ agentUrl: witnessJournal.agentCardUrl, settlement: AAGAARD_ACCOUNT,
    actor: AAGAARD, category: "aagaard.fleet-tick", recordedAt: tick().ts, record: tick() });
  const env = { AGRODAO_DATA_ROOT: buyerRoot, AAGAARD_PROVIDER_PATH,
    WITNESS_JOURNAL_RDF_AGENT: witnessJournal.agentCardUrl };
  return { buyerRoot, env };
}

test("AGRODAO procures Aagaard's provider-authored observation into its own history", async (t) => {
  const value = await fixture(t);
  assert.match(providerPath(value.env), /aagaard\/src\/contract-fleet-observation\.mjs$/);
  const trade = await runProcurement(AT, value.env, runAagaard);
  assert.equal(trade.ok, true);
  assert.deepEqual(trade.acceptance.object.capability.allowedActions, ["invoke-service", "provider-local-witness-journal-evidence"]);
  assert.equal(trade.result.object.receipt.assetSettlementClaimed, false);
  assert.equal(trade.disclosure.owner, "urn:ame:agrodao");
  assert.equal(trade.disclosure.scopeCompleteness, "partial-chain-observation");
  assert.equal(trade.disclosure.custodyFinding, "no-chain-execution-observed-in-source-tick");
  assert.ok(trade.disclosure.limits.includes("does-not-prove-key-custody-soundness"));
  assert.equal(trade.completion.customerOutcome, trade.disclosure.id);
  assert.equal(trade.completion.assetSettlementClaimed, false);

  const records = (category) => querySettlementRecords(category, { agentUrl: witnessJournal.agentCardUrl });
  assert.equal((await records("aagaard.fleet-observation-exchange")).length, 1);
  assert.equal((await records("aagaard.fleet-observation-receipt")).length, 1);
  for (const forbidden of ["books", "quotes", "witness-bit-lots", "transactions"]) {
    assert.equal((await records(forbidden)).length, 0);
  }
});

test("AGRODAO fails closed without the contracted witness-journal RDF provider", async () => {
  await assert.rejects(() => runProcurement(AT, {
    AGRODAO_DATA_ROOT: "/tmp/agrodao-no-witness-journal",
    AAGAARD_PROVIDER_PATH,
  }, runAagaard), /WITNESS_JOURNAL_RDF_AGENT/);
});
