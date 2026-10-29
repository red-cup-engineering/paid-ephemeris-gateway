import assert from "node:assert/strict";
import test from "node:test";
import { observerBlock, spliceObserver } from "../lib/management/install-locality-knowledge-discovery-observer.mjs";

const options = { ttiRoot: "/srv/tti", nodePath: "/usr/bin/node", channelId: "1184863861065658422", messageId: "1529240621334663199" };

test("installs one exact hourly locality observer without disturbing unrelated recurrence", () => {
  const existing = "0 0 * * * unrelated\n", once = spliceObserver(existing, options), twice = spliceObserver(once, options);
  assert.equal(once, twice);
  assert.match(once, /0 0 \* \* \* unrelated/u);
  assert.match(observerBlock(options), /23 \* \* \* \*.*flock/u);
  assert.match(observerBlock(options), /locality-knowledge-experiment-controller\.mjs --live/u);
  assert.match(once, /--channel-id 1184863861065658422 --message-id 1529240621334663199/u);
});

test("refuses ambiguous Discord targets", () => {
  assert.throws(() => observerBlock({ ...options, messageId: "mainland" }), /exact Discord channel and message IDs/u);
});
