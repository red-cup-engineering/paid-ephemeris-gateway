import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("current federation descriptors name five remote status authorities without claiming local durable units", () => {
  const descriptors = JSON.parse(readFileSync(new URL("../content/config/channel-status-agents.json", import.meta.url), "utf8"));
  assert.equal(descriptors.descriptors.length, 5);
  for (const descriptor of descriptors.descriptors) {
    assert.match(descriptor.agentUrl, /^http:\/\/127\.0\.0\.1:\d+\/\.well-known\/agent-card\.json$/u);
    assert.match(descriptor.expectedAgentCardIdentity, /^ni:\/\/\/sha-256;/u);
  }
});
