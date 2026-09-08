import assert from "node:assert/strict";
import test from "node:test";

import {
  ASTRONOMY_PRECISION_POSITIONS_PRICE,
  ASTRONOMY_PRECISION_POSITIONS_ROUTE,
  projectAstronomyPrecisionPositions,
} from "../src/astronomy-precision-positions-route.mjs";

const FIXTURE_PRECISION_MOMENT = {
  tier: "precision-moment",
  time: "2026-07-21T00:00:00.000Z",
  location: { latitudeDegreesNorth: 41.8781, longitudeDegreesEast: -87.6298 },
  metrology: { ephemeris: "JPL DE440", supplier: "OxiEphemeris 0.1.1" },
  chart: {
    bodies: [
      { body: "Sun", lon_deg: 118.28, lat_deg: -0.0001, sign: "Cancer", house: 7, retrograde: false },
      { body: "Moon", lon_deg: 202.98, lat_deg: -4.15, sign: "Libra", house: 9, retrograde: false },
    ],
    houses: { system: "placidus", cusps_deg: [1, 2, 3] },
    angles: { ascendant_deg: 277.8, mc_deg: 213.4 },
    nodes: { mean_node_deg: 331.5, true_node_deg: 330.3 },
    lots: { fortune_deg: 12.3 },
    dignities: { sun: "domicile" },
  },
  essentialsCrossCheck: { sun: { absoluteDifferenceArcminutes: 0.03, withinEssentialsAuditedBound: true } },
};

test("projectAstronomyPrecisionPositions(): astronomy only, no sign/house/angle/lot/dignity", () => {
  const result = projectAstronomyPrecisionPositions(FIXTURE_PRECISION_MOMENT);
  assert.equal(result.tier, "astronomy-precision-positions");
  assert.equal(result.time, FIXTURE_PRECISION_MOMENT.time);
  assert.deepEqual(result.location, FIXTURE_PRECISION_MOMENT.location);
  assert.deepEqual(result.metrology, FIXTURE_PRECISION_MOMENT.metrology);
  assert.deepEqual(result.nodes, FIXTURE_PRECISION_MOMENT.chart.nodes);
  assert.equal(result.bodies.length, 2);
  for (const body of result.bodies) {
    assert.ok(!("sign" in body) && !("house" in body));
  }
  assert.ok(!("houses" in result) && !("angles" in result) && !("lots" in result) && !("dignities" in result));
  assert.deepEqual(result.essentialsCrossCheck, FIXTURE_PRECISION_MOMENT.essentialsCrossCheck);
});

test("prices Astronomy Precision Positions at $0.32 on its own templated route", () => {
  assert.equal(ASTRONOMY_PRECISION_POSITIONS_PRICE, "$0.32");
  assert.equal(ASTRONOMY_PRECISION_POSITIONS_ROUTE, "/v1/astronomy/precision-positions/:date");
});
