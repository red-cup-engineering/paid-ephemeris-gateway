import assert from "node:assert/strict";
import test from "node:test";
import { computeChart } from "@lenticule-science/divining/astrology";
import { featureMotion } from "../src/indicators.ts";

test("adapts shared astronomy motions to the persisted daily-indicator codec", () => {
  const motion = featureMotion(computeChart("2026-09-08T00:00:00Z"), "2026-09-08");
  if (motion.kind === "ingress") {
    assert.equal(typeof motion.ingress.signFrom.name, "string");
    assert.equal(typeof motion.ingress.signTo.name, "string");
    assert.ok(motion.ingress.direction === "direct" || motion.ingress.direction === "retrograde");
    return;
  }
  assert.equal(typeof motion.aspect.aspect.angle, "number");
  if (motion.exactTime !== undefined) assert.match(motion.exactTime, /^\d{4}-\d{2}-\d{2}T/u);
});
