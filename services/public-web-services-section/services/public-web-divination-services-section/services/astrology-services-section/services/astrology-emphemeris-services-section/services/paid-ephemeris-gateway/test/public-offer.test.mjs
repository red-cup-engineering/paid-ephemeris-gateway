import assert from "node:assert/strict";
import test from "node:test";

import { PUBLIC_OFFERS, PRECISION_OFFER, verifyPublicOffer } from "../scripts/verify-public-offer.mjs";

const PAY_TO = "0x32886F6F361C1d570255c2762967A2e41D0E9B1a";
const acceptance = { scheme: "exact", network: "eip155:8453", asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", payTo: PAY_TO };
function fixture({ payTo = acceptance.payTo, offers = PUBLIC_OFFERS } = {}) {
  return async (url) => {
    if (url.endsWith("/v1/status")) return Response.json({ status: "ok", service: "paid-ephemeris-gateway" });
    const offer = [...offers, PRECISION_OFFER].find((candidate) => url.endsWith(candidate.path));
    const challenge = { x402Version: 2, resource: { url }, accepts: [{ ...acceptance, payTo, amount: offer.amount }] };
    return new Response("{}", { status: 402, headers: { "payment-required": Buffer.from(JSON.stringify(challenge)).toString("base64url") } });
  };
}

test("PUBLIC_OFFERS is exactly the three routes the Workers transport serves", () => {
  assert.deepEqual(PUBLIC_OFFERS.map((offer) => offer.name), ["Moment Essentials", "Astronomy Positions", "x402 Market Observation"]);
});

test("qualifies the Workers-served public offers without attempting payment, and skips Precision Moment with no PRECISION_ORIGIN", async () => {
  const result = await verifyPublicOffer({ origin: "https://example.test", precisionOrigin: undefined, fetchImpl: fixture() });
  assert.equal(result.qualified, true);
  assert.equal(result.offers.length, 3);
  assert.equal(result.precisionAssayed, false);
  assert.equal(result.paymentAttempted, false);
});

test("refuses payout identity drift", async () => {
  await assert.rejects(
    verifyPublicOffer({ origin: "https://example.test", precisionOrigin: undefined, fetchImpl: fixture({ payTo: "0x1111111111111111111111111111111111111111" }) }),
    /challenge drifted/u,
  );
});

test("assays Precision Moment only when an explicit PRECISION_ORIGIN is supplied, against that origin", async () => {
  const result = await verifyPublicOffer({ origin: "https://example.test", precisionOrigin: "https://precision.example.test", fetchImpl: fixture() });
  assert.equal(result.precisionAssayed, true);
  assert.equal(result.offers.length, 4);
  assert.ok(result.offers.some((offer) => offer.name === "Precision Moment"));
});

test("Precision Moment assay still rejects a drifted challenge when supplied", async () => {
  await assert.rejects(
    verifyPublicOffer({
      origin: "https://example.test",
      precisionOrigin: "https://precision.example.test",
      fetchImpl: fixture({ payTo: "0x1111111111111111111111111111111111111111" }),
    }),
    /challenge drifted/u,
  );
});
