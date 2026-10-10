import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

const semanticId = (value) => identifyJsonSemanticContent({ objectKind: "turntide-islands.record", value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
import { assayUnionMediaActivityPubCarrier } from "../lib/management/assay-union-media-activitypub-carrier.mjs";

test("the TTI carrier proposal is self-addressed and grants no live authority", () => {
  const proposal = JSON.parse(readFileSync(new URL("../content/contracts/union-media-activitypub-carrier-proposal.json", import.meta.url), "utf8"));
  const { id, ...body } = proposal;
  assert.equal(id, semanticId(body));
  assert.equal(proposal.providerAccepted, false);
  assert.equal(proposal.publicHostingAccepted, false);
  assert.equal(proposal.liveEffectsAuthorized, false);
  assert.equal(proposal.consideration, null);
  assert.equal(proposal.revenueRecognized, false);
  assert.equal(proposal.profitRecognized, false);
});

test("refuses the sovereign carrier while its declared runtime dependencies are unavailable", async () => {
  const assay = await assayUnionMediaActivityPubCarrier({ recordedAt: "2026-07-22T02:00:00.000Z" });
  const { id, ...body } = assay;
  assert.equal(id, semanticId(body));
  assert.equal(assay.status, "refused-provider-runtime-unavailable");
  assert.equal(assay.failureCode, "declared-runtime-dependency-unavailable");
  assert.equal(assay.unsignedInboxStatus, null);
  assert.equal(assay.unsignedCallbackInvocations, 0);
  assert.equal(assay.signedDeliveryObserved, false);
  assert.equal(assay.exactRmnBytesRecovered, false);
  assert.equal(assay.callbackInvocations, 0);
  assert.equal(assay.providerPackageCopiedIntoTti, false);
  assert.equal(assay.providerCustodyBytesInspected, false);
  assert.equal(assay.persistentKeysCreated, false);
  assert.equal(assay.externalPublicEffect, false);
  assert.equal(assay.providerAccepted, false);
  assert.equal(assay.publicHostingAccepted, false);
  assert.equal(assay.cashRevenueRecognized, false);
  assert.equal(assay.monetaryProfitRecognized, false);
});
