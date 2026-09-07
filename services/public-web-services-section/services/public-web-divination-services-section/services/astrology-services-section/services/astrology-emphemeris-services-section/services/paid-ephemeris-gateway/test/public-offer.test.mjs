import assert from "node:assert/strict";
import test from "node:test";

import { PUBLIC_OFFERS, verifyPublicOffer } from "../scripts/verify-public-offer.mjs";

const acceptance = { scheme: "exact", network: "eip155:8453", asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", payTo: "0x42F72C0a340A4A55C082Fe42483e87691D2bff64" };
function fixture({ payTo = acceptance.payTo } = {}) {
  return async (url) => {
    if (url.endsWith("/v1/status")) return Response.json({ status: "ok", service: "paid-ephemeris-gateway" });
    const offer = PUBLIC_OFFERS.find((candidate) => url.endsWith(candidate.path));
    const challenge = { x402Version: 2, resource: { url }, accepts: [{ ...acceptance, payTo, amount: offer.amount }], extensions: { bazaar: { routeTemplate: offer.routeTemplate } } };
    return new Response("{}", { status: 402, headers: { "payment-required": Buffer.from(JSON.stringify(challenge)).toString("base64url") } });
  };
}

test("qualifies both public Coinbase offers without attempting payment", async () => {
  const result = await verifyPublicOffer({ origin: "https://example.test", fetchImpl: fixture() });
  assert.equal(result.qualified, true);
  assert.equal(result.offers.length, 3);
  assert.equal(result.paymentAttempted, false);
});

test("refuses payout identity drift", async () => {
  await assert.rejects(
    verifyPublicOffer({ origin: "https://example.test", fetchImpl: fixture({ payTo: "0x1111111111111111111111111111111111111111" }) }),
    /challenge drifted/u,
  );
});
