// Tests for anomie, boundary-work, and legitimate coordination-currency bridges.
import { test } from "node:test";
import assert from "node:assert/strict";

import { charge, chargeValue } from "@emsenn/relating";
import {
  anomie,
  boundaryWork,
  completeTranslations,
  legitimate,
  ungroundedSection,
} from "../dist/index.mjs";

const relation = (kind, active, passive, scope, standing = "potential") =>
  Object.freeze({ kind, active, passive, scope, standing });

const meme = (issue, standing) => Object.freeze({
  kind: "predication.fiber.meme",
  subject: Object.freeze({ kind: "public.issue", id: issue }),
  predicate: Object.freeze({ kind: "public.stance" }),
  charge: charge(chargeValue(standing)),
});

const member = (identity, issue = "boundary", standing = "potential") => Object.freeze({
  kind: "socializing.member",
  agent: Object.freeze({ kind: "animating.agent", identity }),
  memes: Object.freeze([meme(issue, standing)]),
});

function field(members, translations) {
  return Object.freeze({
    kind: "socializing.social-field",
    members: Object.freeze(members),
    base: Object.freeze({
      kind: "socializing.social-base",
      translations: Object.freeze(translations),
    }),
    section: ungroundedSection(),
  });
}

test("anomie clears when norms, means, accountability, and common knowledge hold", () => {
  const relations = [
    relation("power", "assembly", "members", "schedule"),
    relation("duty", "assembly", "members", "schedule"),
  ];
  const r = anomie({
    name: "schedule-order",
    relations,
    goals: ["coordinate-work"],
    means: ["meeting"],
    commonKnowledgeValues: ["potential", "potential"],
    exitOpen: true,
  });

  assert.equal(r.kind, "socializing.anomie");
  assert.equal(r.verdict, "integrated");
  assert.equal(r.normlessness, false);
  assert.equal(r.currency.issued, 0);
});

test("anomie prices normlessness, strain, closed exit, and recuperated contradiction", () => {
  const r = anomie({
    name: "gig-platform",
    relations: [relation("claim", "worker", "platform", "pay", "active")],
    goals: ["live", "care", "organize"],
    means: ["gig"],
    commonKnowledgeValues: ["potential", "active"],
    exitOpen: false,
    recuperated: true,
  });

  assert.equal(r.verdict, "anomic");
  assert.equal(r.normlessness, true);
  assert.equal(r.goalMeansGap, 2);
  assert.equal(r.currency.issued, 6);
  assert.equal(r.currency.cells.some((cell) => cell.id.endsWith(":recuperation") && cell.issued === 1), true);
});

test("boundary-work clears for a legible porous boundary", () => {
  const f = field([
    member("inside"),
    member("outside"),
  ], completeTranslations(2));

  const r = boundaryWork({
    name: "assembly-door",
    field: f,
    insiders: ["inside"],
    outsiders: ["outside"],
    criterion: "participates-in-assembly",
  });

  assert.equal(r.legible, true);
  assert.equal(r.porous, true);
  assert.equal(r.exclusionary, false);
  assert.equal(r.currency.issued, 0);
});

test("boundary-work prices ambiguous classification, policing, and subaltern exclusion", () => {
  const f = field([
    member("tenant"),
    member("landlord"),
    member("guest"),
  ], []);
  const r = boundaryWork({
    name: "rent-border",
    field: f,
    relations: [
      relation("no-right", "landlord", "tenant", "assembly"),
      relation("power", "landlord", "tenant", "assembly", "stable"),
    ],
    insiders: ["landlord"],
    outsiders: ["tenant"],
    criterion: "property-title",
    subalternAgents: ["tenant"],
  });

  assert.equal(r.legible, false);
  assert.equal(r.exclusionary, true);
  assert.deepEqual(r.ambiguousAgents, ["guest"]);
  assert.equal(r.policingRelations, 2);
  assert.equal(r.contestedBoundaryRelations, 1);
  assert.equal(r.currency.issued, 7);
});

test("legitimate clears for accountable rational-legal authority without symbolic violence", () => {
  const relations = [
    relation("power", "assembly", "members", "schedule"),
    relation("duty", "assembly", "members", "schedule"),
    relation("claim", "member", "assembly", "schedule", "active"),
  ];
  const r = legitimate({
    name: "assembly-schedule",
    relations,
    claimant: "assembly",
    scope: "schedule",
    basis: "rational-legal",
    holders: [
      { agent: "assembly", capital: { economic: 1, cultural: 1, social: 1, symbolic: 2 } },
      { agent: "members", capital: { economic: 1, cultural: 1, social: 1, symbolic: 2 } },
    ],
    commonKnowledgeValues: ["potential", "potential"],
  });

  assert.equal(r.legitimate, true);
  assert.equal(r.legitimacyCrisis, false);
  assert.equal(r.currency.issued, 0);
});

test("legitimate prices charisma, symbolic violence, unaccountable power, and symbolic monopoly", () => {
  const relations = [
    relation("power", "boss", "worker", "schedule"),
    relation("duty", "worker", "boss", "schedule"),
  ];
  const r = legitimate({
    name: "boss-schedule",
    relations,
    claimant: "boss",
    scope: "schedule",
    basis: "charismatic",
    holders: [
      { agent: "boss", capital: { economic: 3, cultural: 4, social: 4, symbolic: 10 } },
      { agent: "worker", capital: { economic: 1, cultural: 1, social: 1, symbolic: 1 } },
    ],
    commonKnowledgeValues: ["potential", "potential"],
  });

  assert.equal(r.legitimate, false);
  assert.equal(r.legitimacyCrisis, true);
  assert.equal(r.symbolicViolence.symbolicViolence, true);
  assert.equal(r.accountabilityGap, 1);
  assert.equal(r.charismaticInstability, true);
  assert.equal(r.symbolicMonopoly, true);
  assert.equal(r.currency.issued, 4);
});
