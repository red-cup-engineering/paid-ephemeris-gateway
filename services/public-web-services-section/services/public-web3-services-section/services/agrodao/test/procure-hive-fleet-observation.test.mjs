import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { querySettlementRecords, recordSettlementRecord } from "@red-cup-engineering/witness-journal-document-service";
import { startWitnessJournalProviderProcess } from "@red-cup-engineering/witness-journal-document-service/test-provider";

import { providerPath, runProcurement } from "../src/procure-hive-fleet-observation.mjs";

const AT = "2026-07-18T21:30:00.000Z";
const AAGAARD = "urn:ame:aagaard";
const AAGAARD_ACCOUNT = "eip155:31337:0xb0dfc2eb77fb622c93f791071c66b039a7ae428d";
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
  const buyerRoot = join(root, "buyer"); const sellerRoot = join(root, "seller");
  t.after(() => rmSync(root, { recursive: true, force: true }));
  await recordSettlementRecord({ agentUrl: witnessJournal.agentCardUrl, settlement: AAGAARD_ACCOUNT,
    actor: AAGAARD, category: "aagaard.fleet-tick", recordedAt: tick().ts, record: tick() });
  const env = { AGRODAO_DATA_ROOT: buyerRoot, AAGAARD_CONTRACT_DATA_ROOT: sellerRoot, WITNESS_JOURNAL_RDF_AGENT: witnessJournal.agentCardUrl };
  return { buyerRoot, sellerRoot, env };
}

test("AGRODAO procures Aagaard's exact-law observation into its own WitnessJournal history", async (t) => {
  const value = await fixture(t);
  assert.match(providerPath(value.env), /aagaard\/src\/contract-fleet-observation\.mjs$/);
  const trade = await runProcurement(AT, value.env);
  assert.equal(trade.ok, true);
  assert.deepEqual(trade.acceptance.object.capability.allowedActions, ["invoke-service", "provider-local-witness-journal-evidence"]);
  assert.equal(trade.result.object.receipt.assetSettlementClaimed, false);
  assert.equal(trade.disclosure.owner, "urn:ame:agrodao");
  assert.equal(trade.disclosure.scopeCompleteness, "partial-chain-observation");
  assert.equal(trade.disclosure.custodyFinding, "no-chain-execution-observed-in-source-tick");
  assert.ok(trade.disclosure.limits.includes("does-not-prove-key-custody-soundness"));
  assert.equal(trade.completion.customerOutcome, trade.disclosure.id);
  assert.equal(trade.completion.assetSettlementClaimed, false);

  assert.equal((await querySettlementRecords("agrodao.treasury-position-disclosure")).length, 1);
  assert.equal((await querySettlementRecords("agrodao.fleet-observation-procurement-completion")).length, 1);
  assert.equal((await querySettlementRecords("aagaard.fleet-observation-exchange")).length, 1);
  assert.equal((await querySettlementRecords("aagaard.fleet-observation-receipt")).length, 1);
  for (const forbidden of ["books", "quotes", "witness-bit-lots", "transactions"]) {
    assert.equal((await querySettlementRecords(forbidden)).length, 0);
    assert.equal((await querySettlementRecords(forbidden)).length, 0);
  }
});

test("AGRODAO fails closed without the contracted witness-journal RDF provider", async () => {
  await assert.rejects(() => runProcurement(AT, { AGRODAO_DATA_ROOT: "/tmp/agrodao-no-witness-journal" }), /WITNESS_JOURNAL_RDF_AGENT/);
});
