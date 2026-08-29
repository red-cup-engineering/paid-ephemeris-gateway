import assert from "node:assert/strict";
import test from "node:test";

import { assessSplinterlandsOwnedModernCore } from "../src/collection.mjs";

const DETAILS = [
  { id: 640, name: "Prunda Undervesch", type: "Summoner", color: "White", secondary_color: "Blue", editions: "12", stats: { mana: [3] } },
  { id: 575, name: "Mar Toren Seeker", type: "Monster", color: "Blue", editions: "12", stats: { mana: [4] } },
  { id: 611, name: "Kha'zi Fire Mage", type: "Monster", color: "Red", editions: "12", stats: { mana: [3] } },
];

const OWNED = [
  { uid: "C12-640-5941874T9C", card_detail_id: 640, edition: 12, level: 1, delegated_to: null },
  { uid: "C12-575-ZQY8LUWF80", card_detail_id: 575, edition: 12, level: 1, delegated_to: null },
  { uid: "C12-611-5G8KJG6FKG", card_detail_id: 611, edition: 12, level: 1, delegated_to: null },
];

test("Splinterlands owned Modern readiness recognizes a compatible archon core", () => {
  const readiness = assessSplinterlandsOwnedModernCore(OWNED, DETAILS, [12, 14, 15, 16]);
  assert.equal(readiness.kind, "ready-owned-core");
  assert.deepEqual(readiness.compatibleElements, ["Blue"]);
  assert.equal(readiness.summoners[0].uid, "C12-640-5941874T9C");
  assert.equal(readiness.monsters.length, 2);
});

test("Splinterlands readiness refuses a bare or delegated core", () => {
  assert.equal(assessSplinterlandsOwnedModernCore(OWNED.slice(1), DETAILS, [12, 14, 15, 16]).kind, "refuse");
  assert.equal(assessSplinterlandsOwnedModernCore([{ ...OWNED[0], delegated_to: "other" }, ...OWNED.slice(1)], DETAILS, [12, 14, 15, 16]).kind, "refuse");
});

test("the readiness reason names its inventory-only boundary", () => {
  const readiness = assessSplinterlandsOwnedModernCore(OWNED, DETAILS, [12, 14, 15, 16]);
  assert.match(readiness.reason, /must not queue, advise, select, or submit/);
});

test("collection parsing rejects malformed evidence", () => {
  assert.throws(() => assessSplinterlandsOwnedModernCore([{ uid: "BAD-UID", card_detail_id: 640, edition: 12, level: 1, delegated_to: null }], DETAILS, [12]), /invalid owned Splinterlands card UID/);
  assert.throws(() => assessSplinterlandsOwnedModernCore(OWNED, DETAILS, []), /positive integers/);
});
