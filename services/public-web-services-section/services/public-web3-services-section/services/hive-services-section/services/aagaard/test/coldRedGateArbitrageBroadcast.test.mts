import assert from "node:assert/strict";
import test from "node:test";

import { validateRemoteArbitrageRequest } from "../scripts/cold-red-gate-arbitrage-broadcast.mjs";

function request() {
  const calls = [
    { contractName: "marketpools", contractAction: "swapTokens", contractPayload: { tokenPair: "SWAP.HIVE:LEN", tokenSymbol: "LEN", tokenAmount: "100.000", tradeType: "exactOutput", maxAmountIn: "0.10000000" } },
    { contractName: "market", contractAction: "sell", contractPayload: { symbol: "LEN", quantity: "100.000", price: "0.00102000", expiration: 300 } },
  ];
  return { kind: "aagaard.hive-write", account: "sigmund-vexler", role: "active", lane: "trading", target: "LEN:pool-to-book-round-trip",
    keyFile: "cold-red-gate:sigmund-vexler/active", operation: ["custom_json", { id: "ssc-mainnet-hive", required_auths: ["sigmund-vexler"], required_posting_auths: [], json: JSON.stringify(calls) }] };
}

test("cold-red-gate active signer admits only a profitable, capped pool-to-book envelope", () => {
  assert.equal(validateRemoteArbitrageRequest(request()), true);
  const changed = request();
  const calls = JSON.parse(changed.operation[1].json);
  calls[0].contractPayload.maxAmountIn = "1.00000001";
  changed.operation[1].json = JSON.stringify(calls);
  assert.throws(() => validateRemoteArbitrageRequest(changed), /refused/u);
});

test("the same bounded envelope is account-scoped for Michael's separate float", () => {
  const michael = request();
  michael.account = "michael561";
  michael.keyFile = "cold-red-gate:michael561/active";
  michael.operation[1].required_auths = ["michael561"];
  assert.equal(validateRemoteArbitrageRequest(michael), true);
  michael.operation[1].required_auths = ["sigmund-vexler"];
  assert.throws(() => validateRemoteArbitrageRequest(michael), /refused/u);
});
