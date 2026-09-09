import assert from "node:assert/strict";
import test from "node:test";

import { ASTRONOMY_POSITIONS_PRICE, ASTRONOMY_POSITIONS_ROUTE, computeAstronomyPositions } from "../src/astronomy-positions-route.mjs";

test("computeAstronomyPositions(): astronomy-only projection, no signs, no aspects, no interpretation", () => {
  const result = computeAstronomyPositions("2026-07-21T00:00:00Z");
  assert.equal(result.tier, "astronomy-positions");
  assert.equal(result.time, "2026-07-21T00:00:00.000Z");
  assert.ok(typeof result.frame === "string" && result.frame.length > 0);
  assert.equal(Object.keys(result.bodies).length, 10);
  for (const body of Object.values(result.bodies)) {
    assert.deepEqual(Object.keys(body).sort(), ["latitude", "longitude", "speed"]);
    assert.ok(!("sign" in body) && !("element" in body) && !("motion" in body) && !("retrograde" in body));
  }
  assert.ok(!("aspects" in result));
  assert.deepEqual(Object.keys(result.lunarPhase).sort(), ["elongation", "illuminatedFraction", "trend"]);
  assert.ok(result.provenance && typeof result.provenance === "object");
  assert.ok(result.accuracy && typeof result.accuracy === "object");
});

test("prices Astronomy Positions at $0.04 on its own templated route", () => {
  assert.equal(ASTRONOMY_POSITIONS_PRICE, "$0.04");
  assert.equal(ASTRONOMY_POSITIONS_ROUTE, "/v1/astronomy/positions/{date}");
});
