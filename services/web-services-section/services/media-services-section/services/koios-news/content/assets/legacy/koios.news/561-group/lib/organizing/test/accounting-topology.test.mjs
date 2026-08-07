/**
 * accounting topology - financial and ledger predication carriers in organizing.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  allHoldingAccountEntries,
  financialKnowledgeSection,
  holdingUtterance,
  induceFinancialTopology,
} from "../dist/accounting/topology/financial.mjs";
import {
  allDebitNormal,
  debitNormalUtterance,
  induceLedgerTopology,
  ledgerKnowledgeSection,
} from "../dist/accounting/topology/ledger.mjs";

test("organizing financial topology settles utterance logs into readable sections", () => {
  const carrier = induceFinancialTopology([holdingUtterance("Assets:Cash", "USD")]);
  const section = financialKnowledgeSection(carrier);

  assert.equal(carrier.kind, "financial.topology.carrier");
  assert.equal(allHoldingAccountEntries(section).length >= 1, true);
});

test("organizing ledger topology specializes financial topology for accounting claims", () => {
  const carrier = induceLedgerTopology([debitNormalUtterance("Assets:Cash")]);
  const section = ledgerKnowledgeSection(carrier);

  assert.equal(carrier.kind, "ledger.topology.carrier");
  assert.equal(allDebitNormal(section).length >= 1, true);
});
