import assert from "node:assert/strict";
import test from "node:test";

import {
  createDCropsClient,
  dcropsHarvestIntent,
  dcropsPlantIntent,
  dcropsRemoveIntent,
  parseDCropsLand,
  parseDCropsSeason,
  parseDCropsSeed,
  planDCropsPlot,
  validateDCropsActionJson,
} from "../src/dcrops.mjs";

const SEASON = {
  _id: 1,
  account: "dcrops",
  ownedBy: "u",
  lockedTokens: {},
  properties: { name: "Seasons", nft: "128", primary: "3", secondary: "Winter", tertiary: "1784398266" },
};

const LAND = {
  _id: 472218,
  account: "michael561",
  soulBound: true,
  properties: {
    name: "Starter Land",
    primary: '{"type":"LAND","mult":1,"chance":0.02}',
    secondary: '{"p":["Artichoke"]}',
    tertiary: '{"t":["1737924109.44"]}',
  },
};

const SEED = {
  _id: 472217,
  account: "michael561",
  soulBound: true,
  properties: {
    name: "Artichoke",
    primary: '{"type":"SEED","sp":5,"s":[3],"qty":1,"gt":3,"ability":["none"]}',
    secondary: '{"cd":0}',
  },
};

test("dCrops parser maps the live Winter starter position without floating timestamp ambiguity", () => {
  const season = parseDCropsSeason(SEASON);
  const land = parseDCropsLand(LAND, "michael561");
  const seed = parseDCropsSeed(SEED, "michael561");
  assert.deepEqual(season, { index: 3, name: "Winter", startedAtUnix: 1784398266, endsAtUnix: 1785694266 });
  assert.equal(land.plantedAtUnix[0], 1737924109);
  assert.equal(seed.growthDays, 3);
  assert.deepEqual(seed.seasons, [3]);
});

test("dCrops planner clears the expired crop, then plants, waits, and harvests", () => {
  const season = parseDCropsSeason(SEASON);
  const seed = parseDCropsSeed(SEED, "michael561");
  const expired = parseDCropsLand(LAND, "michael561");
  const removal = planDCropsPlot("michael561", season, expired, seed, 0, 1784680000);
  assert.equal(removal.kind, "remove-expired");
  assert.deepEqual(removal.intent, dcropsRemoveIntent("michael561", 472218, 0));

  const empty = parseDCropsLand({ ...LAND, properties: { ...LAND.properties, secondary: '{"p":[""]}', tertiary: '{"t":[""]}' } }, "michael561");
  const planting = planDCropsPlot("michael561", season, empty, seed, 0, 1784680000);
  assert.equal(planting.kind, "plant");
  assert.deepEqual(planting.intent, dcropsPlantIntent("michael561", 472218, 472217, 0));

  const growing = parseDCropsLand({ ...LAND, properties: { ...LAND.properties, tertiary: '{"t":["1784680000"]}' } }, "michael561");
  assert.equal(planDCropsPlot("michael561", season, growing, seed, 0, 1784680100).kind, "wait");
  const harvest = planDCropsPlot("michael561", season, growing, seed, 0, 1784940000);
  assert.equal(harvest.kind, "harvest");
  assert.deepEqual(harvest.intent, dcropsHarvestIntent("michael561", 472218, 0));
});

test("dCrops planner refuses foreign assets, stale seasons, and crops that cannot mature in season", () => {
  const season = parseDCropsSeason(SEASON);
  const land = parseDCropsLand({ ...LAND, properties: { ...LAND.properties, secondary: '{"p":[""]}', tertiary: '{"t":[""]}' } });
  const seed = parseDCropsSeed(SEED);
  assert.equal(planDCropsPlot("other-user", season, land, seed, 0, 1784680000).kind, "refuse");
  assert.equal(planDCropsPlot("michael561", season, land, seed, 0, season.endsAtUnix).kind, "refuse");
  assert.equal(planDCropsPlot("michael561", season, land, seed, 0, season.endsAtUnix - 2 * 86400).kind, "refuse");
});

test("dCrops action validator admits only a single exact plot action", () => {
  validateDCropsActionJson(JSON.parse(dcropsPlantIntent("michael561", 472218, 472217, 0).operation[1].json));
  validateDCropsActionJson(JSON.parse(dcropsRemoveIntent("michael561", 472218, 0).operation[1].json));
  assert.throws(() => validateDCropsActionJson({ operation: "openPack", payload: [{ amount: 1 }] }), /not an admitted/);
  assert.throws(() => validateDCropsActionJson({ operation: "removeMultiple", payload: [{ landID: 472218, plots: [0, 1] }] }), /exactly one plot/);
  assert.throws(() => validateDCropsActionJson({ operation: "plantMultiple", payload: [{ landID: 472218, plant: [{ seedID: 472217, plotNo: 0, v: 1 }] }] }), /exactly/);
});

test("dCrops client fails over and binds the requested NFT id", async () => {
  const calls = [];
  const client = createDCropsClient({
    nodes: ["https://one.invalid", "https://two.invalid"],
    fetchImpl: async (input, init) => {
      calls.push(String(input));
      if (String(input).includes("one.invalid")) throw new Error("offline");
      const request = JSON.parse(String(init?.body));
      assert.equal(request.params.query._id, 1);
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: SEASON }), { status: 200 });
    },
  });
  assert.equal((await client.readSeason()).name, "Winter");
  assert.deepEqual(calls, ["https://one.invalid", "https://two.invalid"]);
});

test("intents are exact custom_json shapes marked unapproved for broadcast", () => {
  const plant = dcropsPlantIntent("michael561", 472218, 472217, 0);
  assert.equal(plant.approvedForBroadcast, false);
  assert.equal(plant.role, "active");
  assert.deepEqual(JSON.parse(plant.operation[1].json), { operation: "plantMultiple", payload: [{ landID: 472218, plant: [{ seedID: 472217, plotNo: 0 }] }] });
  assert.deepEqual(plant.operation[1].required_auths, ["michael561"]);
  assert.deepEqual(plant.operation[1].required_posting_auths, []);
});
