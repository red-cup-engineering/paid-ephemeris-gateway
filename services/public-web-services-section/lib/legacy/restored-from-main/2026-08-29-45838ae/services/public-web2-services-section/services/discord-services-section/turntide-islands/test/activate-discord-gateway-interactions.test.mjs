import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

const semanticId = (value) => identifyJsonSemanticContent({ objectKind: "turntide-islands.record", value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
import { activateDiscordGatewayInteractions } from "../lib/management/activate-discord-gateway-interactions.mjs";

function withId(body) { return { ...body, id: semanticId(body) }; }
const ready = withId({ type: "TTIDiscordInteractionGatewayReady", version: 1, status: "ready", recordedAt: "2026-07-21T22:31:46.000Z", applicationId: "app", guildId: "guild", deliveryMode: "discord-interaction-create-gateway-event-with-http-callback", intents: 0, publicIngressRequired: false, interactionTokensRecorded: false });

test("switches only after a current witnessed READY receipt and records intent before effect", async () => {
  const records = [ready], writes = [], calls = [], store = { records(category) { return category.includes("ready") ? records : []; }, async record(input) { writes.push(input.record); } };
  const fetch = async (url, init) => { calls.push({ url: String(url), method: init.method, body: init.body }); const endpoint = calls.some((call) => call.method === "PATCH") ? null : "https://dead.example/discord/interactions"; return new Response(JSON.stringify({ id: "app", interactions_endpoint_url: init.method === "PATCH" ? null : endpoint }), { status: 200 }); };
  const result = await activateDiscordGatewayInteractions({ live: true, token: "token", guildId: "guild", witnessJournalAgentUrl: "unused", recordedAt: "2026-07-21T22:32:00.000Z", store, fetch });
  assert.equal(result.status, "gateway-delivery-active"); assert.equal(calls.filter((call) => call.method === "PATCH").length, 1); assert.equal(writes[0].type, "TTIDiscordInteractionDeliveryTransitionIntent"); assert.equal(writes[1].type, "TTIDiscordInteractionDeliveryTransitionReceipt");
});

test("refuses stale, foreign, or non-self-addressed readiness before Discord mutation", async () => {
  for (const candidate of [{ ...ready, id: "bad" }, { ...ready, guildId: "foreign" }, { ...ready, recordedAt: "2026-07-21T20:00:00.000Z" }]) {
    let patches = 0; const store = { records() { return [candidate]; }, async record() { throw new Error("must not record"); } };
    const fetch = async (_url, init) => { if (init.method === "PATCH") patches += 1; return new Response(JSON.stringify({ id: "app", interactions_endpoint_url: "https://dead.example" }), { status: 200 }); };
    await assert.rejects(() => activateDiscordGatewayInteractions({ live: true, token: "token", guildId: "guild", witnessJournalAgentUrl: "unused", recordedAt: "2026-07-21T22:32:00.000Z", store, fetch }), /READY receipt/u); assert.equal(patches, 0);
  }
});
