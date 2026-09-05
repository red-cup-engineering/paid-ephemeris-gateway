#!/usr/bin/env node
// The inbound HTTP listener for Stripe Checkout and webhook events. Business
// logic (offering catalog, signature verification, receipt persistence)
// stays in @red-cup-engineering/stripe-services-section; this module is only the
// listening/routing shell, matching the split between engineering capability
// (red-cup-engineering) and the settlement's inbound-serving membrane
// (rsc-quiescent). Relocated from
// stripe-payment-acceptance-enterprise/src/server.mjs.
import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { ACTOR, CHECKOUT_CONTRACT, ingestWebhook, invokeCheckout, readiness, solicitCheckout } from "@red-cup-engineering/stripe-services-section/service";

const port = Number(process.env.STRIPE_PAYMENT_SERVER_PORT ?? 4242);
const host = process.env.STRIPE_PAYMENT_SERVER_HOST ?? "127.0.0.1";
const limit = 1024 * 1024;
function send(response, status, body) { const text = JSON.stringify(body); response.writeHead(status, { "content-type": "application/activity+json; charset=utf-8", "content-length": Buffer.byteLength(text) }); response.end(text); }
async function read(request) { const chunks = []; let size = 0; for await (const chunk of request) { size += chunk.length; if (size > limit) throw new Error("body-too-large"); chunks.push(chunk); } return Buffer.concat(chunks).toString("utf8"); }
function authorized(request) { const expected = process.env.STRIPE_CUSTOMER_CONTRACT_TOKEN ?? ""; const actual = request.headers.authorization?.replace(/^Bearer /u, "") ?? ""; if (!expected || expected.length !== actual.length) return false; return timingSafeEqual(Buffer.from(expected), Buffer.from(actual)); }

export function createStripeWebhookReceiver() {
  return createServer(async (request, response) => {
    try {
      if (request.method === "GET" && request.url === "/health") return send(response, 200, readiness());
      if (request.method === "POST" && request.url === "/webhooks/stripe") { const rawBody = await read(request); const result = await ingestWebhook({ rawBody, signatureHeader: String(request.headers["stripe-signature"] ?? "") }); return send(response, result.type === "StripeWebhookRefusal" ? 400 : 200, result); }
      if (request.method === "POST" && request.url === "/v1/checkout-sessions") {
        if (!authorized(request)) return send(response, 401, { type: "Reject", reason: "customer-contract-token-refused" });
        const activity = JSON.parse(await read(request)); const offered = solicitCheckout(activity);
        if (offered.type !== "Offer") return send(response, 400, offered);
        const accepted = { "@context": "https://www.w3.org/ns/activitystreams", id: `${activity.id}:accept`, type: "Accept", actor: activity.actor, target: ACTOR, object: { type: "ServiceContract", contract: CHECKOUT_CONTRACT, offer: offered } };
        const result = await invokeCheckout(accepted); return send(response, result.type === "Accept" ? 201 : 502, result);
      }
      return send(response, 404, { type: "Reject", reason: "route-not-found" });
    } catch (error) { return send(response, error?.message === "body-too-large" ? 413 : 400, { type: "Reject", reason: error?.message === "body-too-large" ? "body-too-large" : "invalid-request" }); }
  });
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  createStripeWebhookReceiver().listen(port, host, () => process.stderr.write(`stripe webhook receiver listening on http://${host}:${port}\n`));
}
