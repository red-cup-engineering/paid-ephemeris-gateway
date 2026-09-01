import assert from "node:assert/strict";
import test from "node:test";

import { assessHashKingsRecovery, classifyDomainResponse, quoteHashKingsBudsPoolExit, statesAgree } from "../src/recovery.mjs";

const EVIDENCE = Object.freeze({
  account: "emsenn0",
  observedAt: "2026-07-22T03:00:00.000Z",
  providersAgree: true,
  domainDisposition: "parked",
  fungibles: Object.freeze([
    Object.freeze({ symbol: "BUDS", balance: "2.00000000", precision: 8 }),
    Object.freeze({ symbol: "HKWATER", balance: "25380.0000", precision: 4 }),
    Object.freeze({ symbol: "MOTA", balance: "2.2124", precision: 4 }),
  ]),
  nfts: Object.freeze([
    Object.freeze({ id: 4698, type: "seed", name: "Panama Red" }),
    Object.freeze({ id: 4699, type: "plot", name: "South America" }),
  ]),
  actualBuyOrderCounts: Object.freeze({ BUDS: 0, HKWATER: 0, MOTA: 0 }),
  budsPoolExitSwapHive: "0.00000027",
  ownNftListingCount: 0,
  latestNftTradeUnix: 1731071295,
});

test("HashKings exact pool quote proves the surviving BUDS exit is dust", () => {
  assert.equal(quoteHashKingsBudsPoolExit("2.00000000", "433822974.23881271", "60.47738494"), "0.00000027");
});

test("parked HashKings with no executable demand preserves wallet custody", () => {
  assert.deepEqual(assessHashKingsRecovery(EVIDENCE), {
    kind: "preserve-custody",
    reason: "the game domain is parked and no material executable bid or recent NFT sale justifies spending authority or market custody",
    nftCount: 2,
    recentComparableSale: false,
  });
});

test("actual demand or a recent sale only opens a separate recovery review", () => {
  assert.equal(assessHashKingsRecovery({ ...EVIDENCE, actualBuyOrderCounts: { BUDS: 0, HKWATER: 1, MOTA: 0 } }).kind, "review-recovery");
  assert.deepEqual(assessHashKingsRecovery({ ...EVIDENCE, latestNftTradeUnix: 1784685600 }), {
    kind: "review-recovery",
    reason: "recent independently confirmed NFT sales justify separately pricing a custody-changing listing",
    nftCount: 2,
    recentComparableSale: true,
  });
});

test("provider disagreement and precision drift fail closed", () => {
  assert.equal(assessHashKingsRecovery({ ...EVIDENCE, providersAgree: false }).kind, "refuse");
  const malformed = { ...EVIDENCE, fungibles: EVIDENCE.fungibles.map((asset) => (asset.symbol === "MOTA" ? { ...asset, precision: 8 } : asset)) };
  const assessment = assessHashKingsRecovery(malformed);
  assert.equal(assessment.kind, "refuse");
  assert.match(assessment.reason, /precision changed/);
});

test("independent HashKings observations must agree on all economic evidence", () => {
  const bare = { account: "emsenn0", fungibles: [], nfts: [], actualBuyOrderCounts: {}, budsPoolExitSwapHive: null, ownNftListingCount: 0, latestNftTradeUnix: null };
  assert.equal(statesAgree(bare, bare), true);
  assert.equal(statesAgree(bare, { ...bare, ownNftListingCount: 1 }), false);
});

test("HashKings JavaScript lander redirect is classified as parked", () => {
  assert.equal(classifyDomainResponse(200, "", '<script>window.onload=function(){window.location.href="/lander"}</script>'), "parked");
  assert.equal(classifyDomainResponse(302, "/lander", ""), "parked");
  assert.equal(classifyDomainResponse(200, "", "<main>Game</main>"), "operational");
});
