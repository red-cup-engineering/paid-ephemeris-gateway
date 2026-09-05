// keymap.test — the CI-checked completeness guarantee itself: DEFAULT_KEYMAP must bind every real
// action, a remap that drops or clashes an action must be caught, and intentFromKeymap must actually
// translate pressed keys correctly through an arbitrary (non-default) map.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ACTIONS, DEFAULT_KEYMAP, validateKeymap, intentFromKeymap } from "./keymap.mts";

test("keymap: the shipped DEFAULT_KEYMAP is complete — every action bound, no test has to remember to add one", () => {
  const result = validateKeymap(DEFAULT_KEYMAP);
  assert.deepStrictEqual(result.errors, []);
  assert.strictEqual(result.valid, true);
  for (const action of ACTIONS) {
    assert.ok(DEFAULT_KEYMAP[action] && DEFAULT_KEYMAP[action].length > 0, `action "${action}" must be bound`);
  }
});

test("keymap: a map missing an action fails validation, naming exactly which action is missing", () => {
  const { crouch, ...rest } = DEFAULT_KEYMAP;
  const result = validateKeymap(rest);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.startsWith("crouch:")), `expected an error naming "crouch", got: ${result.errors}`);
});

test("keymap: two actions bound to the same key is rejected as a clash", () => {
  const clashing = { ...DEFAULT_KEYMAP, jump: DEFAULT_KEYMAP.interact };
  const result = validateKeymap(clashing);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("already bound")), `expected a clash error, got: ${result.errors}`);
});

test("keymap: intentFromKeymap translates a pressed-key set through an arbitrary remap, not just the default", () => {
  const remap = { ...DEFAULT_KEYMAP, moveForward: "ArrowUp", jump: "KeyJ" };
  const pressed = new Set(["ArrowUp", "KeyJ"]);
  const intent = intentFromKeymap(remap, pressed);
  assert.strictEqual(intent.forward, 1);
  assert.strictEqual(intent.jump, true);
  assert.strictEqual(intent.strafe, 0);
  assert.strictEqual(intent.fire, false);
});

test("keymap: opposite movement keys held together cancel to zero (forward+backward, strafeLeft+strafeRight)", () => {
  const pressed = new Set([DEFAULT_KEYMAP.moveForward, DEFAULT_KEYMAP.moveBackward, DEFAULT_KEYMAP.strafeLeft, DEFAULT_KEYMAP.strafeRight]);
  const intent = intentFromKeymap(DEFAULT_KEYMAP, pressed);
  assert.strictEqual(intent.forward, 0);
  assert.strictEqual(intent.strafe, 0);
});
