import test from "node:test";
import assert from "node:assert/strict";

import { designFromActs, stage } from "../../playing/dist/index.mjs";
import {
  ACTIVITYSTREAMS_CONTEXT,
  cast,
  claimWorkLocus,
  governWorkLocusClaims,
  oneValuePerIndex,
  situation,
  stageTroupeMember,
} from "../dist/index.mjs";

const actor = (id) => ({
  "@context": ACTIVITYSTREAMS_CONTEXT,
  id,
  type: "Service",
  preferredUsername: id,
  inbox: `${id}/inbox`,
  outbox: `${id}/outbox`,
  followers: `${id}/followers`,
  following: `${id}/following`,
  summary: `${id} fixture actor`,
});

const D = (entries) => designFromActs(new Map(entries));

const camp = {
  id: "camp:standing",
  members: [actor("mara"), actor("sol"), actor("tavi")],
};

test("cast(camp, situation) yields a troupe that is sub-membership of the camp", () => {
  const scene = situation({
    id: "frontier:quasicrystal-coloring",
    scene: "frontier-node",
    substrate: ["dev/docs/notes/2026-06-26-memo-on-coloring-aperiodic-tiles.md"],
    matchSize: 2,
  });
  const troupe = cast(camp, scene);
  const campIds = new Set(camp.members.map((member) => member.id));

  assert.equal(troupe.kind, "organizing.casting.troupe");
  assert.equal(troupe.camp, camp.id);
  assert.equal(troupe.situation, scene.id);
  assert.equal(troupe.memberIds.length, 2);
  assert.ok(troupe.memberIds.every((memberId) => campIds.has(memberId)));
  assert.deepEqual(troupe.members.map((member) => member.id).sort(), troupe.memberIds);
  assert.equal(troupe.matchmakingAction.kind, "gaming.lobby.matchmaking");
});

test("staging a troupe member is relative to the situation-cast troupe", () => {
  const actorDesign = D([["", "proponent"]]);
  const allyAudience = D([["", "proponent"]]);
  const opposedAudience = D([["", "opponent"]]);
  const designs = { mara: actorDesign, sol: allyAudience, tavi: opposedAudience };
  const partial = cast(camp, situation({
    id: "situation:partial-audience",
    scene: "task-to-be-done",
    substrate: ["locus:partial"],
    matchSize: 2,
  }));
  const full = cast(camp, situation({
    id: "situation:fuller-audience",
    scene: "task-to-be-done",
    substrate: ["locus:full"],
    matchSize: 3,
  }));
  const universe = [actorDesign, allyAudience, opposedAudience];

  const partialStage = stageTroupeMember({ troupe: partial, memberId: "mara", designs, universe, stage });
  const fullStage = stageTroupeMember({ troupe: full, memberId: "mara", designs, universe, stage });

  assert.equal(partialStage.kind, "playing.stage");
  assert.equal(fullStage.kind, "playing.stage");
  assert.equal(partialStage.material, true);
  assert.equal(fullStage.material, false);
  assert.notEqual(partialStage.frontLoci, fullStage.frontLoci);
});

test("work-locus claims stay CALM when monotone and use raft order when contended", () => {
  const scene = situation({
    id: "situation:govern-work-loci",
    scene: "contested-locus",
    substrate: ["substrate:index:a"],
    requiresCapabilities: ["write"],
    requiresAuthorities: ["govern"],
  });
  const claimA = claimWorkLocus({
    situation: scene,
    region: ["substrate:index:a"],
    office: "dispatch",
    assignee: "mara",
    capabilities: ["write"],
    officeAuthorities: ["govern"],
  });
  const claimB = claimWorkLocus({
    situation: scene,
    region: ["substrate:index:b"],
    office: "dispatch",
    assignee: "sol",
    capabilities: ["write"],
    officeAuthorities: ["govern"],
  });
  const monotone = governWorkLocusClaims([claimA, claimB]);

  assert.equal(monotone.monotone, true);
  assert.equal(monotone.frontier.raftRound, "not-required");
  assert.equal(monotone.log.entries.length, 0);
  assert.equal(monotone.assignmentsByIndex.length, 2);

  const claimC = claimWorkLocus({
    situation: scene,
    region: ["substrate:index:a"],
    office: "dispatch",
    assignee: "tavi",
    capabilities: ["write"],
    officeAuthorities: ["govern"],
  });
  const contended = governWorkLocusClaims([claimA, claimC], {
    leadership: {
      kind: "organizing.writing.raft.leadership",
      cluster: "work-locus",
      term: 1,
      leader: "dispatch",
    },
  });

  assert.equal(contended.monotone, false);
  assert.equal(contended.frontier.raftRound, "required");
  assert.equal(contended.append.accepted.length, 1);
  assert.equal(contended.log.entries.length, 1);
  assert.equal(contended.assignmentsByIndex.length, 1);
  assert.equal(contended.assignmentsByIndex[0].substrateIndex, "substrate:index:a");
  assert.equal(oneValuePerIndex(contended.log), true);
});
