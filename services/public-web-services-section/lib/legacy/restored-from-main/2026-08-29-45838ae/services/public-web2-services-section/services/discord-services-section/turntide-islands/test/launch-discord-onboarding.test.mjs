import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { discordOnboardingMessage, launchDiscordOnboarding } from "../lib/management/launch-discord-onboarding.mjs";

const product = JSON.parse(readFileSync(new URL("../content/products/discord-onboarding.json", import.meta.url), "utf8"));

test("onboarding is bounded, navigable, and keeps participation outside commercial consent", async () => {
  const content = discordOnboardingMessage(product);
  assert.ok(content.length <= 2000);
  assert.match(content, /Welcome to Turntide Islands/u);
  assert.match(content, /Ordinary messages, reactions, roles, and participation are not consent/u);
  assert.match(content, /auctions are still closed/u);
  assert.match(content, /founding checkout is still closed/u);
  assert.match(content, /does not automatically profile members/u);
  const plan = await launchDiscordOnboarding({ product });
  assert.equal(plan.type, "TTIDiscordOnboardingPlan");
  assert.deepEqual(plan.externalEffects, []);
});
